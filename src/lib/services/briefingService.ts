import { supabase } from '@/lib/supabase/client';

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
            const { data, error } = await supabase
                .from('briefings')
                .update({ ...briefing, updated_at: new Date().toISOString() })
                .eq('id', briefing.id)
                .select()
                .single();
            if (error) throw new Error(error.message);
            return data;
        } else {
            const { data, error } = await supabase
                .from('briefings')
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
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error('VITE_GEMINI_API_KEY não configurada no .env');

    const prompt = buildPrompt(briefing, contentType);
    if (!prompt) throw new Error('Tipo de conteúdo não reconhecido');

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.85,
                    maxOutputTokens: 8192,
                    topP: 0.95,
                },
            }),
        }
    );

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || `Erro Gemini: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem conteúdo gerado';
}

// Alias mantido para compatibilidade
export const generateBriefingContent = generateWithGemini;
