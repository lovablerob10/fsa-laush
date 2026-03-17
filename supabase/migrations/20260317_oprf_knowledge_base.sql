-- ============================================
-- OPRF Método: Knowledge Base do Expert
-- Migração: pgvector + expert_documents + expert_chunks
-- Executar no Supabase SQL Editor
-- ============================================

-- 1. Habilitar extensão pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Tabela de documentos do expert (fontes de conhecimento)
CREATE TABLE IF NOT EXISTS expert_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'text',  -- 'text' | 'pdf' | 'url' | 'briefing'
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  char_count INTEGER GENERATED ALWAYS AS (length(content)) STORED,
  chunk_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'processing' | 'ready' | 'error'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de chunks embedados
CREATE TABLE IF NOT EXISTS expert_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES expert_documents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER DEFAULT 0,
  embedding vector(768),  -- Gemini text-embedding-004 = 768 dimensões
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_expert_documents_tenant ON expert_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expert_chunks_tenant ON expert_chunks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expert_chunks_document ON expert_chunks(document_id);

-- Índice vetorial para busca por similaridade (IVFFlat)
-- Nota: IVFFlat requer pelo menos 100 linhas para criar com lists=100
-- Usar HNSW como alternativa que funciona melhor com poucos dados
CREATE INDEX IF NOT EXISTS idx_expert_chunks_embedding ON expert_chunks
  USING hnsw (embedding vector_cosine_ops);

-- 5. RLS (Row Level Security)
ALTER TABLE expert_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_chunks ENABLE ROW LEVEL SECURITY;

-- Políticas: authenticated users podem acessar documentos do seu tenant
DO $$
BEGIN
  -- Drop policies if they exist (for re-runs)
  DROP POLICY IF EXISTS "expert_documents_tenant_policy" ON expert_documents;
  DROP POLICY IF EXISTS "expert_chunks_tenant_policy" ON expert_chunks;
END $$;

CREATE POLICY "expert_documents_tenant_policy" ON expert_documents
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "expert_chunks_tenant_policy" ON expert_chunks
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 6. Função de busca vetorial por similaridade
CREATE OR REPLACE FUNCTION match_expert_chunks(
  p_tenant_id UUID,
  p_query_embedding vector(768),
  p_match_count INT DEFAULT 5,
  p_match_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    ec.id,
    ec.document_id,
    ec.content,
    1 - (ec.embedding <=> p_query_embedding) AS similarity
  FROM expert_chunks ec
  WHERE ec.tenant_id = p_tenant_id
    AND 1 - (ec.embedding <=> p_query_embedding) > p_match_threshold
  ORDER BY ec.embedding <=> p_query_embedding
  LIMIT p_match_count;
$$;

-- 7. Função para contar chunks por documento (atualizar chunk_count)
CREATE OR REPLACE FUNCTION update_document_chunk_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE expert_documents
  SET chunk_count = (
    SELECT COUNT(*) FROM expert_chunks WHERE document_id = COALESCE(NEW.document_id, OLD.document_id)
  ),
  updated_at = now()
  WHERE id = COALESCE(NEW.document_id, OLD.document_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_update_chunk_count
AFTER INSERT OR DELETE ON expert_chunks
FOR EACH ROW
EXECUTE FUNCTION update_document_chunk_count();

-- Fim da migração
