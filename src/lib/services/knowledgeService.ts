/**
 * OPRF Knowledge Service — Método OPRF Fase 1
 * RAG (Retrieval-Augmented Generation) para Knowledge Base do Expert
 * 
 * Usa Gemini text-embedding-004 para embeddings + Supabase pgvector para busca vetorial
 */

import { supabase } from '@/lib/supabase/client';

// =============================================
// Config
// =============================================
const EMBEDDING_MODEL = 'text-embedding-004';
const EMBEDDING_DIMENSIONS = 768;
const CHUNK_SIZE = 500;       // ~500 tokens por chunk
const CHUNK_OVERLAP = 50;     // overlap entre chunks para manter contexto
const MAX_CHUNKS_PER_QUERY = 5;

function getApiKey(): string {
  const key = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (!key) throw new Error('VITE_GEMINI_API_KEY não configurada');
  return key;
}

// =============================================
// Embedding — Gemini text-embedding-004
// =============================================

/**
 * Gera embedding vetorial de um texto usando Gemini text-embedding-004.
 * Retorna array de 768 números (float).
 */
export async function embedText(text: string): Promise<number[]> {
  const apiKey = getApiKey();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text }] },
        taskType: 'RETRIEVAL_DOCUMENT',
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Embedding error: ${err.error?.message || response.status}`);
  }

  const data = await response.json();
  const values = data.embedding?.values;
  if (!values || values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Embedding inválido: esperado ${EMBEDDING_DIMENSIONS} dimensões, recebido ${values?.length}`);
  }
  return values;
}

/**
 * Gera embedding otimizado para queries (busca).
 */
export async function embedQuery(text: string): Promise<number[]> {
  const apiKey = getApiKey();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text }] },
        taskType: 'RETRIEVAL_QUERY',
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Embedding query error: ${err.error?.message || response.status}`);
  }

  const data = await response.json();
  return data.embedding?.values || [];
}

// =============================================
// Chunking — dividir texto em blocos
// =============================================

/**
 * Divide um texto em chunks de ~CHUNK_SIZE caracteres com overlap.
 * Tenta cortar em limites de parágrafo/frase para manter coerência.
 */
export function chunkDocument(content: string, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  if (!content || content.length === 0) return [];
  
  // Se conteúdo é menor que um chunk, retorna inteiro
  if (content.length <= chunkSize) return [content.trim()];

  const chunks: string[] = [];
  let start = 0;

  while (start < content.length) {
    let end = Math.min(start + chunkSize, content.length);

    // Tenta cortar no final de um parágrafo
    if (end < content.length) {
      const paragraphBreak = content.lastIndexOf('\n\n', end);
      if (paragraphBreak > start + chunkSize * 0.3) {
        end = paragraphBreak + 2;
      } else {
        // Tenta cortar no final de uma frase
        const sentenceBreak = content.lastIndexOf('. ', end);
        if (sentenceBreak > start + chunkSize * 0.3) {
          end = sentenceBreak + 2;
        }
      }
    }

    const chunk = content.slice(start, end).trim();
    if (chunk.length > 0) chunks.push(chunk);

    start = end - overlap;
    if (start >= content.length) break;
  }

  return chunks;
}

// =============================================
// Ingestão — processar e armazenar documentos
// =============================================

/**
 * Ingere um documento: cria registro, divide em chunks, gera embeddings e salva.
 * Retorna o ID do documento criado.
 */
export async function ingestDocument(
  tenantId: string,
  title: string,
  content: string,
  sourceType: 'text' | 'pdf' | 'url' | 'briefing' = 'text',
  metadata: Record<string, any> = {}
): Promise<string> {
  if (!content || content.trim().length < 10) {
    throw new Error('Conteúdo muito curto para ingestão (mínimo 10 caracteres)');
  }

  // 1. Verificar se já existe docs tipo "briefing" para este tenant (evitar duplicatas)
  if (sourceType === 'briefing') {
    const { data: existing } = await (supabase.from('expert_documents') as any)
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('source_type', 'briefing')
      .limit(1);

    if (existing && existing.length > 0) {
      // Atualizar documento existente em vez de criar novo
      const docId = existing[0].id;

      // Deletar chunks antigos (cascade não afeta, fazemos manual)
      await (supabase.from('expert_chunks') as any)
        .delete()
        .eq('document_id', docId);

      // Atualizar conteúdo
      await (supabase.from('expert_documents') as any)
        .update({
          title,
          content,
          metadata,
          status: 'processing',
          updated_at: new Date().toISOString(),
        })
        .eq('id', docId);

      // Re-processar chunks
      await processChunks(docId, tenantId, content);
      return docId;
    }
  }

  // 2. Criar registro do documento
  const { data: doc, error: docError } = await (supabase.from('expert_documents') as any)
    .insert({
      tenant_id: tenantId,
      title,
      content,
      source_type: sourceType,
      metadata,
      status: 'processing',
    })
    .select('id')
    .single();

  if (docError) throw new Error(`Erro ao salvar documento: ${docError.message}`);
  const docId = doc.id;

  // 3. Processar chunks e embeddings
  await processChunks(docId, tenantId, content);

  return docId;
}

/**
 * Processa chunks de um documento: divide, gera embeddings e salva.
 */
async function processChunks(docId: string, tenantId: string, content: string): Promise<void> {
  const chunks = chunkDocument(content);

  // Processar cada chunk com embedding
  const chunkRecords: any[] = [];
  for (let i = 0; i < chunks.length; i++) {
    try {
      const embedding = await embedText(chunks[i]);
      chunkRecords.push({
        document_id: docId,
        tenant_id: tenantId,
        chunk_index: i,
        content: chunks[i],
        token_count: Math.ceil(chunks[i].length / 4), // estimativa
        embedding: JSON.stringify(embedding), // pgvector aceita JSON array
      });

      // Small delay to avoid rate limiting
      if (i < chunks.length - 1) {
        await new Promise(r => setTimeout(r, 200));
      }
    } catch (err: any) {
      console.error(`Erro ao gerar embedding para chunk ${i}:`, err.message);
    }
  }

  // Inserir chunks em batch
  if (chunkRecords.length > 0) {
    const { error: chunkError } = await (supabase.from('expert_chunks') as any)
      .insert(chunkRecords);

    if (chunkError) {
      console.error('Erro ao inserir chunks:', chunkError);
      await (supabase.from('expert_documents') as any)
        .update({ status: 'error' })
        .eq('id', docId);
      throw new Error(`Erro ao salvar chunks: ${chunkError.message}`);
    }
  }

  // Marcar documento como pronto
  await (supabase.from('expert_documents') as any)
    .update({ status: 'ready', chunk_count: chunkRecords.length })
    .eq('id', docId);
}

// =============================================
// Query — buscar conhecimento por similaridade
// =============================================

export interface KnowledgeResult {
  id: string;
  document_id: string;
  content: string;
  similarity: number;
}

/**
 * Busca chunks relevantes usando similaridade vetorial.
 * Retorna os top-K chunks mais similares à pergunta.
 */
export async function queryKnowledge(
  tenantId: string,
  question: string,
  topK = MAX_CHUNKS_PER_QUERY,
  threshold = 0.5
): Promise<KnowledgeResult[]> {
  if (!question || question.trim().length < 3) return [];

  // 1. Gerar embedding da pergunta
  const queryEmbedding = await embedQuery(question);

  // 2. Busca vetorial via RPC
  const { data, error } = await (supabase.rpc as any)('match_expert_chunks', {
    p_tenant_id: tenantId,
    p_query_embedding: JSON.stringify(queryEmbedding),
    p_match_count: topK,
    p_match_threshold: threshold,
  });

  if (error) {
    console.error('Erro na busca vetorial:', error);
    return [];
  }

  return (data || []) as KnowledgeResult[];
}

/**
 * Busca chunks relevantes e monta um contexto formatado para usar em prompts.
 * Retorna string com os chunks separados por --- dividers.
 */
export async function getKnowledgeContext(
  tenantId: string,
  question: string,
  topK = MAX_CHUNKS_PER_QUERY
): Promise<string> {
  const results = await queryKnowledge(tenantId, question, topK);
  if (results.length === 0) return '';

  return results
    .map((r, i) => `[Fonte ${i + 1} | Relevância: ${(r.similarity * 100).toFixed(0)}%]\n${r.content}`)
    .join('\n\n---\n\n');
}

/**
 * Busca conhecimento e gera resposta usando Gemini.
 * Combina RAG (busca vetorial) com geração de texto.
 */
export async function queryAndAnswer(
  tenantId: string,
  question: string
): Promise<{ answer: string; sources: KnowledgeResult[] }> {
  const sources = await queryKnowledge(tenantId, question);
  
  if (sources.length === 0) {
    return {
      answer: 'Não encontrei informações relevantes na base de conhecimento. Adicione mais documentos sobre o expert.',
      sources: [],
    };
  }

  const context = sources.map(s => s.content).join('\n\n---\n\n');

  // Import callGeminiWithFallback
  const { callGeminiWithFallback } = await import('@/lib/services/briefingService');

  const prompt = `Você é um assistente especializado que responde usando EXCLUSIVAMENTE o contexto fornecido.

CONTEXTO DO EXPERT (base de conhecimento):
${context}

PERGUNTA: ${question}

REGRAS:
1. Responda APENAS com base no contexto acima. Não invente informações.
2. Se o contexto não contém a resposta, diga claramente que não há essa informação na base.
3. Responda em português do Brasil.
4. Seja direto e conciso.`;

  const answer = await callGeminiWithFallback(prompt, { temperature: 0.3, maxOutputTokens: 2048 });

  return { answer: answer.trim(), sources };
}

// =============================================
// Briefing → Knowledge Base (auto-ingestão)
// =============================================

/**
 * Converte os dados do briefing em um documento estruturado e ingere na knowledge base.
 * Chamado automaticamente ao salvar o briefing.
 */
export async function ingestBriefing(tenantId: string, briefing: any): Promise<string | null> {
  const sections: string[] = [];

  if (briefing.expert_name) {
    sections.push(`EXPERT: ${briefing.expert_name}`);
  }
  if (briefing.expert_bio) {
    sections.push(`BIOGRAFIA E HISTÓRIA DO EXPERT:\n${briefing.expert_bio}`);
  }
  if (briefing.expert_credentials?.length) {
    sections.push(`CREDENCIAIS E FORMAÇÃO:\n${briefing.expert_credentials.join('\n')}`);
  }
  if (briefing.product_name) {
    sections.push(`PRODUTO: ${briefing.product_name}`);
  }
  if (briefing.product_description) {
    sections.push(`DESCRIÇÃO DO PRODUTO:\n${briefing.product_description}`);
  }
  if (briefing.product_price) {
    sections.push(`PREÇO: R$ ${briefing.product_price}${briefing.product_installments ? ` (até ${briefing.product_installments}x)` : ''}`);
  }
  if (briefing.product_bonuses?.length) {
    sections.push(`BÔNUS INCLUSOS:\n${briefing.product_bonuses.join('\n')}`);
  }
  if (briefing.product_guarantee) {
    sections.push(`GARANTIA: ${briefing.product_guarantee}`);
  }
  if (briefing.target_audience) {
    sections.push(`PÚBLICO-ALVO:\n${briefing.target_audience}`);
  }
  if (briefing.audience_pain_points?.length) {
    sections.push(`DORES DO PÚBLICO:\n${briefing.audience_pain_points.join('\n')}`);
  }
  if (briefing.audience_desires?.length) {
    sections.push(`DESEJOS DO PÚBLICO:\n${briefing.audience_desires.join('\n')}`);
  }
  if (briefing.audience_objections?.length) {
    sections.push(`OBJEÇÕES COMUNS:\n${briefing.audience_objections.join('\n')}`);
  }
  if (briefing.main_promise) {
    sections.push(`PROMESSA PRINCIPAL:\n${briefing.main_promise}`);
  }
  if (briefing.main_benefit) {
    sections.push(`BENEFÍCIO / TRANSFORMAÇÃO:\n${briefing.main_benefit}`);
  }
  if (briefing.differentiation) {
    sections.push(`DIFERENCIAL COMPETITIVO:\n${briefing.differentiation}`);
  }
  if (briefing.voice_tones?.length) {
    sections.push(`TOM DE VOZ: ${briefing.voice_tones.join(', ')}`);
  }
  if (briefing.words_to_use?.length) {
    sections.push(`PALAVRAS A USAR: ${briefing.words_to_use.join(', ')}`);
  }
  if (briefing.words_to_avoid?.length) {
    sections.push(`PALAVRAS A EVITAR: ${briefing.words_to_avoid.join(', ')}`);
  }

  const fullContent = sections.join('\n\n');

  if (fullContent.length < 20) return null; // Briefing muito vazio

  try {
    const docId = await ingestDocument(
      tenantId,
      `Briefing — ${briefing.expert_name || briefing.product_name || 'Expert'}`,
      fullContent,
      'briefing',
      { source: 'auto-briefing', expert: briefing.expert_name }
    );
    return docId;
  } catch (err: any) {
    console.error('Erro ao ingerir briefing:', err.message);
    return null;
  }
}

// =============================================
// Gerenciamento de Documentos
// =============================================

/**
 * Lista documentos da knowledge base de um tenant.
 */
export async function listDocuments(tenantId: string) {
  const { data, error } = await (supabase.from('expert_documents') as any)
    .select('id, title, source_type, char_count, chunk_count, status, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Erro ao listar documentos: ${error.message}`);
  return data || [];
}

/**
 * Deleta um documento e todos os seus chunks (cascade).
 */
export async function deleteDocument(docId: string) {
  const { error } = await (supabase.from('expert_documents') as any)
    .delete()
    .eq('id', docId);

  if (error) throw new Error(`Erro ao deletar documento: ${error.message}`);
}
