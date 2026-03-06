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
    const { tenant_id, query } = await req.json();

    if (!tenant_id) {
      return new Response(JSON.stringify({ error: 'tenant_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: notionConfig, error: configError } = await adminClient
      .from('tenant_notion_config')
      .select('access_token')
      .eq('tenant_id', tenant_id)
      .single();

    if (configError || !notionConfig?.access_token) {
      return new Response(JSON.stringify({ error: 'Notion not connected' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Search Notion pages
    const searchBody: any = {
      filter: { value: 'page', property: 'object' },
      sort: { direction: 'descending', timestamp: 'last_edited_time' },
      page_size: 30
    };

    if (query && query.trim()) {
      searchBody.query = query.trim();
    }

    const searchResponse = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionConfig.access_token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchBody)
    });

    const searchData = await searchResponse.json();

    if (!searchResponse.ok) {
      return new Response(JSON.stringify({ error: searchData.message || 'Notion search failed' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse pages into simple format
    const pages = (searchData.results || []).map((page: any) => {
      // Extract title from properties
      let title = 'Sem título';
      const titleProp = page.properties?.title || page.properties?.Name;
      if (titleProp?.title?.[0]?.plain_text) {
        title = titleProp.title[0].plain_text;
      } else if (page.properties) {
        // Try any title-type property
        for (const prop of Object.values(page.properties) as any[]) {
          if (prop.type === 'title' && prop.title?.[0]?.plain_text) {
            title = prop.title[0].plain_text;
            break;
          }
        }
      }

      // Extract icon
      let icon = '📄';
      if (page.icon?.type === 'emoji') icon = page.icon.emoji;

      return {
        id: page.id,
        title,
        url: page.url,
        icon,
        last_edited: page.last_edited_time
      };
    }).filter((p: any) => p.title !== 'Sem título' || true); // include all

    return new Response(JSON.stringify({ pages }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('notion-pages error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
