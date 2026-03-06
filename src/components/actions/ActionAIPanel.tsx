import { useState, useEffect, useCallback } from 'react';
import {
    X, Sparkles, Loader2, Copy, Check, RefreshCw, ChevronLeft, ChevronRight,
    Instagram, Mail, MessageCircle, Video, FileText,
    TrendingUp, Wand2, ChevronDown, ChevronUp,
    Image, Download, Palette, Zap, Type, Save, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { briefingService } from '@/lib/services/briefingService';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store';

interface Action {
    id: string;
    type: 'instagram' | 'email' | 'whatsapp' | 'live' | 'story' | 'reel' | 'copy' | 'ads';
    title: string;
    description: string;
    objective: string;
    tips: string[];
    completed: boolean;
}

interface Props {
    action: Action;
    onClose: () => void;
}

interface GeneratedBlock {
    label: string;
    content: string;
    expanded: boolean;
}

// ── Action type config ──────────────────────────────────────────────────────
const ACTION_TYPE_CONFIG: Record<string, {
    icon: React.ElementType;
    color: string;
    label: string;
    outputs: string[];
    hasCreative: boolean;
    creativeFormat: string;
}> = {
    instagram: {
        icon: Instagram, color: 'text-pink-500', label: 'Post Instagram',
        outputs: ['Caption completa', 'Versão curta', 'Hashtags', 'CTA sugerido'],
        hasCreative: true, creativeFormat: 'quadrado (1:1)',
    },
    story: {
        icon: Instagram, color: 'text-pink-400', label: 'Story',
        outputs: ['Sequência de stories (5 cards)', 'Texto de cada card', 'CTA final'],
        hasCreative: true, creativeFormat: 'vertical (9:16)',
    },
    reel: {
        icon: Video, color: 'text-purple-500', label: 'Reel',
        outputs: ['Script completo', 'Gancho (primeiros 3s)', 'Desenvolvimento', 'CTA final', 'Legenda do Reel'],
        hasCreative: true, creativeFormat: 'vertical (9:16)',
    },
    email: {
        icon: Mail, color: 'text-blue-500', label: 'E-mail',
        outputs: ['Assunto (3 opções)', 'Pré-header', 'Corpo do e-mail', 'CTA do botão'],
        hasCreative: false, creativeFormat: '',
    },
    whatsapp: {
        icon: MessageCircle, color: 'text-emerald-500', label: 'WhatsApp',
        outputs: ['Mensagem principal', 'Versão curta', 'Follow-up 24h'],
        hasCreative: false, creativeFormat: '',
    },
    live: {
        icon: Video, color: 'text-red-500', label: 'Live',
        outputs: ['Roteiro da live', 'Abertura (5 min)', 'Conteúdo principal', 'Transição para oferta', 'Script da oferta'],
        hasCreative: true, creativeFormat: 'quadrado (1:1)',
    },
    copy: {
        icon: FileText, color: 'text-violet-500', label: 'Copy',
        outputs: ['Headline principal', '3 variações de headline', 'Subheadline', 'Bullet points de benefícios', 'CTA'],
        hasCreative: false, creativeFormat: '',
    },
    ads: {
        icon: TrendingUp, color: 'text-amber-500', label: 'Anúncio',
        outputs: ['Texto do anúncio', 'Headline do criativo', 'Descrição curta', 'CTA do botão', 'Variação B'],
        hasCreative: true, creativeFormat: 'quadrado (1:1) ou feed (4:5)',
    },
};

// ── Gemini helper ───────────────────────────────────────────────────────────
async function callGemini(prompt: string): Promise<string> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY não configurada');
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
    );
    if (!response.ok) throw new Error(`Gemini error: ${response.status}`);
    const json = await response.json();
    return json.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ── Build content prompt ────────────────────────────────────────────────────
function buildPrompt(action: Action, briefing: any): string {
    const b = briefing || {};
    const expertCtx = [
        b.expert_name && `Expert: ${b.expert_name}`,
        b.expert_bio && `Bio: ${b.expert_bio}`,
        b.product_name && `Produto: ${b.product_name}`,
        b.product_description && `Descrição: ${b.product_description}`,
        b.target_audience && `Público-alvo: ${b.target_audience}`,
        b.main_promise && `Promessa principal: ${b.main_promise}`,
        b.main_benefit && `Principal benefício: ${b.main_benefit}`,
        b.differentiation && `Diferencial: ${b.differentiation}`,
        b.audience_pain_points?.length && `Dores: ${b.audience_pain_points.join(', ')}`,
        b.audience_desires?.length && `Desejos: ${b.audience_desires.join(', ')}`,
        b.voice_tones?.length && `Tom de voz: ${b.voice_tones.join(', ')}`,
    ].filter(Boolean).join('\n');

    const typeConfig = ACTION_TYPE_CONFIG[action.type];

    const outputInstructions: Record<string, string> = {
        instagram: `Gere em JSON exato:
{"caption_completa":"caption completa com emojis e storytelling (min 150 palavras)","versao_curta":"até 50 palavras","hashtags":"30 hashtags relevantes","cta_sugerido":"call-to-action final"}`,
        story: `Gere em JSON exato:
{"card_1":"gancho - 1 frase forte","card_2":"contexto/dor","card_3":"desenvolvimento/solução","card_4":"prova/resultado","card_5":"CTA claro","dica_visual":"sugestão de visual"}`,
        reel: `Gere em JSON exato:
{"gancho_3s":"frase de gancho para os primeiros 3 segundos","desenvolvimento":"script do desenvolvimento 15-30s","cta_final":"CTA dos últimos 5 segundos","legenda":"legenda completa com emojis e hashtags","dica_producao":"dica de produção e edição"}`,
        email: `Gere em JSON exato:
{"assunto_1":"opção 1 de assunto","assunto_2":"opção 2 de assunto","assunto_3":"opção 3 de assunto","pre_header":"pré-header","corpo":"corpo completo do e-mail","cta_botao":"texto do botão"}`,
        whatsapp: `Gere em JSON exato:
{"mensagem_principal":"mensagem completa (informal, emojis)","versao_curta":"até 2 linhas","followup_24h":"follow-up para 24h depois"}`,
        live: `Gere em JSON exato:
{"roteiro_abertura":"script dos primeiros 5 minutos","conteudo_principal":"estrutura do conteúdo principal","transicao_oferta":"script de transição suave","script_oferta":"script completo da oferta com preço e bônus","fechamento":"script dos últimos 5 minutos"}`,
        copy: `Gere em JSON exato:
{"headline_principal":"headline principal","headline_variacao_2":"variação 2","headline_variacao_3":"variação 3","subheadline":"subheadline complementar","bullets":"5 bullet points de benefícios com ✅","cta":"texto do botão CTA"}`,
        ads: `Gere em JSON exato:
{"texto_anuncio":"texto principal (125 caracteres)","headline_criativo":"headline do criativo (40 caracteres)","descricao_curta":"descrição (30 caracteres)","cta_botao":"texto do botão","variacao_b":"versão alternativa completa para teste A/B"}`,
    };

    return `Você é especialista em marketing digital e copywriting para lançamentos online.

## CONTEXTO DO EXPERT/PRODUTO:
${expertCtx || 'Sem briefing. Gere conteúdo genérico de alta qualidade.'}

## AÇÃO:
Tipo: ${typeConfig?.label || action.type}
Título: ${action.title}
Descrição: ${action.description}
Objetivo: ${action.objective}
Dicas: ${action.tips.join(' | ')}

## INSTRUÇÃO:
${outputInstructions[action.type] || `Gere conteúdo JSON completo para ${typeConfig?.label}`}

IMPORTANTE: Retorne APENAS o JSON válido, sem texto antes ou depois.`;
}

// ── Aspect ratio config ──────────────────────────────────────────────────────
type AspectRatio = 'auto' | '1:1' | '4:5' | '9:16' | '16:9';

const ASPECT_CONFIGS: Record<AspectRatio, { css: string; label: string; dims: string; layout: string }> = {
    'auto': { css: '', label: 'Auto IA', dims: '1080x1080', layout: 'centered square composition' },
    '1:1': { css: '1 / 1', label: '1:1', dims: '1080x1080', layout: 'centered square composition' },
    '4:5': { css: '4 / 5', label: '4:5', dims: '1080x1350', layout: 'vertical portrait layout, more breathing room below headline' },
    '9:16': { css: '9 / 16', label: '9:16', dims: '1080x1920', layout: 'full vertical layout, stack elements from top to bottom with generous spacing' },
    '16:9': { css: '16 / 9', label: '16:9', dims: '1920x1080', layout: 'wide horizontal layout, headline left side, visual element right side' },
};

// ── Build image prompt ──────────────────────────────────────────────────────
function buildImagePrompt(
    action: Action,
    briefing: any,
    blocks: GeneratedBlock[],
    imageStyle: string,
    aspectRatio: AspectRatio
): string {
    const b = briefing || {};
    const ac = ASPECT_CONFIGS[aspectRatio];


    // Extract REAL marketing copy — NEVER use internal task/action names
    const rawHeadline = (blocks.find(bl =>
        bl.label.toLowerCase().includes('headline') ||
        bl.label.toLowerCase().includes('assunto') ||
        bl.label.toLowerCase().includes('gancho')
    )?.content?.split('\n')[0]?.replace(/^"|"|\.\*/g, '').trim())
        || b.main_promise || b.main_benefit || ('Conheca ' + (b.product_name || 'o metodo'));

    const subheadline = (blocks.find(bl =>
        bl.label.toLowerCase().includes('subheadline') || bl.label.toLowerCase().includes('sub')
    )?.content?.split('\n')[0]?.replace(/^"|"/, '').trim() || b.product_description || '');

    const cta = (blocks.find(bl =>
        bl.label.toLowerCase().includes('cta') || bl.label.toLowerCase().includes('botao')
    )?.content?.split('\n')[0]?.replace(/^"|"/, '').trim() || 'Saiba Mais');

    const styleMap: Record<string, string> = {
        profissional: 'Dark navy and deep violet gradient (#0F0A2E to #1A0A3E). Bold white typography. Subtle geometric lines. Electric violet accent glows.',
        vibrante: 'Electric purple to hot pink gradient (#7C3AED to #EC4899). High energy. Neon glow effects. Dynamic diagonal shapes.',
        elegante: 'Deep black (#0A0A0A). Gold/champagne (#D4AF37) typography. Thin serif fonts. Luxury minimal.',
        minimalista: 'Light gray background. Single deep violet accent. Maximum white space. Simple geometric. Clean sans-serif.',
    };

    const palette = styleMap[imageStyle] || styleMap.profissional;
    const audienceCtx = b.target_audience ? ('Target: ' + b.target_audience + '.') : '';
    const toneCtx = b.voice_tones?.length ? ('Tone: ' + b.voice_tones.join(', ') + '.') : '';

    // Hard-limit headline to 35 chars at word boundary — prevents text clipping
    const hw = rawHeadline.trim().split(' ');
    let headline = '';
    for (const w of hw) {
        const candidate = headline ? (headline + ' ' + w) : w;
        if (candidate.length <= 35) headline = candidate; else break;
    }
    if (!headline) headline = rawHeadline.substring(0, 35);

    const sub35 = subheadline.substring(0, 55);
    const ctaText = cta.substring(0, 25);
    const ratio = aspectRatio === 'auto' ? 'square 1:1' : aspectRatio;

    const prompt = [
        'Create a ' + ac.dims + 'px social media marketing creative (' + ratio + ' format).',
        '',
        'VISUAL STYLE: ' + palette,
        'CANVAS LAYOUT: ' + ac.layout,
        '',
        'TEXT LAYOUT — ALL text must be FULLY visible — 80px safe zone on all 4 edges:',
        '- HEADLINE (bold, max 2 lines, font 70-90px): "' + headline + '"',
        '- SUBHEADLINE (lighter, max 1 line, font 30-38px): "' + sub35 + '"',
        '- BRAND NAME (top-right corner, font 20px): "' + (b.product_name || '') + '"',
        '- EXPERT (bottom, font 26px): "' + (b.expert_name ? 'Com ' + b.expert_name : '') + '"',
        '- CTA BUTTON (bottom center, rounded pill, bold, font 30px): "' + ctaText + '"',
        '',
        'RULES: All text inside 80px safe zone. Never cut text mid-word. Line-height 1.3x. Never write Post de Aquecimento/Reel/Story/Anuncio. Premium Brazilian digital marketing style.',
        audienceCtx + ' ' + toneCtx,
    ].join('\n');
    return prompt;
}


function parseGeneratedBlocks(raw: string): GeneratedBlock[] {
    try {
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);
        return Object.entries(parsed).map(([key, value]) => ({
            label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            content: String(value),
            expanded: true,
        }));
    } catch {
        return [{ label: 'Conteúdo Gerado', content: raw, expanded: true }];
    }
}

// ── Main Component ──────────────────────────────────────────────────────────
type Tab = 'content' | 'creative';

export function ActionAIPanel({ action, onClose }: Props) {
    const { activeTenant } = useAuthStore() as any;
    const [briefing, setBriefing] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<Tab>('content');

    // Content generation state
    const [generating, setGenerating] = useState(false);
    const [blocks, setBlocks] = useState<GeneratedBlock[]>([]);
    const [contentError, setContentError] = useState('');
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    // Creative (image) state
    const [generatingImage, setGeneratingImage] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<{ base64: string; mimeType: string } | null>(null);
    const [imageError, setImageError] = useState('');
    const [imageStyle, setImageStyle] = useState<'profissional' | 'vibrante' | 'elegante' | 'minimalista'>('profissional');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('auto');
    // Carousel state
    const [carouselMode, setCarouselMode] = useState(false);
    const [slideCount, setSlideCount] = useState<3 | 5 | 7>(3);
    const [carouselSlides, setCarouselSlides] = useState<Array<{ base64: string; mimeType: string }>>([]);
    const [carouselProgress, setCarouselProgress] = useState(0);
    const [generatingCarousel, setGeneratingCarousel] = useState(false);
    const [activeSlide, setActiveSlide] = useState(0);

    // Expert photo upload state
    const [uploadedPhoto, setUploadedPhoto] = useState<{ base64: string; mimeType: string; preview: string } | null>(null);

    // Persistence state
    const [savedAt, setSavedAt] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [savedConfirm, setSavedConfirm] = useState(false);

    const typeConfig = ACTION_TYPE_CONFIG[action.type];
    const Icon = typeConfig?.icon || Sparkles;

    // Load briefing + saved content
    useEffect(() => {
        if (!activeTenant?.id) return;
        briefingService.fetchByTenant(activeTenant.id).then((data) => {
            if (data) setBriefing(data);
        });

        // Load previously saved content for this action
        (supabase.from('agent_executions') as any)
            .select('output, created_at')
            .eq('tenant_id', activeTenant.id)
            .eq('agent_id', action.id)
            .eq('agent_name', 'calendar_action')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
            .then(({ data: saved }: any) => {
                if (saved?.output) {
                    try {
                        const parsed = JSON.parse(saved.output);
                        if (Array.isArray(parsed)) {
                            setBlocks(parsed.map((b: any) => ({ ...b, expanded: true })));
                            setSavedAt(saved.created_at);
                        }
                    } catch { /* not JSON blocks, skip */ }
                }
            });
    }, [activeTenant?.id, action.id]);

    // ── Save generated content ──
    const saveContent = useCallback(async () => {
        if (!activeTenant?.id || blocks.length === 0) return;
        setIsSaving(true);
        try {
            // Upsert: delete old + insert new for this action
            await (supabase.from('agent_executions') as any)
                .delete()
                .eq('tenant_id', activeTenant.id)
                .eq('agent_id', action.id)
                .eq('agent_name', 'calendar_action');

            const { data } = await (supabase.from('agent_executions') as any)
                .insert({
                    tenant_id: activeTenant.id,
                    agent_id: action.id,
                    agent_name: 'calendar_action',
                    title: action.title,
                    input: action.description,
                    output: JSON.stringify(blocks.map(b => ({ label: b.label, content: b.content }))),
                    model: 'gemini-2.5-flash',
                    duration_ms: 0,
                })
                .select('created_at')
                .single();

            if (data?.created_at) setSavedAt(data.created_at);
            setSavedConfirm(true);
            setTimeout(() => setSavedConfirm(false), 2500);
        } catch (e) {
            console.error('Erro ao salvar:', e);
        } finally {
            setIsSaving(false);
        }
    }, [activeTenant?.id, action.id, action.title, action.description, blocks]);

    // ── Content generation ──
    async function generateContent() {
        setGenerating(true);
        setContentError('');
        setBlocks([]);
        try {
            const prompt = buildPrompt(action, briefing);
            const raw = await callGemini(prompt);
            const parsed = parseGeneratedBlocks(raw);
            setBlocks(parsed);
        } catch (e: any) {
            setContentError(e.message || 'Erro ao gerar conteúdo');
        } finally {
            setGenerating(false);
        }
    }

    // ── Image generation (with optional expert photo) ──
    async function generateCreative() {
        setGeneratingImage(true);
        setImageError('');
        setGeneratedImage(null);
        try {
            const prompt = buildImagePrompt(action, briefing, blocks, imageStyle, aspectRatio);
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) throw new Error('GEMINI_API_KEY não configurada');

            // Build parts — add expert photo if uploaded (multimodal)
            const parts: any[] = [];
            if (uploadedPhoto) {
                parts.push({ inlineData: { mimeType: uploadedPhoto.mimeType, data: uploadedPhoto.base64 } });
                parts.push({ text: `Use the person in this photo as the expert/presenter in the creative. ${prompt}` });
            } else {
                parts.push({ text: prompt });
            }

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts }] }),
                }
            );
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || `Gemini Image error: ${response.status}`);
            }
            const data = await response.json();
            const resParts = data.candidates?.[0]?.content?.parts || [];
            const imgPart = resParts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));
            if (!imgPart?.inlineData) throw new Error('Nenhuma imagem foi gerada. Tente novamente.');
            setGeneratedImage({ base64: imgPart.inlineData.data, mimeType: imgPart.inlineData.mimeType });
        } catch (e: any) {
            setImageError(e.message || 'Erro ao gerar criativo');
        } finally {
            setGeneratingImage(false);
        }
    }

    // ── Build carousel slide prompt ──
    function buildCarouselSlidePrompt(
        slideIndex: number,
        totalSlides: number,
        mainHeadline: string,
        benefits: string[],
        briefingData: any
    ): string {
        const b = briefingData || {};
        const ac = ASPECT_CONFIGS[aspectRatio];
        const styleMap: Record<string, string> = {
            profissional: 'Dark navy and deep violet gradient (#0F0A2E to #1A0A3E). Bold white typography. Electric violet accent glows.',
            vibrante: 'Electric purple to hot pink gradient (#7C3AED to #EC4899). Neon glow effects.',
            elegante: 'Deep black (#0A0A0A). Gold/champagne (#D4AF37) typography. Luxury minimal.',
            minimalista: 'Light gray background. Single deep violet accent. Clean sans-serif.',
        };
        const palette = styleMap[imageStyle] || styleMap.profissional;
        const position = slideIndex === 0 ? 'first'
            : slideIndex === totalSlides - 1 ? 'last'
            : 'middle';

        const slideConfigs = {
            first: {
                role: 'GANCHO — Hook slide that grabs attention immediately',
                text: `HEADLINE: "${mainHeadline.substring(0, 35)}"
SUBHEADLINE: "Deslize para descobrir →"
EXPERT: "${b.expert_name ? 'Com ' + b.expert_name : ''}"`,
                tip: 'Large bold headline centered. Arrow or swipe indicator at bottom-right.',
            },
            middle: {
                role: `CONTEÚDO — Content slide ${slideIndex} of ${totalSlides - 2} (teaching/benefit slide)`,
                text: `NUMBER: "0${slideIndex}" (large, left corner)
HEADLINE: "${(benefits[slideIndex - 1] || b.main_benefit || 'Benefício chave').substring(0, 35)}"
EXPERT NAME (bottom): "${b.expert_name || ''}"`,
                tip: 'Clean content layout. Large number on left. Concise headline on right. Minimalist.',
            },
            last: {
                role: 'CTA — Call-to-action final slide that converts',
                text: `HEADLINE: "Pronto para transformar?" 
CTA BUTTON: "Quero Começar"
BRAND: "${b.product_name || ''}"
EXPERT: "${b.expert_name || ''}"`,
                tip: 'Strong CTA button. Brand name prominent. Urgency feel.',
            },
        };
        const cfg = slideConfigs[position];
        return [
            'Create carousel slide ' + (slideIndex + 1) + ' of ' + totalSlides + ' for Instagram.',
            'CANVAS: ' + ac.dims + 'px (' + (aspectRatio === 'auto' ? '1:1' : aspectRatio) + ')',
            'VISUAL STYLE: ' + palette,
            'SLIDE ROLE: ' + cfg.role,
            '',
            'TEXT (ALL fully visible — 80px safe zone all edges):',
            cfg.text,
            '',
            'DESIGN TIP: ' + cfg.tip,
            'RULE: Consistent style with other slides (same color scheme, font family). No internal task names. Premium Brazilian marketing.',
        ].join('\n');
    }

    // ── Generate carousel ──
    async function generateCarousel() {
        setGeneratingCarousel(true);
        setCarouselSlides([]);
        setCarouselProgress(0);
        setActiveSlide(0);
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) { setGeneratingCarousel(false); return; }

        // Extract benefits from blocks
        const benefits = blocks
            .filter(bl => bl.label.toLowerCase().includes('beneficio') || bl.label.toLowerCase().includes('benefit') || bl.label.toLowerCase().includes('ponto'))
            .map(bl => bl.content.split('\n')[0].replace(/^"|"/g, '').trim())
            .filter(Boolean);

        const rawHeadline = (blocks.find(bl =>
            bl.label.toLowerCase().includes('headline') || bl.label.toLowerCase().includes('gancho')
        )?.content?.split('\n')[0]?.replace(/^"|"|\.\*/g, '').trim())
            || briefing?.main_promise || 'Transforme sua vida agora';
        const hw = rawHeadline.trim().split(' ');
        let headline = '';
        for (const w of hw) { const c = headline ? headline + ' ' + w : w; if (c.length <= 35) headline = c; else break; }
        if (!headline) headline = rawHeadline.substring(0, 35);

        const slides: Array<{ base64: string; mimeType: string }> = [];
        for (let i = 0; i < slideCount; i++) {
            try {
                const prompt = buildCarouselSlidePrompt(i, slideCount, headline, benefits, briefing);
                const parts: any[] = uploadedPhoto
                    ? [{ inlineData: { mimeType: uploadedPhoto.mimeType, data: uploadedPhoto.base64 } }, { text: 'Use the person in this photo as the expert. ' + prompt }]
                    : [{ text: prompt }];
                const res = await fetch(
                    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=' + apiKey,
                    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts }] }) }
                );
                if (res.ok) {
                    const data = await res.json();
                    const imgPart = (data.candidates?.[0]?.content?.parts || []).find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));
                    if (imgPart?.inlineData) slides.push({ base64: imgPart.inlineData.data, mimeType: imgPart.inlineData.mimeType });
                }
            } catch { /* skip failed slide */ }
            setCarouselProgress(Math.round(((i + 1) / slideCount) * 100));
        }
        setCarouselSlides(slides);
        setGeneratingCarousel(false);
    }

    function downloadSlide(slide: { base64: string; mimeType: string }, index: number) {
        const link = document.createElement('a');
        link.href = 'data:' + slide.mimeType + ';base64,' + slide.base64;
        link.download = 'slide-' + (index + 1) + '-' + action.id + '.png';
        link.click();
    }

    function downloadAllSlides() {
        carouselSlides.forEach((slide, i) => downloadSlide(slide, i));
    }

    // ── Handle photo upload ──
    function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            const [header, base64] = dataUrl.split(',');
            const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
            setUploadedPhoto({ base64, mimeType, preview: dataUrl });
        };
        reader.readAsDataURL(file);
    }

    function downloadImage() {
        if (!generatedImage) return;
        const link = document.createElement('a');
        link.href = `data:${generatedImage.mimeType};base64,${generatedImage.base64}`;
        link.download = `criativo-${action.id}-${Date.now()}.png`;
        link.click();
    }

    function copyBlock(label: string, content: string) {
        navigator.clipboard.writeText(content);
        setCopiedKey(label);
        setTimeout(() => setCopiedKey(null), 2000);
    }

    function copyAll() {
        const text = blocks.map(b => `## ${b.label}\n${b.content}`).join('\n\n');
        navigator.clipboard.writeText(text);
        setCopiedKey('__all__');
        setTimeout(() => setCopiedKey(null), 2000);
    }

    function toggleBlock(index: number) {
        setBlocks(prev => prev.map((b, i) => i === index ? { ...b, expanded: !b.expanded } : b));
    }

    const STYLES = [
        { key: 'profissional', label: 'Profissional', emoji: '💼' },
        { key: 'vibrante', label: 'Vibrante', emoji: '🔥' },
        { key: 'elegante', label: 'Elegante', emoji: '✨' },
        { key: 'minimalista', label: 'Minimalista', emoji: '🎯' },
    ] as const;

    return (
        <div className="fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className="w-full max-w-xl bg-slate-950 border-l border-slate-800 flex flex-col h-full shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="flex-shrink-0 px-5 py-4 border-b border-slate-800 bg-gradient-to-r from-violet-950/60 to-slate-950">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                                <Sparkles className="w-4.5 h-4.5 text-white" />
                            </div>
                            <div>
                                <p className="text-white font-bold text-sm">Gerador de Conteúdo IA</p>
                                <p className="text-violet-400 text-xs">Powered by Gemini 2.5 Flash</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Action card */}
                    <div className="bg-slate-900/70 border border-slate-700/40 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className={cn('text-xs font-semibold', typeConfig?.color)}>
                                <Icon className="w-3 h-3 inline mr-1" />
                                {typeConfig?.label}
                            </span>
                            {briefing?.expert_name
                                ? <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">✓ Briefing carregado</span>
                                : <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full">⚠ Sem briefing</span>
                            }
                        </div>
                        <p className="text-white font-semibold text-sm leading-snug">{action.title}</p>
                        <p className="text-slate-500 text-xs mt-0.5">🎯 {action.objective}</p>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 mt-3">
                        <button
                            onClick={() => setActiveTab('content')}
                            className={cn(
                                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all',
                                activeTab === 'content'
                                    ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                            )}
                        >
                            <Type className="w-3.5 h-3.5" />
                            Texto
                        </button>
                        {typeConfig?.hasCreative && (
                            <button
                                onClick={() => setActiveTab('creative')}
                                className={cn(
                                    'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all',
                                    activeTab === 'creative'
                                        ? 'bg-pink-600 text-white shadow-md shadow-pink-500/20'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                )}
                            >
                                <Palette className="w-3.5 h-3.5" />
                                Criativo Visual
                            </button>
                        )}
                    </div>
                </div>

                {/* ── TAB: CONTENT ── */}
                {activeTab === 'content' && (
                    <>
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                            {/* Initial state */}
                            {blocks.length === 0 && !generating && !contentError && (
                                <div className="text-center py-10">
                                    <div className="w-16 h-16 bg-violet-500/10 border border-violet-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Wand2 className="w-8 h-8 text-violet-400" />
                                    </div>
                                    <p className="text-slate-200 font-semibold mb-1">Pronto para gerar</p>
                                    <p className="text-slate-500 text-sm mb-4">
                                        IA vai criar conteúdo para{' '}
                                        <span className="text-violet-400 font-medium">{briefing?.expert_name || 'este lançamento'}</span>
                                    </p>
                                    {typeConfig?.outputs && (
                                        <div className="flex flex-wrap gap-1.5 justify-center">
                                            {typeConfig.outputs.map(o => (
                                                <span key={o} className="text-xs px-2 py-1 bg-slate-800/80 text-slate-400 border border-slate-700/50 rounded-full">{o}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Loading */}
                            {generating && (
                                <div className="text-center py-14">
                                    <div className="w-16 h-16 bg-violet-500/10 border border-violet-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Sparkles className="w-8 h-8 text-violet-400 animate-pulse" />
                                    </div>
                                    <p className="text-slate-300 font-semibold">Gerando conteúdo...</p>
                                    <p className="text-slate-500 text-sm mt-1">Analisando briefing e criando {typeConfig?.label}...</p>
                                </div>
                            )}

                            {/* Error */}
                            {contentError && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                                    <p className="text-red-400 text-sm font-semibold mb-1">Erro ao gerar</p>
                                    <p className="text-red-300 text-xs">{contentError}</p>
                                </div>
                            )}

                            {/* Generated blocks */}
                            {blocks.length > 0 && (
                                <>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <p className="text-slate-500 text-xs">{blocks.length} blocos gerados</p>
                                            {savedAt && (
                                                <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                                    <Clock className="w-2.5 h-2.5" />
                                                    Salvo {new Date(savedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={saveContent}
                                                disabled={isSaving}
                                                className={cn(
                                                    'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all',
                                                    savedConfirm
                                                        ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                                                        : 'border-slate-600 text-slate-400 hover:text-violet-400 hover:border-violet-500/40'
                                                )}
                                            >
                                                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> :
                                                    savedConfirm ? <Check className="w-3 h-3" /> :
                                                        <Save className="w-3 h-3" />}
                                                {isSaving ? 'Salvando...' : savedConfirm ? 'Salvo!' : 'Salvar'}
                                            </button>
                                            <button onClick={copyAll} className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors">
                                                {copiedKey === '__all__' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                                {copiedKey === '__all__' ? 'Copiado!' : 'Copiar tudo'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {blocks.map((block, i) => (
                                            <div key={i} className="bg-slate-900 border border-slate-700/40 rounded-xl overflow-hidden">
                                                <button
                                                    onClick={() => toggleBlock(i)}
                                                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-800/50 transition-colors"
                                                >
                                                    <span className="text-violet-300 text-[11px] font-bold uppercase tracking-wider">{block.label}</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); copyBlock(block.label, block.content); }}
                                                            className="p-1 text-slate-500 hover:text-violet-400 transition-colors rounded"
                                                        >
                                                            {copiedKey === block.label ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                                        </button>
                                                        {block.expanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
                                                    </div>
                                                </button>
                                                {block.expanded && (
                                                    <div className="px-4 pb-4">
                                                        <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                                                            <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">{block.content}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Nudge to creative tab */}
                                    {typeConfig?.hasCreative && (
                                        <button
                                            onClick={() => setActiveTab('creative')}
                                            className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-pink-500/30 rounded-xl text-pink-400 hover:border-pink-500/60 hover:bg-pink-500/5 transition-all text-sm font-medium"
                                        >
                                            <Palette className="w-4 h-4" />
                                            Gerar criativo visual com esta copy →
                                        </button>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex-shrink-0 px-5 py-4 border-t border-slate-800">
                            <div className="flex gap-3">
                                {blocks.length > 0 && (
                                    <Button variant="outline" onClick={generateContent} disabled={generating}
                                        className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                                        <RefreshCw className={cn('w-3.5 h-3.5 mr-2', generating && 'animate-spin')} />
                                        Regerar
                                    </Button>
                                )}
                                <Button onClick={generateContent} disabled={generating}
                                    className={cn(
                                        'font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/20',
                                        blocks.length > 0 ? 'flex-1' : 'w-full'
                                    )}>
                                    {generating
                                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando...</>
                                        : <><Sparkles className="w-4 h-4 mr-2" />{blocks.length > 0 ? 'Regerar tudo' : '✨ Gerar Conteúdo'}</>
                                    }
                                </Button>
                            </div>
                        </div>
                    </>
                )}

                {/* ── TAB: CREATIVE ── */}
                {activeTab === 'creative' && (
                    <>
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                            {/* Style selector */}
                            <div>
                                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Estilo Visual</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {STYLES.map(s => (
                                        <button
                                            key={s.key}
                                            onClick={() => setImageStyle(s.key)}
                                            className={cn(
                                                'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all',
                                                imageStyle === s.key
                                                    ? 'border-pink-500/50 bg-pink-500/10 text-pink-300'
                                                    : 'border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                                            )}
                                        >
                                            <span className="text-base">{s.emoji}</span>
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Photo upload */}
                            <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-3">
                                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">📸 Foto do Expert (opcional)</p>
                                {uploadedPhoto ? (
                                    <div className="flex items-center gap-3">
                                        <img src={uploadedPhoto.preview} alt="Expert" className="w-12 h-12 rounded-lg object-cover border border-violet-500/30" />
                                        <div className="flex-1">
                                            <p className="text-emerald-400 text-xs font-semibold">✓ Foto carregada</p>
                                            <p className="text-slate-500 text-xs">Será incluída no criativo pela IA</p>
                                        </div>
                                        <button onClick={() => setUploadedPhoto(null)} className="text-slate-500 hover:text-red-400 text-xs transition-colors">✕</button>
                                    </div>
                                ) : (
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className="w-10 h-10 rounded-lg border-2 border-dashed border-slate-600 flex items-center justify-center group-hover:border-violet-500 transition-colors">
                                            <Image className="w-4 h-4 text-slate-500 group-hover:text-violet-400" />
                                        </div>
                                        <div>
                                            <p className="text-slate-300 text-xs font-medium group-hover:text-violet-400 transition-colors">Carregar sua foto</p>
                                            <p className="text-slate-500 text-[10px]">JPG, PNG • A IA vai te incluir no criativo</p>
                                        </div>
                                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                                    </label>
                                )}
                            </div>

                            {/* Image result */}
                            {generatedImage && (
                                <div className="space-y-3">
                                    <div className="relative rounded-xl overflow-hidden border border-slate-700/50 shadow-2xl" style={{ aspectRatio: ASPECT_CONFIGS[aspectRatio].css || "1 / 1" }}>
                                        <img
                                            src={`data:${generatedImage.mimeType};base64,${generatedImage.base64}`}
                                            alt="Criativo gerado pela IA"
                                            className="w-full"
                                        />
                                        <div className="absolute top-2 right-2">
                                            <span className="text-xs px-2 py-1 bg-black/60 text-white rounded-full backdrop-blur-sm">
                                                IA Generated
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={downloadImage}
                                        className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white"
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Baixar Criativo
                                    </Button>
                                </div>
                            )}

                            {/* Carousel Gallery */}
                            {carouselSlides.length > 0 && (
                                <div className="space-y-3">
                                    <div className="relative">
                                        <div className="rounded-xl overflow-hidden border border-slate-700/50 shadow-2xl"
                                            style={{ aspectRatio: ASPECT_CONFIGS[aspectRatio].css || '1 / 1' }}>
                                            <img
                                                src={'data:' + carouselSlides[activeSlide]?.mimeType + ';base64,' + carouselSlides[activeSlide]?.base64}
                                                alt={'Slide ' + (activeSlide + 1)}
                                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                            />
                                        </div>
                                        {activeSlide > 0 && (
                                            <button onClick={() => setActiveSlide(s => s - 1)}
                                                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80">
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                        )}
                                        {activeSlide < carouselSlides.length - 1 && (
                                            <button onClick={() => setActiveSlide(s => s + 1)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80">
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button onClick={() => downloadSlide(carouselSlides[activeSlide], activeSlide)}
                                            className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-lg flex items-center justify-center text-white hover:bg-black/80">
                                            <Download className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    {/* Dots */}
                                    <div className="flex items-center justify-center gap-1.5">
                                        {carouselSlides.map((_, i) => (
                                            <button key={i} onClick={() => setActiveSlide(i)}
                                                className={cn('transition-all rounded-full', activeSlide === i ? 'w-5 h-2 bg-pink-500' : 'w-2 h-2 bg-slate-600 hover:bg-slate-400')}
                                            />
                                        ))}
                                    </div>
                                    {/* Thumbnail strip */}
                                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                                        {carouselSlides.map((slide, i) => (
                                            <button key={i} onClick={() => setActiveSlide(i)}
                                                className={cn('flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all',
                                                    activeSlide === i ? 'border-pink-500' : 'border-slate-700 opacity-60 hover:opacity-100')}
                                            >
                                                <img src={'data:' + slide.mimeType + ';base64,' + slide.base64} className="w-full h-full object-cover" alt={''} />
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-center text-xs text-slate-500">Slide {activeSlide + 1} de {carouselSlides.length}</p>
                                </div>
                            )}

                            {/* Loading */}
                            {generatingImage && (
                                <div className="text-center py-16">
                                    <div className="relative w-20 h-20 mx-auto mb-4">
                                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-pink-500/20 to-violet-500/20 border border-pink-500/30 animate-pulse" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Image className="w-9 h-9 text-pink-400 animate-pulse" />
                                        </div>
                                    </div>
                                    <p className="text-slate-300 font-semibold">Gerando criativo...</p>
                                    <p className="text-slate-500 text-sm mt-1">Isso pode levar 10-20 segundos</p>
                                </div>
                            )}

                            {/* Error */}
                            {imageError && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                                    <p className="text-red-400 text-sm font-semibold mb-1">Erro ao gerar criativo</p>
                                    <p className="text-red-300 text-xs">{imageError}</p>
                                </div>
                            )}

                            {/* Initial state */}
                            {!generatedImage && !generatingImage && !imageError && (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-pink-500/10 border border-pink-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Palette className="w-8 h-8 text-pink-400" />
                                    </div>
                                    <p className="text-slate-200 font-semibold mb-1">Criativo Visual com IA</p>
                                    <p className="text-slate-500 text-sm">
                                        Gera imagem para {typeConfig?.creativeFormat || 'redes sociais'} usando o briefing do expert + copy
                                    </p>
                                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-500">
                                        <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/30">
                                            <p className="font-semibold text-slate-300 mb-1">📋 Briefing</p>
                                            <p>{briefing?.expert_name || '–'}</p>
                                            <p className="truncate">{briefing?.product_name || '–'}</p>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/30">
                                            <p className="font-semibold text-slate-300 mb-1">🎯 Ação</p>
                                            <p className="truncate">{action.title}</p>
                                            <p className="text-pink-400">{typeConfig?.creativeFormat}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex-shrink-0 px-5 py-4 border-t border-slate-800 space-y-3">
                            {/* Carousel / Single toggle */}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => { setCarouselMode(false); setCarouselSlides([]); }}
                                    className={cn('flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                                        !carouselMode ? 'border-violet-500 bg-violet-500/10 text-violet-300' : 'border-slate-700 text-slate-500 hover:text-slate-300')}
                                >📸 Criativo Único</button>
                                <button
                                    onClick={() => { setCarouselMode(true); setGeneratedImage(null); }}
                                    className={cn('flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                                        carouselMode ? 'border-pink-500 bg-pink-500/10 text-pink-300' : 'border-slate-700 text-slate-500 hover:text-slate-300')}
                                >🎠 Carrossel</button>
                            </div>

                            {carouselMode ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-400">Slides:</span>
                                        {([3, 5, 7] as const).map(n => (
                                            <button key={n} onClick={() => setSlideCount(n)}
                                                className={cn('px-3 py-1 rounded-lg text-xs font-bold border transition-all',
                                                    slideCount === n ? 'border-pink-500 bg-pink-500/10 text-pink-300' : 'border-slate-700 text-slate-500')}
                                            >{n}</button>
                                        ))}
                                        {carouselSlides.length > 0 && (
                                            <button onClick={downloadAllSlides}
                                                className="ml-auto flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 rounded-lg px-2 py-1">
                                                <Download className="w-3 h-3" /> Baixar todos
                                            </button>
                                        )}
                                    </div>
                                    {generatingCarousel && (
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between text-xs text-slate-400">
                                                <span>Gerando slides...</span><span>{carouselProgress}%</span>
                                            </div>
                                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-pink-500 to-violet-500 rounded-full transition-all duration-500" style={{ width: carouselProgress + '%' }} />
                                            </div>
                                        </div>
                                    )}
                                    <Button onClick={generateCarousel} disabled={generatingCarousel}
                                        className="w-full font-semibold bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-500 hover:to-violet-500 text-white shadow-lg shadow-pink-500/20">
                                        {generatingCarousel
                                            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando {slideCount} slides...</>
                                            : <><Zap className="w-4 h-4 mr-2" />🎠 Gerar Carrossel ({slideCount} slides)</>
                                        }
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex gap-3">
                                    {generatedImage && (
                                        <Button variant="outline" onClick={generateCreative} disabled={generatingImage}
                                            className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                                            <RefreshCw className={cn('w-3.5 h-3.5 mr-2', generatingImage && 'animate-spin')} />
                                            Regerar
                                        </Button>
                                    )}
                                    <Button onClick={generateCreative} disabled={generatingImage}
                                        className={cn(
                                            'font-semibold bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white shadow-lg shadow-pink-500/20',
                                            generatedImage ? 'flex-1' : 'w-full'
                                        )}>
                                        {generatingImage
                                            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando criativo...</>
                                            : <><Zap className="w-4 h-4 mr-2" />{generatedImage ? 'Nova variação' : '🎨 Gerar Criativo'}</>
                                        }
                                    </Button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
{/* ── PROPORÇÃO DA IMAGEM ── */}
<div className="space-y-2">
    <p className="text-xs font-semibold text-slate-300">PROPORÇÃO DA IMAGEM</p>
    <div className="grid grid-cols-5 gap-1.5">
        {(['auto', '1:1', '4:5', '9:16', '16:9'] as AspectRatio[]).map(r => {
            const cfg = ASPECT_CONFIGS[r];
            return (
                <button
                    key={r}
                    onClick={() => setAspectRatio(r)}
                    className={cn(
                        'flex flex-col items-center gap-0.5 p-2 rounded-lg border text-center transition-all',
                        aspectRatio === r
                            ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                            : 'border-slate-700/40 text-slate-400 hover:border-violet-500/40'
                    )}
                >
                    <span className="text-[11px] font-bold">{cfg.label}</span>
                    <span className="text-[9px] opacity-70 leading-tight">{r === 'auto' ? 'IA decide' : r === '1:1' ? 'Feed' : r === '4:5' ? 'Retrato' : r === '9:16' ? 'Story' : 'Capa'}</span>
                </button>
            );
        })}
    </div>
</div>
}
