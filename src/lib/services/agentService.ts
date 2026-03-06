import { supabase } from '@/lib/supabase/client';
import { BriefingData, callGeminiWithFallback } from './briefingService';

// =============================================
// Agent Definitions
// =============================================

export interface AIAgent {
    id: string;
    name: string;
    role: string;
    description: string;
    color: string;       // Tailwind gradient classes
    emoji: string;
    inputLabel?: string; // Optional user input label
    inputPlaceholder?: string;
    status: 'ready' | 'working' | 'done';
}

export interface AgentExecution {
    id: string;
    agentId: string;
    agentName: string;
    title?: string;
    input?: string;
    output: string;
    timestamp: Date;
    durationMs: number;
}

export const AI_AGENTS: AIAgent[] = [
    {
        id: 'emilio',
        name: 'Emilio',
        role: 'Email Copywriter',
        description: 'Escreve sequências de emails persuasivos para lançamentos, aberturas de carrinho e follow-ups.',
        color: 'from-blue-500 to-cyan-500',
        emoji: '📧',
        inputLabel: 'Tipo de email',
        inputPlaceholder: 'Ex: Abertura de carrinho, Último dia, Follow-up de abandono...',
        status: 'ready',
    },
    {
        id: 'picasso',
        name: 'Picasso',
        role: 'Reels & Video Analyst',
        description: 'Analisa Reels e TikToks do nicho para identificar ganchos, CTAs e padrões virais.',
        color: 'from-pink-500 to-rose-500',
        emoji: '🎬',
        inputLabel: 'URL ou descrição do Reel/TikTok',
        inputPlaceholder: 'Cole a URL do Reel ou descreva o vídeo que quer analisar...',
        status: 'ready',
    },
    {
        id: 'cicero',
        name: 'Cicero',
        role: 'Content Repurposer',
        description: 'Transforma 1 conteúdo em 5 posts adaptados para Instagram, LinkedIn, X, Email e WhatsApp.',
        color: 'from-violet-500 to-purple-500',
        emoji: '✍️',
        inputLabel: 'Conteúdo original',
        inputPlaceholder: 'Cole o texto, roteiro ou transcrição que deseja repurpor...',
        status: 'ready',
    },
    {
        id: 'pluto',
        name: 'Pluto',
        role: 'Prospect Researcher',
        description: 'Pesquisa e estrutura perfis de prospects ideais com base no público-alvo do briefing.',
        color: 'from-amber-500 to-orange-500',
        emoji: '🔍',
        inputLabel: 'Nicho ou perfil do prospect',
        inputPlaceholder: 'Ex: Donos de academia em São Paulo, Coaches de emagrecimento...',
        status: 'ready',
    },
    {
        id: 'cosmo',
        name: 'Cosmo',
        role: 'Creative Director',
        description: 'Gera descrições detalhadas de imagens e criativos para landing pages, ads e posts.',
        color: 'from-emerald-500 to-teal-500',
        emoji: '🎨',
        inputLabel: 'Tipo de criativo',
        inputPlaceholder: 'Ex: Banner para Instagram, Hero image para landing page, Thumbnail...',
        status: 'ready',
    },
];

// =============================================
// URL Scraper (via Supabase Edge Function)
// =============================================

export async function scrapeUrl(url: string): Promise<any> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mltqpangbglmzbgmmxgu.supabase.co';
    try {
        const response = await fetch(`${supabaseUrl}/functions/v1/scrape-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
        });
        if (!response.ok) throw new Error(`Scrape failed: ${response.status}`);
        return await response.json();
    } catch (err) {
        console.error('Erro ao buscar URL:', err);
        return null;
    }
}

export function formatScrapedContent(data: any): string {
    if (!data) return '';
    const parts: string[] = [];

    parts.push(`\n=== CONTEÚDO REAL EXTRAÍDO DA URL ===`);
    parts.push(`Plataforma: ${data.platform || 'desconhecida'}`);
    if (data.og_title) parts.push(`Título: ${data.og_title}`);
    if (data.og_description) parts.push(`Descrição: ${data.og_description}`);
    if (data.page_title) parts.push(`Título da página: ${data.page_title}`);
    if (data.meta_description) parts.push(`Meta descrição: ${data.meta_description}`);
    if (data.og_type) parts.push(`Tipo: ${data.og_type}`);
    if (data.og_image) parts.push(`Imagem: ${data.og_image}`);

    // oEmbed data
    if (data.title) parts.push(`Título oEmbed: ${data.title}`);
    if (data.author_name) parts.push(`Autor: ${data.author_name}`);

    // Instagram specific
    if (data.instagram_data) {
        const ig = data.instagram_data;
        if (ig.caption) parts.push(`Legenda/Caption: ${ig.caption}`);
        if (ig.likes) parts.push(`Curtidas: ${ig.likes}`);
        if (ig.comments) parts.push(`Comentários: ${ig.comments}`);
        if (ig.views) parts.push(`Visualizações: ${ig.views}`);
        parts.push(`É vídeo: ${ig.is_video ? 'Sim' : 'Não'}`);
    }

    // Structured data
    if (data.structured_data) {
        try {
            parts.push(`Dados estruturados: ${JSON.stringify(data.structured_data).substring(0, 1500)}`);
        } catch (e) { /* ignore */ }
    }

    // Page text preview
    if (data.body_text_preview && data.body_text_preview.length > 50) {
        parts.push(`\nTexto da página (preview): ${data.body_text_preview.substring(0, 1000)}`);
    }

    parts.push(`=== FIM DO CONTEÚDO EXTRAÍDO ===`);
    return parts.join('\n');
}

// =============================================
// System Prompts (per agent)
// =============================================

function buildBriefingContext(briefing: BriefingData, dossieContext?: string): string {
    const briefingCtx = `
CONTEXTO DO EXPERT/CLIENTE:
- Expert: ${briefing.expert_name || 'Não informado'}
- Bio: ${briefing.expert_bio || 'Não informada'}
- Credenciais: ${briefing.expert_credentials?.join(', ') || 'Nenhuma'}
- Produto: ${briefing.product_name || 'Não informado'}
- Descrição: ${briefing.product_description || 'Não informada'}
- Preço: R$ ${briefing.product_price || 'Não informado'}
- Parcelas: ${briefing.product_installments || 12}x
- Garantia: ${briefing.product_guarantee || 'Não informada'}
- Bônus: ${briefing.product_bonuses?.join(', ') || 'Nenhum'}
- Público-Alvo: ${briefing.target_audience || 'Não informado'}
- Dores: ${briefing.audience_pain_points?.join(', ') || 'Nenhuma'}
- Desejos: ${briefing.audience_desires?.join(', ') || 'Nenhum'}
- Objeções: ${briefing.audience_objections?.join(', ') || 'Nenhuma'}
- Promessa Central: ${briefing.main_promise || 'Não informada'}
- Benefício: ${briefing.main_benefit || 'Não informado'}
- Diferencial: ${briefing.differentiation || 'Não informado'}
- Tom de voz: ${briefing.voice_tones?.join(', ') || 'Não definido'}
- Palavras para usar: ${briefing.words_to_use?.join(', ') || 'Nenhuma'}
- Palavras para evitar: ${briefing.words_to_avoid?.join(', ') || 'Nenhuma'}
`.trim();

    if (dossieContext) {
        return `${briefingCtx}\n\n${dossieContext}`;
    }
    return briefingCtx;
}

const SYSTEM_PROMPTS: Record<string, (briefing: BriefingData, userInput: string) => string> = {
    emilio: (briefing, userInput) => `Você é o EMILIO, um copywriter de elite especializado em email marketing para lançamentos digitais brasileiros.

Seu trabalho é criar emails que convertam — humanos, persuasivos, sem parecer IA.

${buildBriefingContext(briefing)}

TAREFA: ${userInput || 'Crie uma sequência de 5 emails para a semana de abertura de carrinho:'}
- Email 1: Abertura + grande revelação + link
- Email 2: Prova social + resultados de alunos
- Email 3: Quebra da objeção principal do público
- Email 4: Bônus especial + escassez (vagas limitadas)
- Email 5: Último dia — urgência máxima

Para cada email forneça: **Assunto**, **Preview Text**, **Corpo** e **CTA**.
Use o tom de voz definido no briefing. Linguagem humana e empática.`,

    picasso: (briefing, userInput) => `Você é o PICASSO, um analista de conteúdo viral especializado em Reels do Instagram e TikTok.

Seu trabalho é analisar vídeos/conteúdos e extrair os padrões que geram engajamento.

${buildBriefingContext(briefing)}

IMPORTANTE: Se houver "CONTEÚDO REAL EXTRAÍDO DA URL" abaixo, use APENAS esses dados reais para sua análise.
NÃO invente informações. Se não houver dados suficientes para algum item, diga "Não foi possível extrair essa informação".
Se não houver conteúdo extraído, basie-se na descrição textual fornecida.

TAREFA: Analise o seguinte conteúdo/vídeo e gere um relatório detalhado:
"${userInput || 'Analise os padrões de Reels virais no nicho do expert'}"

Seu relatório deve conter:
📊 **Score de Viralização** (0-100) — baseado nos dados reais se disponível
🎣 **Gancho usado** (primeiros 3 segundos)
📱 **Formato** (talking head, montagem, tutorial, storytelling)
🎯 **CTA implícito ou explícito**
🔑 **3 elementos que funcionaram** (por que viralizou)
⚠️ **2 pontos de melhoria**
💡 **Roteiro sugerido** para o Expert replicar o estilo no seu nicho

Seja prático e direto. Use emojis para organizar.`,

    cicero: (briefing, userInput) => `Você é o CICERO, um estrategista de conteúdo multi-plataforma.

Seu trabalho é pegar 1 conteúdo e transformá-lo em 5 versões adaptadas para diferentes plataformas.

${buildBriefingContext(briefing)}

CONTEÚDO ORIGINAL PARA REPURPOSAR:
"${userInput || 'Crie conteúdo sobre a transformação principal que o produto oferece'}"

Gere 5 versões otimizadas:

1️⃣ **Instagram (Carrossel)** — 5 slides com texto curto, design-friendly
2️⃣ **Instagram (Reels)** — Roteiro de 30-60 seg com gancho, desenvolvimento e CTA
3️⃣ **LinkedIn** — Post profissional com storytelling e autoridade
4️⃣ **Email** — Newsletter com valor + soft CTA para o produto
5️⃣ **WhatsApp** — Mensagem curta e direta (máx. 300 caracteres) com emoji

Use o tom de voz do briefing. Cada versão deve ser auto-suficiente.`,

    pluto: (briefing, userInput) => `Você é o PLUTO, um pesquisador de mercado e prospects especializado em lançamentos digitais.

Seu trabalho é identificar e estruturar perfis de prospects ideais para o Expert.

${buildBriefingContext(briefing)}

TAREFA: ${userInput || 'Identifique 5 perfis de prospects ideais para o produto do expert'}

Para cada prospect, forneça:
👤 **Perfil** (cargo, setor, faixa etária)
🎯 **Por que é ideal** (match com público-alvo)
🔥 **Dor principal** que o produto resolve
💬 **Abordagem sugerida** (primeira mensagem personalizada)
📧 **Assunto de email frio** sugerido
⚡ **Gatilho de urgência** personalizado

Baseie-se no público-alvo e nas dores descritas no briefing. Seja específico e realista.`,

    cosmo: (briefing, userInput) => `Você é o COSMO, um diretor criativo especializado em design para lançamentos digitais.

Seu trabalho é criar conceitos visuais detalhados e copy para criativos de marketing.

${buildBriefingContext(briefing)}

TAREFA: ${userInput || 'Crie conceitos de criativos para a campanha de lançamento'}

Gere 4 conceitos de criativos:

🖼️ **Criativo 1 — Hero Banner (Landing Page)**
- Headline visual
- Descrição da composição (cores, elementos, layout)
- Copy principal + sub-headline

📱 **Criativo 2 — Ad para Facebook/Instagram (Feed)**
- Dimensão: 1080x1080
- Headline de até 5 palavras
- Copy do ad (texto principal)
- CTA button text

🎬 **Criativo 3 — Thumbnail de Vídeo (YouTube/Reels)**
- Texto overlay (máx. 4 palavras)
- Expressão/pose sugerida do Expert
- Cores e estilo

📧 **Criativo 4 — Header de Email**
- Dimensão: 600x200
- Elementos visuais
- Copy integrada

Para cada criativo, descreva visualmente com detalhes suficientes para um designer executar.`,
};

// =============================================
// Gemini API Call
// =============================================

export async function runAgent(
    agentId: string,
    briefing: BriefingData,
    userInput: string = '',
    dossieContext: string = ''
): Promise<{ output: string; durationMs: number }> {
    const promptBuilder = SYSTEM_PROMPTS[agentId];
    if (!promptBuilder) throw new Error(`Agente "${agentId}" não encontrado`);

    const prompt = promptBuilder(briefing, userInput);
    const fullPrompt = dossieContext ? `${prompt}\n\n${dossieContext}` : prompt;

    const temperatures: Record<string, number> = {
        emilio: 0.8,
        picasso: 0.7,
        cicero: 0.85,
        pluto: 0.6,
        cosmo: 0.9,
    };

    const startTime = Date.now();
    const output = await callGeminiWithFallback(fullPrompt, {
        temperature: temperatures[agentId] ?? 0.8,
        maxOutputTokens: 8192,
        topP: 0.95,
    });
    const durationMs = Date.now() - startTime;

    return { output: output || 'Sem conteúdo gerado', durationMs };
}

// =============================================
// Image Generation (Nano Banana — Gemini Native)
// =============================================

export async function generateImage(
    prompt: string,
    _aspectRatio: string = '1:1'
): Promise<{ imageBase64: string; mimeType: string; durationMs: number }> {
    const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error('VITE_GEMINI_API_KEY não configurada no .env');

    const startTime = Date.now();

    // Use Gemini Nano Banana 2 (3.1 Flash Image) for native high-quality image generation
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
            }),
        }
    );

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || `Erro Gemini Image: ${response.status}`);
    }

    const data = await response.json();

    // Parse multimodal response — look for inline_data with image
    const parts = data.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));

    if (!imagePart?.inlineData) {
        throw new Error('Nenhuma imagem foi gerada. Tente um prompt diferente.');
    }

    return {
        imageBase64: imagePart.inlineData.data,
        mimeType: imagePart.inlineData.mimeType,
        durationMs,
    };
}

// =============================================
// Persistence — Save/Load/Update/Delete Executions
// =============================================

export interface AgentExecutionDB {
    id: string;
    tenant_id: string;
    agent_id: string;
    agent_name: string;
    title?: string;
    input?: string;
    output: string;
    image_url?: string;
    duration_ms?: number;
    model?: string;
    metadata?: Record<string, any>;
    created_at: string;
    updated_at: string;
}

/** Save an agent execution to Supabase */
export async function saveExecution(
    tenantId: string,
    agentId: string,
    agentName: string,
    input: string | undefined,
    output: string,
    durationMs: number,
    imageUrl?: string,
    model: string = 'gemini-2.5-flash'
): Promise<AgentExecutionDB | null> {
    const { data, error } = await (supabase
        .from('agent_executions') as any)
        .insert({
            tenant_id: tenantId,
            agent_id: agentId,
            agent_name: agentName,
            title: input ? input.substring(0, 80) : `${agentName} — ${new Date().toLocaleDateString('pt-BR')}`,
            input: input || null,
            output,
            image_url: imageUrl || null,
            duration_ms: durationMs,
            model,
        })
        .select()
        .single();

    if (error) {
        console.error('Erro ao salvar execução:', error.message);
        return null;
    }
    return data;
}

/** Fetch execution history for a tenant, optionally filtered by agent */
export async function fetchExecutions(
    tenantId: string,
    agentId?: string,
    limit: number = 20
): Promise<AgentExecutionDB[]> {
    let query = supabase
        .from('agent_executions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (agentId) {
        query = query.eq('agent_id', agentId);
    }

    const { data, error } = await query;
    if (error) {
        console.error('Erro ao buscar execuções:', error.message);
        return [];
    }
    return data || [];
}

/** Update the title of an execution */
export async function updateExecutionTitle(
    executionId: string,
    newTitle: string
): Promise<boolean> {
    const { error } = await (supabase
        .from('agent_executions') as any)
        .update({ title: newTitle, updated_at: new Date().toISOString() })
        .eq('id', executionId);

    if (error) {
        console.error('Erro ao atualizar título:', error.message);
        return false;
    }
    return true;
}

/** Delete an execution */
export async function deleteExecution(executionId: string): Promise<boolean> {
    const { error } = await supabase
        .from('agent_executions')
        .delete()
        .eq('id', executionId);

    if (error) {
        console.error('Erro ao deletar execução:', error.message);
        return false;
    }
    return true;
}

// =============================================
// RAG — Dossiê IA Context for Agent Prompts
// =============================================

/** Fetch documents + chunks from Dossiê IA for RAG context */
export async function fetchDossieContext(tenantId: string): Promise<string> {
    // Fetch documents for this tenant
    const { data: docs, error: docsErr } = await supabase
        .from('documents')
        .select('id, name, content')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(5);

    if (docsErr || !docs || docs.length === 0) {
        return ''; // No dossie documents found
    }

    // Build RAG context from documents
    const dossieContext = docs
        .map((doc: any) => {
            const content = doc.content?.substring(0, 3000) || '';
            return `📄 ${doc.name}:\n${content}`;
        })
        .join('\n\n---\n\n');

    return `
DOSSIÊ IA DO EXPERT (documentos carregados):
${dossieContext}
`.trim();
}

/** Enhanced briefing context builder that includes Dossiê IA */
export function buildFullContext(briefing: BriefingData, dossieContext: string): string {
    const briefingCtx = `
CONTEXTO DO EXPERT/CLIENTE:
- Expert: ${briefing.expert_name || 'Não informado'}
- Bio: ${briefing.expert_bio || 'Não informada'}
- Credenciais: ${briefing.expert_credentials?.join(', ') || 'Nenhuma'}
- Produto: ${briefing.product_name || 'Não informado'}
- Descrição: ${briefing.product_description || 'Não informada'}
- Preço: R$ ${briefing.product_price || 'Não informado'}
- Parcelas: ${briefing.product_installments || 12}x
- Garantia: ${briefing.product_guarantee || 'Não informada'}
- Bônus: ${briefing.product_bonuses?.join(', ') || 'Nenhum'}
- Público-Alvo: ${briefing.target_audience || 'Não informado'}
- Dores: ${briefing.audience_pain_points?.join(', ') || 'Nenhuma'}
- Desejos: ${briefing.audience_desires?.join(', ') || 'Nenhum'}
- Objeções: ${briefing.audience_objections?.join(', ') || 'Nenhuma'}
- Promessa Central: ${briefing.main_promise || 'Não informada'}
- Benefício: ${briefing.main_benefit || 'Não informado'}
- Diferencial: ${briefing.differentiation || 'Não informado'}
- Tom de voz: ${briefing.voice_tones?.join(', ') || 'Não definido'}
- Palavras para usar: ${briefing.words_to_use?.join(', ') || 'Nenhuma'}
- Palavras para evitar: ${briefing.words_to_avoid?.join(', ') || 'Nenhuma'}
`.trim();

    if (dossieContext) {
        return `${briefingCtx}\n\n${dossieContext}`;
    }
    return briefingCtx;
}
