-- ================================================
-- Create subtasks table (was missing from schema)
-- ================================================
CREATE TABLE IF NOT EXISTS subtasks (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id      uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name         text NOT NULL,
  description  text,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  order_index  int NOT NULL DEFAULT 0,
  due_date     date,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_tenant ON subtasks(tenant_id);

-- RLS
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subtasks_tenant_isolation" ON subtasks
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));
