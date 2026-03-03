-- =============================================
-- FSA Launch Lab Pro — Multi-Tenant Schema
-- Rodar no Supabase SQL Editor do projeto:
-- https://supabase.com/dashboard/project/mltqpangbglmzbgmmxgu/sql
-- =============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- =============================================
-- CAMADA 1: IDENTIDADE DA PLATAFORMA
-- =============================================

CREATE TABLE IF NOT EXISTS tenants (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        text NOT NULL,
  slug        text UNIQUE NOT NULL,
  plan        text NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'enterprise')),
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  settings    jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE tenants IS 'Clientes da FSA Launch Lab. Cada expert/cliente é um tenant.';
COMMENT ON COLUMN tenants.settings IS 'JSON com: openai_api_key, uazapi_token, uazapi_instance, meta_app_id, etc.';

CREATE TABLE IF NOT EXISTS users (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  email       text NOT NULL,
  role        text NOT NULL DEFAULT 'sales' CHECK (role IN ('admin', 'expert', 'manager', 'sales')),
  avatar_url  text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE users IS 'Equipe de cada cliente. Ligado ao Supabase Auth.';

-- =============================================
-- CAMADA 2: LANÇAMENTOS
-- =============================================

CREATE TABLE IF NOT EXISTS launches (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                text NOT NULL,
  product_name        text NOT NULL,
  start_date          date,
  end_date            date,
  status              text NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'paused', 'completed')),
  current_week        int NOT NULL DEFAULT 1,
  revenue_target      numeric(15,2) DEFAULT 0,
  leads_target        int DEFAULT 0,
  conversion_target   numeric(5,2) DEFAULT 0,
  cpl_target          numeric(10,2) DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS launch_phases (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  launch_id   uuid NOT NULL REFERENCES launches(id) ON DELETE CASCADE,
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  week_start  int NOT NULL,
  week_end    int NOT NULL,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  color       text NOT NULL DEFAULT '#8b5cf6',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  phase_id     uuid NOT NULL REFERENCES launch_phases(id) ON DELETE CASCADE,
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name         text NOT NULL,
  description  text,
  assignee_id  uuid REFERENCES users(id) ON DELETE SET NULL,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  priority     text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date     date,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS launch_metrics (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  launch_id    uuid NOT NULL REFERENCES launches(id) ON DELETE CASCADE,
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date         date NOT NULL,
  revenue      numeric(15,2) DEFAULT 0,
  leads_count  int DEFAULT 0,
  conversions  int DEFAULT 0,
  ad_spend     numeric(15,2) DEFAULT 0,
  cpl          numeric(10,2) DEFAULT 0,
  roi          numeric(10,2) DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(launch_id, date)
);

-- =============================================
-- CAMADA 3: BRIEFING DO EXPERT
-- =============================================

CREATE TABLE IF NOT EXISTS briefings (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  launch_id             uuid REFERENCES launches(id) ON DELETE SET NULL,
  expert_name           text,
  expert_bio            text,
  expert_photo_url      text,
  expert_credentials    text[] DEFAULT '{}',
  product_name          text,
  product_description   text,
  product_price         numeric(12,2),
  product_installments  int DEFAULT 12,
  product_bonuses       text[] DEFAULT '{}',
  product_guarantee     text DEFAULT '7 dias',
  target_audience       text,
  audience_pain_points  text[] DEFAULT '{}',
  audience_desires      text[] DEFAULT '{}',
  audience_objections   text[] DEFAULT '{}',
  main_promise          text,
  main_benefit          text,
  differentiation       text,
  voice_tones           text[] DEFAULT '{}',
  words_to_use          text[] DEFAULT '{}',
  words_to_avoid        text[] DEFAULT '{}',
  framework_page        text DEFAULT 'padrao',
  framework_email       text DEFAULT 'padrao',
  framework_whatsapp    text DEFAULT 'padrao',
  status                text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- CAMADA 4: CRM
-- =============================================

CREATE TABLE IF NOT EXISTS tags (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  color       text NOT NULL DEFAULT '#8b5cf6',
  category    text NOT NULL DEFAULT 'custom' CHECK (category IN ('behavior', 'source', 'stage', 'custom')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leads (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  launch_id      uuid REFERENCES launches(id) ON DELETE SET NULL,
  name           text NOT NULL,
  email          text,
  phone          text NOT NULL,
  whatsapp_id    text,
  source         text NOT NULL DEFAULT 'organic' CHECK (source IN ('organic', 'paid', 'referral', 'webhook')),
  status         text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'converted', 'lost')),
  stage          text NOT NULL DEFAULT 'lead' CHECK (stage IN ('lead', 'qualified', 'opportunity', 'proposal', 'customer', 'upsell')),
  score          int NOT NULL DEFAULT 0,
  custom_fields  jsonb NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_tags (
  lead_id    uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tag_id     uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lead_id, tag_id)
);

CREATE TABLE IF NOT EXISTS interactions (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id     uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('whatsapp', 'email', 'call', 'note', 'automation')),
  direction   text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content     text NOT NULL,
  metadata    jsonb DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS abandoned_carts (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id         uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  launch_id       uuid REFERENCES launches(id) ON DELETE SET NULL,
  product_name    text NOT NULL,
  product_value   numeric(12,2) NOT NULL,
  checkout_url    text,
  status          text NOT NULL DEFAULT 'detected' CHECK (status IN ('detected', 'contacted', 'recovered', 'lost')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recovery_attempts (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cart_id       uuid NOT NULL REFERENCES abandoned_carts(id) ON DELETE CASCADE,
  type          text NOT NULL CHECK (type IN ('whatsapp', 'email')),
  content       text NOT NULL,
  sent_at       timestamptz NOT NULL DEFAULT now(),
  opened_at     timestamptz,
  converted_at  timestamptz
);

-- =============================================
-- CAMADA 5: WHATSAPP
-- =============================================

CREATE TABLE IF NOT EXISTS whatsapp_instances (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  number      text,
  status      text NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'connecting', 'connected', 'error')),
  is_default  boolean NOT NULL DEFAULT false,
  session     text,
  qr_code     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whatsapp_groups (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  instance_id         uuid NOT NULL REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
  group_id            text NOT NULL,
  name                text NOT NULL,
  description         text,
  participants_count  int DEFAULT 0,
  max_participants    int DEFAULT 1000,
  is_full             boolean DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS message_templates (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  category    text NOT NULL CHECK (category IN ('marketing', 'transactional', 'recovery')),
  language    text NOT NULL DEFAULT 'pt_BR',
  header      jsonb,
  body        text NOT NULL,
  footer      text,
  buttons     jsonb DEFAULT '[]',
  variables   text[] DEFAULT '{}',
  is_approved boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id      uuid REFERENCES leads(id) ON DELETE SET NULL,
  instance_id  uuid REFERENCES whatsapp_instances(id) ON DELETE SET NULL,
  phone        text NOT NULL,
  content      text NOT NULL,
  type         text NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'video', 'audio', 'document', 'template')),
  direction    text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  external_id  text,
  metadata     jsonb DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- CAMADA 6: RAG E FRAMEWORKS
-- =============================================

CREATE TABLE IF NOT EXISTS documents (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  type        text NOT NULL CHECK (type IN ('pdf', 'doc', 'docx', 'txt')),
  content     text,
  metadata    jsonb DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_chunks (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  document_id  uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content      text NOT NULL,
  embedding    vector(1536),
  metadata     jsonb DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS frameworks (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   uuid REFERENCES tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  type        text NOT NULL CHECK (type IN ('page', 'email', 'whatsapp', 'script')),
  content     text NOT NULL,
  variables   text[] DEFAULT '{}',
  is_global   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- CAMADA 7: INTEGRAÇÕES
-- =============================================

CREATE TABLE IF NOT EXISTS webhook_events (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source       text NOT NULL CHECK (source IN ('kiwify', 'hotmart')),
  event_type   text NOT NULL,
  payload      jsonb NOT NULL DEFAULT '{}',
  processed    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- ÍNDICES DE PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_users_tenant         ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_launches_tenant      ON launches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_launches_status      ON launches(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_phases_launch        ON launch_phases(launch_id);
CREATE INDEX IF NOT EXISTS idx_tasks_phase          ON tasks(phase_id);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant         ON tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_metrics_launch_date  ON launch_metrics(launch_id, date);
CREATE INDEX IF NOT EXISTS idx_briefings_tenant     ON briefings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_briefings_launch     ON briefings(launch_id);
CREATE INDEX IF NOT EXISTS idx_leads_tenant         ON leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_launch         ON leads(tenant_id, launch_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage          ON leads(tenant_id, stage);
CREATE INDEX IF NOT EXISTS idx_leads_phone          ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_interactions_lead    ON interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_interactions_tenant  ON interactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_carts_tenant         ON abandoned_carts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_messages_tenant      ON messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_lead        ON messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_messages_created     ON messages(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chunks_document      ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_tenant      ON webhook_events(tenant_id, processed);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- Cada usuário só vê dados do seu tenant
-- =============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE tenants            ENABLE ROW LEVEL SECURITY;
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE launches           ENABLE ROW LEVEL SECURITY;
ALTER TABLE launch_phases      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE launch_metrics     ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags               ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads              ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tags          ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE abandoned_carts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_attempts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_groups    ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE frameworks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events     ENABLE ROW LEVEL SECURITY;

-- Função auxiliar: retorna o tenant_id do usuário logado
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT tenant_id FROM users WHERE id = auth.uid()
$$;

-- Políticas RLS por tabela
CREATE POLICY "users_tenant_isolation"              ON users              USING (tenant_id = get_user_tenant_id());
CREATE POLICY "launches_tenant_isolation"           ON launches           USING (tenant_id = get_user_tenant_id());
CREATE POLICY "launch_phases_tenant_isolation"      ON launch_phases      USING (tenant_id = get_user_tenant_id());
CREATE POLICY "tasks_tenant_isolation"              ON tasks              USING (tenant_id = get_user_tenant_id());
CREATE POLICY "launch_metrics_tenant_isolation"     ON launch_metrics     USING (tenant_id = get_user_tenant_id());
CREATE POLICY "briefings_tenant_isolation"          ON briefings          USING (tenant_id = get_user_tenant_id());
CREATE POLICY "tags_tenant_isolation"               ON tags               USING (tenant_id = get_user_tenant_id());
CREATE POLICY "leads_tenant_isolation"              ON leads              USING (tenant_id = get_user_tenant_id());
CREATE POLICY "lead_tags_tenant_isolation"          ON lead_tags          USING (tenant_id = get_user_tenant_id());
CREATE POLICY "interactions_tenant_isolation"       ON interactions       USING (tenant_id = get_user_tenant_id());
CREATE POLICY "abandoned_carts_tenant_isolation"    ON abandoned_carts    USING (tenant_id = get_user_tenant_id());
CREATE POLICY "recovery_attempts_tenant_isolation"  ON recovery_attempts  USING (tenant_id = get_user_tenant_id());
CREATE POLICY "whatsapp_instances_tenant_isolation" ON whatsapp_instances USING (tenant_id = get_user_tenant_id());
CREATE POLICY "whatsapp_groups_tenant_isolation"    ON whatsapp_groups    USING (tenant_id = get_user_tenant_id());
CREATE POLICY "message_templates_tenant_isolation"  ON message_templates  USING (tenant_id = get_user_tenant_id());
CREATE POLICY "messages_tenant_isolation"           ON messages           USING (tenant_id = get_user_tenant_id());
CREATE POLICY "documents_tenant_isolation"          ON documents          USING (tenant_id = get_user_tenant_id());
CREATE POLICY "document_chunks_tenant_isolation"    ON document_chunks    USING (tenant_id = get_user_tenant_id());
CREATE POLICY "webhook_events_tenant_isolation"     ON webhook_events     USING (tenant_id = get_user_tenant_id());

-- Frameworks: globais são visíveis por todos; os privados só pelo tenant
CREATE POLICY "frameworks_tenant_isolation"
  ON frameworks
  USING (is_global = true OR tenant_id = get_user_tenant_id());

-- Tenants: usuário só vê seu próprio tenant
CREATE POLICY "tenants_own_record"
  ON tenants
  USING (id = get_user_tenant_id());

-- =============================================
-- FUNÇÃO: Criar novo cliente (tenant + user admin)
-- Chamada pela FSA ao adicionar um novo cliente
-- =============================================
CREATE OR REPLACE FUNCTION create_tenant_with_admin(
  p_tenant_name    text,
  p_tenant_slug    text,
  p_admin_id       uuid,   -- ID do auth.users já criado
  p_admin_name     text,
  p_admin_email    text,
  p_plan           text DEFAULT 'starter'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- Cria o tenant
  INSERT INTO tenants (name, slug, plan)
  VALUES (p_tenant_name, p_tenant_slug, p_plan)
  RETURNING id INTO v_tenant_id;

  -- Cria o usuário admin vinculado ao tenant
  INSERT INTO users (id, tenant_id, name, email, role)
  VALUES (p_admin_id, v_tenant_id, p_admin_name, p_admin_email, 'admin');

  RETURN v_tenant_id;
END;
$$;
