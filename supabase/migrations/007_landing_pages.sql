-- =============================================
-- 007: Landing Pages
-- Rodar no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mltqpangbglmzbgmmxgu/sql
-- =============================================

CREATE TABLE IF NOT EXISTS landing_pages (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  launch_id         uuid REFERENCES launches(id) ON DELETE SET NULL,
  name              text NOT NULL DEFAULT 'Página de Captura',
  html_content      text NOT NULL DEFAULT '',
  status            text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  subdomain         text,
  custom_domain     text,
  version           int NOT NULL DEFAULT 1,
  leads_count       int NOT NULL DEFAULT 0,
  views_count       int NOT NULL DEFAULT 0,
  generation_params jsonb NOT NULL DEFAULT '{}',
  published_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_landing_pages_tenant ON landing_pages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_landing_pages_launch ON landing_pages(tenant_id, launch_id);

ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "landing_pages_tenant_isolation"
  ON landing_pages
  USING (tenant_id = get_user_tenant_id());

-- Allow public read for published pages (needed by the serve-landing-page edge function via service role)
-- Service role bypasses RLS, so no extra policy needed for the edge function.

-- Function to increment leads_count atomically
CREATE OR REPLACE FUNCTION increment_landing_page_leads(page_id uuid)
RETURNS void AS $$
  UPDATE landing_pages SET leads_count = leads_count + 1 WHERE id = page_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to increment views_count atomically
CREATE OR REPLACE FUNCTION increment_landing_page_views(page_id uuid)
RETURNS void AS $$
  UPDATE landing_pages SET views_count = views_count + 1 WHERE id = page_id;
$$ LANGUAGE sql SECURITY DEFINER;
