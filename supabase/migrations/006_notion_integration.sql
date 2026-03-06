-- Create the Notion Integration Config table for each tenant
CREATE TABLE IF NOT EXISTS public.tenant_notion_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    workspace_id TEXT,
    workspace_name TEXT,
    bot_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(tenant_id)
);

-- Enable RLS
ALTER TABLE public.tenant_notion_config ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their tenant's Notion config"
    ON public.tenant_notion_config FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their tenant's Notion config"
    ON public.tenant_notion_config FOR UPDATE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their tenant's Notion config"
    ON public.tenant_notion_config FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their tenant's Notion config"
    ON public.tenant_notion_config FOR DELETE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users WHERE id = auth.uid()
        )
    );

-- Add a trigger to update 'updated_at'
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS set_tenant_notion_config_updated_at ON public.tenant_notion_config;
CREATE TRIGGER set_tenant_notion_config_updated_at
    BEFORE UPDATE ON public.tenant_notion_config
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Add this to our publication for real-time (optional but good practice)
-- ALTER PUBLICATION supabase_realtime ADD TABLE tenant_notion_config;
