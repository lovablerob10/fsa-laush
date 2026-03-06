import { supabase } from '@/lib/supabase/client';

// =============================================
// Gemini Helper — Auto Fallback Pro → Flash
// =============================================
const GEMINI_MODELS = ['gemini-2.5-pro', 'gemini-2.5-flash'];

export async function callGeminiWithFallback(
    prompt: string,
    config: { temperature?: number; maxOutputTokens?: number; topP?: number } = {}
): Promise<string> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error('VITE_GEMINI_API_KEY não configurada no .env');

    let lastError: Error | null = null;
    for (const model of GEMINI_MODELS) {
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: config.temperature ?? 0.85,
                            maxOutputTokens: config.maxOutputTokens ?? 8192,
                            topP: config.topP ?? 0.95,
                        },
                    }),
                }
            );
            if (!response.ok) {
                const err = await response.json();
                // 404 = model not available, 429 = quota exceeded → try next model
                if (response.status === 404 || response.status === 429) {
                    lastError = new Error(err.error?.message || `Erro ${response.status} no modelo ${model}`);
                    console.warn(`[Gemini] Modelo ${model} indisponível, tentando próximo...`);
                    continue;
                }
                throw new Error(err.error?.message || `Erro Gemini: ${response.status}`);
            }
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error('Gemini retornou resposta vazia');
            return text;
        } catch (err: any) {
            if (err.message?.includes('indisponível') || err.message?.includes('404') || err.message?.includes('429')) {
                lastError = err;
                continue;
            }
            throw err;
        }
    }
    throw lastError || new Error('Todos os modelos Gemini estão indisponíveis no momento');
}


export interface BriefingData {
    id?: string;
    tenant_id: string;
    launch_id?: string;
    expert_name?: string;
    expert_bio?: string;
    expert_photo_url?: string;
    expert_credentials?: string[];
    product_name?: string;
    product_description?: string;
    product_price?: number;
    product_installments?: number;
    product_bonuses?: string[];
    product_guarantee?: string;
    target_audience?: string;
    audience_pain_points?: string[];
    audience_desires?: string[];
    audience_objections?: string[];
    main_promise?: string;
    main_benefit?: string;
    differentiation?: string;
    voice_tones?: string[];
    words_to_use?: string[];
    words_to_avoid?: string[];
    framework_page?: string;
    framework_email?: string;
    framework_whatsapp?: string;
    status?: 'draft' | 'approved';
}

export const briefingService = {
    async fetchByTenant(tenantId: string): Promise<BriefingData | null> {
        const { data, error } = await supabase
            .from('briefings')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        if (error && error.code !== 'PGRST116') console.error('Erro ao buscar briefing:', error.message);
        return data || null;
    },

    async save(briefing: BriefingData): Promise<BriefingData | null> {
        if (briefing.id) {
            const { data, error } = await (supabase
                .from('briefings') as any)
                .update({ ...briefing, updated_at: new Date().toISOString() })
                .eq('id', briefing.id)
                .select()
                .single();
            if (error) throw new Error(error.message);
            return data;
        } else {
            const { data, error } = await (supabase
                .from('briefings') as any)
                .insert(briefing)
                .select()
                .single();
            if (error) throw new Error(error.message);
            return data;
        }
    },
};

// =============================================
// Build prompt from briefing data
// =============================================
function buildPrompt(briefing: BriefingData, contentType: string): string {
    const context = `
Expert: ${briefing.expert_name || ''}
Bio: ${briefing.expert_bio || ''}
Credenciais: ${briefing.expert_credentials?.join(', ') || ''}
Produto: ${briefing.product_name || ''}
Descrição: ${briefing.product_description || ''}
Preço: R$ ${briefing.product_price || ''}
Parcelas: ${briefing.product_installments || 12}x
Garantia: ${briefing.product_guarantee || ''}
Bônus: ${briefing.product_bonuses?.join(', ') || ''}
Público-Alvo: ${briefing.target_audience || ''}
Dores: ${briefing.audience_pain_points?.join(', ') || ''}
Desejos: ${briefing.audience_desires?.join(', ') || ''}
Objeções: ${briefing.audience_objections?.join(', ') || ''}
Promessa Central: ${briefing.main_promise || ''}
Benefício: ${briefing.main_benefit || ''}
Diferencial: ${briefing.differentiation || ''}
Tom de voz: ${briefing.voice_tones?.join(', ') || ''}
Palavras para usar: ${briefing.words_to_use?.join(', ') || ''}
Palavras para evitar: ${briefing.words_to_avoid?.join(', ') || ''}`.trim();

    const prompts: Record<string, string> = {
        page: `Você é um copywriter especialista em lançamentos digitais brasileiros.
Com base no briefing abaixo, escreva uma PÁGINA DE VENDAS completa em português (pt-BR):
- Headline impactante
- Subheadline
- História do expert (conexão emocional)
- Para quem é / Para quem NÃO é
- O que você vai aprender
- 3 depoimentos realistas
- Apresentação do produto + módulos
- Bônus exclusivos
- Garantia incondicional
- CTA com urgência e escassez

BRIEFING:\n${context}`,

        email_sequence: `Você é um copywriter especialista em email marketing para lançamentos digitais.
Escreva uma SEQUÊNCIA DE 5 EMAILS para a semana de abertura de carrinho:
- Email 1: Abertura + benefícios + link
- Email 2: Prova social + depoimentos
- Email 3: Quebra de objeção principal
- Email 4: Bônus especial + escassez
- Email 5: Último dia (urgência máxima)

Cada email deve ter: Assunto, Corpo e CTA. Linguagem humana, sem parecer IA.

BRIEFING:\n${context}`,

        whatsapp: `Você é especialista em vendas pelo WhatsApp para lançamentos digitais.
Escreva 5 MENSAGENS DE WHATSAPP para disparar durante o lançamento:
- Msg 1: Abertura (gerar curiosidade)
- Msg 2: Problema + transformação
- Msg 3: Prova social (screenshot de resultados)
- Msg 4: Oferta + bônus (link direto)
- Msg 5: Último chamado (FOMO)

Mensagens curtas, com emojis, tom direto e engajante. Máximo 300 caracteres cada.

BRIEFING:\n${context}`,

        campaign: `Você é um estrategista de lançamentos digitais.
Crie um PLANO DE CONTEÚDO para redes sociais (4 semanas de pré-lançamento):
- Semana 1: Aquecimento (5 posts)
- Semana 2: Conteúdo de valor (5 posts)
- Semana 3: Prova social (5 posts)
- Semana 4: Abertura de carrinho (5 posts)

Para cada post: Plataforma (Instagram/YouTube/TikTok), Formato (Reel/Carrossel/Story), Tema, Texto principal.

BRIEFING:\n${context}`,
    };

    return prompts[contentType] || '';
}

// =============================================
// Google Gemini API (AI Studio)
// =============================================
export async function generateWithGemini(briefing: BriefingData, contentType: string): Promise<string> {
    const prompt = buildPrompt(briefing, contentType);
    if (!prompt) throw new Error('Tipo de conteúdo não reconhecido');
    return callGeminiWithFallback(prompt, { temperature: 0.85, maxOutputTokens: 8192, topP: 0.95 });
}

// Alias mantido para compatibilidade
export const generateBriefingContent = generateWithGemini;

// =============================================
// Micro-Assistente: Sugerir valor para um campo
// =============================================
export async function generateFieldSuggestion(briefing: BriefingData, fieldName: string, fieldTitle: string): Promise<string> {
    const context = `
Contexto Atual do Briefing:
Nome: ${briefing.expert_name || '-'}
Bio/História: ${briefing.expert_bio || '-'}
Produto: ${briefing.product_name || '-'}
Descrição Produto: ${briefing.product_description || '-'}
Público-Alvo: ${briefing.target_audience || '-'}
Dores: ${briefing.audience_pain_points?.join(', ') || '-'}
Desejos: ${briefing.audience_desires?.join(', ') || '-'}
Promessa: ${briefing.main_promise || '-'}
Benefício: ${briefing.main_benefit || '-'}
Diferencial: ${briefing.differentiation || '-'}
`.trim();

    const prompt = `Você é um copywriter de elite ajudando a preencher um formulário de estratégia de lançamento.
Sua tarefa é analisar o contexto atual do briefing e escrever uma sugestão altamente persuasiva e profissional exclusivamente para o campo: "${fieldTitle}" (ID: ${fieldName}).

${context}

REGRAS:
1. Retorne APENAS o conteúdo sugerido para o campo "${fieldTitle}". Sem preâmbulos, sem "Aqui está a sugestão:".
2. Se o campo atual for uma lista (ex: dores, desejos), retorne os itens separados por vírgula.
3. Se o campo for texto (ex: biografia, promessa), escreva um texto contínuo e impactante.
4. Use o contexto acima para criar algo que faça sentido histórico e mercadológico. Se o contexto estiver vazio, crie algo genérico mas de alta qualidade para servir de exemplo.`;

    const text = await callGeminiWithFallback(prompt, { temperature: 0.7, maxOutputTokens: 1024 });
    return text.trim();
}

// =============================================
// Agente Especialista em Lançamentos — Plano 7 Semanas
// =============================================
export interface WeekTask {
    name: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
}

export interface WeekPlan {
    phase: string;
    week_start: number;
    week_end: number;
    theme: string;
    tasks: WeekTask[];
    content_posts?: { platform: string; format: string; theme: string; caption: string }[];
}

export interface LaunchPlan7Weeks {
    launch_name: string;
    weeks: WeekPlan[];
}

export async function generate7WeekPlan(briefing: BriefingData): Promise<LaunchPlan7Weeks> {
    const prompt = `Você é um estrategista de elite especialista em lançamentos digitais no mercado brasileiro.
Sua missão: criar um PLANO DE LANÇAMENTO COMPLETO DE 7 SEMANAS personalizado para esse expert.

BRIEFING DO EXPERT:
- Nome: ${briefing.expert_name || 'Expert'}
- Biografia: ${briefing.expert_bio || ''}
- Produto: ${briefing.product_name || ''} (R$ ${briefing.product_price || '?'})
- Descrição: ${briefing.product_description || ''}
- Público-alvo: ${briefing.target_audience || ''}
- Dores principais: ${briefing.audience_pain_points?.join(', ') || ''}
- Desejos: ${briefing.audience_desires?.join(', ') || ''}
- Promessa central: ${briefing.main_promise || ''}
- Diferencial: ${briefing.differentiation || ''}
- Objeções: ${briefing.audience_objections?.join(', ') || ''}
- Credenciais: ${briefing.expert_credentials?.join(', ') || ''}

Crie um plano de 7 semanas com as 5 fases padrão do lançamento digital:
- Fase 1 (planning): Semana 1 — Planejamento estratégico
- Fase 2 (anticipation): Semanas 2-3 — Antecipação, geração de leads e aquecimento
- Fase 3 (sales): Semanas 4-5 — Abertura de carrinho, lives de vendas, fechamento
- Fase 4 (immersion): Semana 6 — Entrega, onboarding, primeiras aulas
- Fase 5 (upsell): Semana 7 — Upsell, retenção, pesquisa NPS

Retorne SOMENTE um JSON válido (sem markdown) com esta estrutura:
{
  "launch_name": "Nome criativo do lançamento baseado no produto/expert",
  "weeks": [
    {
      "phase": "planning",
      "week_start": 1,
      "week_end": 1,
      "theme": "Tema/foco principal desta fase",
      "tasks": [
        { "name": "Tarefa específica e acionável", "description": "Como executar em 1-2 frases", "priority": "high" },
        { "name": "...", "description": "...", "priority": "medium" }
      ],
      "content_posts": [
        { "platform": "Instagram", "format": "Reels", "theme": "Tema do post", "caption": "200 caracteres da legenda pronta" }
      ]
    }
  ]
}

REGRAS CRÍTICAS:
1. Personalize CADA tarefa para o expert, produto e público específico do briefing
2. Mínimo de 4 tasks por fase, máximo de 7
3. Mínimo de 3 content_posts por fase
4. Prioridade deve ser: "high", "medium" ou "low"
5. Retorne SOMENTE o JSON. Nada mais.`;

    const raw = await callGeminiWithFallback(prompt, { temperature: 0.8, maxOutputTokens: 16384, topP: 0.95 });
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned) as LaunchPlan7Weeks;
}

