import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Client } from "npm:@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "npm:@modelcontextprotocol/sdk/client/sse.js";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { prompt, title } = await req.json();

        if (!prompt) {
            throw new Error('Missing prompt parameter');
        }

        const apiKey = Deno.env.get('STITCH_API_KEY');
        if (!apiKey) {
            throw new Error('STITCH_API_KEY not configured in Edge Function environment');
        }

        console.log(`Connecting to Stitch MCP API...`);

        // A maioria dos servidores MCP em HTTP usam o path /sse para a conexão de Server-Sent Events
        const transportUrl = new URL("https://stitch.googleapis.com/mcp/sse");
        const transport = new SSEClientTransport(transportUrl, {
            headers: {
                "Authorization": `Bearer ${apiKey}`,
            }
        });

        const client = new Client(
            { name: "launchlab-stitch-client", version: "1.0.0" },
            { capabilities: { tools: {} } }
        );

        await client.connect(transport);
        console.log(`Connected. Creating project "${title || 'Nobre Landing Page'}"...`);

        // 1. Create Project
        const projRes = await client.callTool({
            name: "create_project",
            arguments: { title: title || "Nobre Landing Page" }
        });

        const projText = projRes.content[0].type === 'text' ? projRes.content[0].text : '';
        const projData = JSON.parse(projText);
        // O resource name do projeto no Stitch costuma ser "projects/12345"
        const projectId = projData.projectId || projData.name?.replace('projects/', '') || projData.id || projData.name;

        console.log(`Project created: ${projectId}. Generating screen...`);

        // 2. Generate Screen From Text
        const genRes = await client.callTool({
            name: "generate_screen_from_text",
            arguments: {
                projectId: projectId,
                prompt: prompt
            }
        });

        const genText = genRes.content[0].type === 'text' ? genRes.content[0].text : '';
        const genData = JSON.parse(genText);
        // O resource name da screen costuma ser "projects/12345/screens/67890"
        const screenId = genData.screenId || genData.name?.split('/').pop() || genData.id;

        console.log(`Screen generated: ${screenId}. Fetching code...`);

        // 3. Fetch HTML Code
        const codeRes = await client.callTool({
            name: "fetch_screen_code",
            arguments: {
                projectId: projectId,
                screenId: screenId
            }
        });

        const html = codeRes.content[0].type === 'text' ? codeRes.content[0].text : '';

        return new Response(
            JSON.stringify({
                success: true,
                html: html,
                projectId: projectId,
                screenId: screenId
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (err: any) {
        console.error("Stitch pipeline error:", err.message);
        return new Response(
            JSON.stringify({ success: false, error: err.message || 'Unknown error' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});
