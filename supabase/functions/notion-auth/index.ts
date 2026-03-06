import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { code, redirect_uri } = await req.json();

        const clientId = Deno.env.get('NOTION_CLIENT_ID');
        const clientSecret = Deno.env.get('NOTION_CLIENT_SECRET');

        if (!clientId || !clientSecret) {
            throw new Error('Notion credentials not configured in Edge Function secrets. Please add NOTION_CLIENT_ID and NOTION_CLIENT_SECRET.');
        }

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('Missing authorization header');

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        // Get user from JWT
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user) throw new Error('Unauthorized');

        console.log(`Exchanging code for token using client_id: ${clientId.substring(0, 8)}...`);

        // Exchange token with Notion
        const encoded = btoa(`${clientId}:${clientSecret}`);
        const response = await fetch('https://api.notion.com/v1/oauth/token', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Basic ${encoded}`,
            },
            body: JSON.stringify({
                grant_type: 'authorization_code',
                code,
                redirect_uri
            })
        });

        let data;
        try {
            data = await response.json();
        } catch (e) {
            throw new Error('Invalid JSON response from Notion: ' + e.message);
        }

        if (!response.ok) {
            console.error('Notion API Error:', data);
            // Return 200 so Supabase doesn't throw generic generic non-2xx error on client
            return new Response(JSON.stringify({ error: `Notion Error: ${data.error_description || data.error || JSON.stringify(data)}` }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // First find the tenant_id for this user
        const { data: userData, error: tenantError } = await supabaseClient.from('users').select('tenant_id').eq('id', user.id).single();
        if (tenantError || !userData?.tenant_id) throw new Error('Tenant not found for user');

        const tenantId = userData.tenant_id;

        // Use service_role key to bypass RLS for edge function upsert just in case
        const adminClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { error: dbError } = await adminClient.from('tenant_notion_config').upsert({
            tenant_id: tenantId,
            access_token: data.access_token,
            workspace_id: data.workspace_id,
            workspace_name: data.workspace_name,
            bot_id: data.bot_id
        }, { onConflict: 'tenant_id' });

        if (dbError) throw new Error(`Database error saving token: ${dbError.message}`);

        return new Response(JSON.stringify({ success: true, workspace_name: data.workspace_name }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Function catch error:', error);
        // Return 200 so the client receives the JSON payload instead of a generic non-2xx exception
        return new Response(JSON.stringify({ error: error.message }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
