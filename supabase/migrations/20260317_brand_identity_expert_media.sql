-- =============================================
-- FSA Launch Lab — Identidade Visual + Galeria Expert
-- Fase 2 do Dossiê IA
-- =============================================

-- Campos de identidade visual no briefing
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS brand_primary_color text;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS brand_secondary_color text;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS brand_accent_color text;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS brand_logo_url text;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS brand_font text DEFAULT 'Inter';

-- =============================================
-- Galeria de Imagens do Expert
-- Múltiplas fotos com metadados de formato e uso
-- =============================================
CREATE TABLE IF NOT EXISTS expert_media (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  briefing_id   uuid REFERENCES briefings(id) ON DELETE CASCADE,
  url           text NOT NULL,
  filename      text,
  aspect_ratio  text NOT NULL DEFAULT '1:1' CHECK (aspect_ratio IN ('16:9', '9:16', '1:1', '4:5', '3:4')),
  usage_type    text NOT NULL DEFAULT 'geral' CHECK (usage_type IN ('perfil', 'hero', 'stories', 'thumbnail', 'geral')),
  is_primary    boolean NOT NULL DEFAULT false,
  metadata      jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE expert_media IS 'Galeria de imagens do expert com metadados de aspect ratio e uso ideal para criativos.';
COMMENT ON COLUMN expert_media.aspect_ratio IS 'Formato: 16:9 (landscape/YouTube), 9:16 (stories/reels), 1:1 (feed), 4:5 (Facebook feed), 3:4 (Pinterest)';
COMMENT ON COLUMN expert_media.usage_type IS 'Uso ideal: perfil (avatar), hero (banner/capa), stories (vertical), thumbnail (miniatura), geral (qualquer)';
COMMENT ON COLUMN expert_media.is_primary IS 'Imagem principal do expert (apenas uma por briefing)';

-- Índices
CREATE INDEX IF NOT EXISTS idx_expert_media_tenant ON expert_media(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expert_media_briefing ON expert_media(briefing_id);

-- RLS
ALTER TABLE expert_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expert_media_tenant_isolation" ON expert_media
  USING (tenant_id = get_user_tenant_id());
