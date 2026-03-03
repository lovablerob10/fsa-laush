import { supabase } from '@/lib/supabase/client';

export interface BriefingData {
    id?: string;
    tenant_id: string;
    launch_id?: string;
    // Etapa 1: Expert
    expert_name?: string;
    expert_bio?: string;
    expert_photo_url?: string;
    expert_credentials?: string[];
    // Etapa 2: Produto
    product_name?: string;
    product_description?: string;
    product_price?: number;
    product_installments?: number;
    product_bonuses?: string[];
    product_guarantee?: string;
    // Etapa 3: Público
    target_audience?: string;
    audience_pain_points?: string[];
    audience_desires?: string[];
    audience_objections?: string[];
    // Etapa 4: Promessa
    main_promise?: string;
    main_benefit?: string;
    differentiation?: string;
    // Etapa 5: Identidade de Marca
    voice_tones?: string[];
    words_to_use?: string[];
    words_to_avoid?: string[];
    // Etapa 6: Frameworks
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

        if (error && error.code !== 'PGRST116') {
            console.error('Erro ao buscar briefing:', error.message);
        }
        return data || null;
    },

    async save(briefing: BriefingData): Promise<BriefingData | null> {
        if (briefing.id) {
            // Update
            const { data, error } = await supabase
                .from('briefings')
                .update({ ...briefing, updated_at: new Date().toISOString() })
                .eq('id', briefing.id)
                .select()
                .single();
            if (error) throw new Error(error.message);
            return data;
        } else {
            // Insert
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
// IA: Geração de conteúdo com OpenAI GPT-4o
// =============================================
export async function generateBriefingContent(briefing: BriefingData, contentType: string): Promise<string> {
    const apiKey = (briefing as any).__apiKey;

    const prompts: Record<string, string> = {
        page: `Você é um copywriter especialista em lançamentos digitais. 
Com base no briefing abaixo, escreva uma PÁGINA DE VENDAS completa em português (pt-BR), estruturada com:
- Headline poderosa
- Subheadline
- História do expert
- Para quem é este produto
- O que você vai aprender/conseguir
- Depoimentos (crie 3 fictícios realistas)
- Apresentação do produto
- Bônus
- Garantia
- CTA com urgência

BRIEFING:
Expert: ${briefing.expert_name}
Bio: ${briefing.expert_bio}
Produto: ${briefing.product_name}
Preço: R$ ${briefing.product_price}
Promessa: ${briefing.main_promise}
Benefício: ${briefing.main_benefit}
Diferencial: ${briefing.differentiation}
Público: ${briefing.target_audience}
Dores: ${briefing.audience_pain_points?.join(', ')}
Desejos: ${briefing.audience_desires?.join(', ')}
Objeções: ${briefing.audience_objections?.join(', ')}
Bônus: ${briefing.product_bonuses?.join(', ')}
Garantia: ${briefing.product_guarantee}
Tom de voz: ${briefing.voice_tones?.join(', ')}`,

        email_sequence: `Você é um copywriter especialista em email marketing para lançamentos.
Com base no briefing abaixo, escreva uma SEQUÊNCIA DE 5 EMAILS para a semana de lançamento:
- Email 1: Abertura de carrinho (urgência + benefícios)
- Email 2: Dia 2 (prova social + depoimentos)
- Email 3: Quebra de objeções
- Email 4: Bônus especial + escassez
- Email 5: Último dia (urgência máxima)

BRIEFING:
Expert: ${briefing.expert_name}
Produto: ${briefing.product_name}
Preço: R$ ${briefing.product_price}
Promessa: ${briefing.main_promise}
Público: ${briefing.target_audience}
Tom de voz: ${briefing.voice_tones?.join(', ')}`,

        whatsapp: `Você é um especialista em vendas pelo WhatsApp para lançamentos digitais.
Com base no briefing abaixo, escreva 5 MENSAGENS DE WHATSAPP para disparar durante o lançamento:
- Mensagem 1: Abertura (curiosidade)
- Mensagem 2: Problema + transformação
- Mensagem 3: Prova social
- Mensagem 4: Oferta + bônus
- Mensagem 5: Último chamado

Cada mensagem deve ser curta, com emojis e muito engajamento.

BRIEFING:
Expert: ${briefing.expert_name}
Produto: ${briefing.product_name}
Promessa: ${briefing.main_promise}
Público: ${briefing.target_audience}`,

        campaign: `Você é um estrategista de lançamentos digitais.
Com base no briefing abaixo, crie um PLANO DE CONTEÚDO para as redes sociais durante as 4 semanas de lançamento, incluindo:
- Semana 1: Aquecimento (5 posts)
- Semana 2: Conteúdo de valor (5 posts)
- Semana 3: Prova social (5 posts)
- Semana 4: Abertura de carrinho (5 posts)

Para cada post, informe: Plataforma, Formato, Tema, Texto principal.

BRIEFING:
Expert: ${briefing.expert_name}
Produto: ${briefing.product_name}
Promessa: ${briefing.main_promise}
Público: ${briefing.target_audience}
Diferencial: ${briefing.differentiation}`,
    };

    const prompt = prompts[contentType];
    if (!prompt) throw new Error('Tipo de conteúdo não reconhecido');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.8,
            max_tokens: 4000,
        }),
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Erro na API OpenAI');
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
}
