import { useState, useRef, useEffect } from 'react';
import {
    Sparkles, ChevronRight, Send, Loader2, CheckCircle2,
    User, Bot, Wand2, FileText, Target, Layers, Star, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore, useUIStore } from '@/store';

// ── Types ──────────────────────────────────────────────────────────────────
interface ChatMessage {
    role: 'agent' | 'user';
    content: string;
    timestamp: Date;
}

interface BriefingAccumulated {
    expert_name?: string;
    expert_bio?: string;
    expert_credentials?: string[];
    product_name?: string;
    product_description?: string;
    product_price?: number;
    target_audience?: string;
    audience_pain_points?: string[];
    audience_desires?: string[];
    audience_objections?: string[];
    main_promise?: string;
    main_benefit?: string;
    differentiation?: string;
    voice_tones?: string[];
}

interface GeneratedStructure {
    narrative: string;
    blocks: { title: string; description: string; exercise?: string }[];
    diagnostic: string;
    offer_script: string;
    briefing_summary: string;
}

// ── Questions ──────────────────────────────────────────────────────────────
const QUESTIONS = [
    {
        id: 1,
        agentMessage: 'Olá! Eu sou o seu Concierge de Imersão. 👋\n\nVamos começar pelo básico: **qual é o seu nome completo e em qual área você atua?**\n\n*Ex: "Sou Maria Silva, sou nutricionista especializada em emagrecimento hormonal."*',
        field: 'expert_name_bio',
        hint: 'Nome + área de atuação',
    },
    {
        id: 2,
        agentMessage: '**Qual é o principal problema que você resolve para o seu público?**\n\nPensa no problema mais urgente, aquele que faz a pessoa perder o sono e buscar ajuda.\n\n*Ex: "Meu público luta com o efeito sanfona — emagrece, mas recupera tudo em pouco tempo."*',
        field: 'pain_promise',
        hint: 'O problema central que você resolve',
    },
    {
        id: 3,
        agentMessage: '**Quem é a pessoa que mais precisa de você?**\n\nDescreva com detalhes: idade, momento de vida, o que ela sonha, o que a frustra, o que já tentou antes.\n\n*Ex: "Mulheres de 35-50 anos, mães, que já tentaram várias dietas e se sentem derrotadas..."*',
        field: 'audience',
        hint: 'Perfil completo do seu público ideal',
    },
    {
        id: 4,
        agentMessage: '**Qual é o seu método ou abordagem única para resolver esse problema?**\n\nO que você faz de diferente do que todo mundo oferece no mercado?\n\n*Ex: "Trabalho com regulação hormonal + reeducação alimentar sem restrições, em 3 fases..."*',
        field: 'method',
        hint: 'Seu método e diferencial',
    },
    {
        id: 5,
        agentMessage: '**Me conta 2 ou 3 resultados reais que você já gerou para clientes.**\n\nSeja específico: números, situações concretas, transformações reais.\n\n*Ex: "A Maria perdeu 18kg em 4 meses sem contar calorias. O João estabilizou o açúcar no sangue em 60 dias..."*',
        field: 'results',
        hint: 'Resultados concretos com clientes reais',
    },
    {
        id: 6,
        agentMessage: '**Qual produto ou programa você vai apresentar no final da imersão?**\n\nNome, breve descrição, valor e como funciona (ao vivo, online, mensal, etc).\n\n*Ex: "Protocolo Equilíbrio — 3 meses de acompanhamento online. R$ 2.997 ou 12x R$ 299..."*',
        field: 'product',
        hint: 'Produto: nome, formato, preço',
    },
    {
        id: 7,
        agentMessage: '**Última pergunta! Qual é a maior objeção que seu público tem antes de comprar?**\n\nO que eles dizem (ou pensam) que os impede de dar o próximo passo?\n\n*Ex: "Não tenho tempo", "Já tentei tudo e não funciona comigo", "Não tenho dinheiro agora"...*',
        field: 'objection',
        hint: 'Principal objeção do seu público',
    },
];

// ── Gemini helper ──────────────────────────────────────────────────────────
async function callGemini(prompt: string): Promise<string> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY não configurada');

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.8, maxOutputTokens: 2048 },
            }),
        }
    );

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// ── Extract briefing fields from user answer ───────────────────────────────
async function extractBriefingFields(
    questionField: string,
    userAnswer: string
): Promise<Partial<BriefingAccumulated>> {
    const prompt = `Você é um assistente que extrai dados estruturados de respostas em linguagem natural.

Campo a extrair: "${questionField}"
Resposta do usuário: "${userAnswer}"

Retorne APENAS um JSON válido plano (sem markdown, sem chave wrapper) com os campos relevantes preenchidos.
Use exatamente estas chaves no JSON de resposta conforme o campo:

- "expert_name_bio" → retorne: { "expert_name": "nome completo", "expert_bio": "área de atuação e especialização" }
- "pain_promise" → retorne: { "audience_pain_points": ["dor1", "dor2"], "main_promise": "promessa principal" }
- "audience" → retorne: { "target_audience": "descrição do público", "audience_desires": ["desejo1"] }
- "method" → retorne: { "differentiation": "diferencial do método", "main_benefit": "principal benefício" }
- "results" → retorne: { "expert_credentials": ["resultado1 com número/impacto", "resultado2"] }
- "product" → retorne: { "product_name": "nome do produto", "product_description": "descrição", "product_price": número_ou_null }
- "objection" → retorne: { "audience_objections": ["objeção 1", "objeção 2"] }

IMPORTANTE: Retorne SOMENTE o JSON interno, sem wrapper. Exemplo para "expert_name_bio":
{"expert_name": "João Silva", "expert_bio": "Nutricionista especializado em emagrecimento hormonal"}

Resposta SOMENTE em JSON plano.`;

    try {
        const raw = await callGemini(prompt);
        console.log('[Onboarding] Raw Gemini response:', raw);
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        let parsed = JSON.parse(cleaned);

        // Auto-flatten if Gemini wrapped in a single key (e.g., {expert_name_bio: {...}})
        const keys = Object.keys(parsed);
        if (keys.length === 1 && typeof parsed[keys[0]] === 'object' && !Array.isArray(parsed[keys[0]])) {
            console.log('[Onboarding] Auto-flattening nested response');
            parsed = parsed[keys[0]];
        }

        console.log('[Onboarding] Parsed extraction:', parsed);
        return parsed;
    } catch (e) {
        console.error('[Onboarding] extractBriefingFields failed:', e);
        return {};
    }
}

// ── Generate immersion structure ───────────────────────────────────────────
async function generateImmersionStructure(
    briefing: BriefingAccumulated
): Promise<GeneratedStructure> {
    const prompt = `Você é um estrategista de lançamentos digitais especialista em imersões de alto impacto.

Com base no briefing abaixo, crie a estrutura completa de uma imersão de vendas de 1 dia.

BRIEFING:
- Expert: ${briefing.expert_name} — ${briefing.expert_bio}
- Problema resolvido: ${briefing.audience_pain_points?.join(', ')}
- Público: ${briefing.target_audience}
- Método/Diferencial: ${briefing.differentiation}
- Resultados: ${briefing.expert_credentials?.join(', ')}
- Produto: ${briefing.product_name} (${briefing.product_description}) - R$ ${briefing.product_price}
- Principal objeção: ${briefing.audience_objections?.join(', ')}

Retorne SOMENTE um JSON válido (sem markdown) com esta estrutura exata:

{
  "narrative": "Texto completo de abertura da imersão (2-3 parágrafos, primeira pessoa, engajante)",
  "blocks": [
    { "title": "Bloco 1: Nome do bloco", "description": "O que vai acontecer neste bloco (2 frases)", "exercise": "Exercício prático para o público fazer (1 frase)" },
    { "title": "Bloco 2: Nome do bloco", "description": "...", "exercise": "..." },
    { "title": "Bloco 3: Nome do bloco", "description": "...", "exercise": "..." }
  ],
  "diagnostic": "Perguntas de diagnóstico que o expert faz para o público entender o próprio problema (3-5 perguntas poderosas)",
  "offer_script": "Script de apresentação da oferta no final da imersão (200-300 palavras, natural, sem pressão excessiva)",
  "briefing_summary": "Resumo executivo do briefing em 3 frases para a equipe de marketing"
}`;

    try {
        const raw = await callGemini(prompt);
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleaned);
    } catch {
        return {
            narrative: 'Estrutura gerada. Revise e personalize conforme necessário.',
            blocks: [
                { title: 'Bloco 1: Diagnóstico', description: 'Identificar o problema raiz do público.', exercise: 'Exercício de auto-avaliação.' },
                { title: 'Bloco 2: Método', description: 'Apresentar o caminho único.', exercise: 'Mapeamento de obstáculos.' },
                { title: 'Bloco 3: Solução', description: 'Mostrar o produto como próximo passo.', exercise: 'Plano de ação.' },
            ],
            diagnostic: 'Quais desafios você enfrenta? Já tentou resolver? O que impediu?',
            offer_script: 'Agora que você entendeu o caminho, deixa eu te apresentar como podemos acelerar isso juntos...',
            briefing_summary: 'Expert referência na área. Público com problema urgente. Produto estruturado e com resultados comprovados.',
        };
    }
}

// ── Main Component ─────────────────────────────────────────────────────────
export function ConciergeOnboarding() {
    const { activeTenant } = useAuthStore() as any;
    const { setCurrentPage } = useUIStore() as any;
    const [phase, setPhase] = useState<0 | 1 | 2 | 3 | 4>(0);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [questionIndex, setQuestionIndex] = useState(0);
    const [isTyping, setIsTyping] = useState(false);
    const [briefing, setBriefing] = useState<BriefingAccumulated>({});
    const [structure, setStructure] = useState<GeneratedStructure | null>(null);
    const [briefingId, setBriefingId] = useState<string | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [existingBriefing, setExistingBriefing] = useState<any>(null);
    const [loadingBriefing, setLoadingBriefing] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Check if tenant already has a completed briefing
    useEffect(() => {
        if (!activeTenant?.id) { setLoadingBriefing(false); return; }
        setLoadingBriefing(true);
        supabase.from('briefings' as any)
            .select('id, expert_name, product_name, created_at, updated_at, status')
            .eq('tenant_id', activeTenant.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .single()
            .then(({ data, error }: { data: any; error: any }) => {
                // Only mark as completed if there's actual content (not just a placeholder row)
                if (!error && data && data.expert_name) setExistingBriefing(data);
                setLoadingBriefing(false);
            });
    }, [activeTenant?.id]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => { scrollToBottom(); }, [messages]);

    // Reset the main scroll container to top on every phase change
    // This prevents the black gap caused by browser auto-scrolling main when textarea gets focus
    useEffect(() => {
        const main = document.getElementById('main-scroll-container');
        if (main) main.scrollTop = 0;
    }, [phase]);

    // Start phase 1 — send first question
    const startOnboarding = () => {
        setPhase(1);
        const firstQ = QUESTIONS[0];
        setTimeout(() => {
            addAgentMessage(firstQ.agentMessage);
        }, 400);
    };

    const addAgentMessage = (content: string) => {
        setMessages(prev => [...prev, {
            role: 'agent',
            content,
            timestamp: new Date(),
        }]);
    };

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;

        const userText = input.trim();
        setInput('');

        // Add user message
        setMessages(prev => [...prev, {
            role: 'user',
            content: userText,
            timestamp: new Date(),
        }]);

        setIsTyping(true);

        // Extract fields from this answer
        const currentQ = QUESTIONS[questionIndex];
        const extracted = await extractBriefingFields(currentQ.field, userText);
        const newBriefing = { ...briefing, ...extracted };
        setBriefing(newBriefing);

        // Only save if we got actual data from the AI
        const hasData = Object.keys(extracted).length > 0;
        console.log('[Onboarding] hasData:', hasData, 'newBriefing:', newBriefing);

        // Whitelist of valid briefings table columns  
        const VALID_COLUMNS = new Set([
            'expert_name', 'expert_bio', 'expert_photo_url', 'expert_credentials',
            'product_name', 'product_description', 'product_price', 'product_installments',
            'product_bonuses', 'product_guarantee',
            'target_audience', 'audience_pain_points', 'audience_desires', 'audience_objections',
            'main_promise', 'main_benefit', 'differentiation',
            'voice_tones', 'words_to_use', 'words_to_avoid',
            'framework_page', 'framework_email', 'framework_whatsapp',
            'status', 'tenant_id', 'launch_id', 'updated_at',
        ]);
        const safePayload = Object.fromEntries(
            Object.entries(newBriefing).filter(([k]) => VALID_COLUMNS.has(k))
        );

        // Auto-save partial briefing to Supabase
        if (activeTenant?.id && hasData) {
            try {
                if (!briefingId) {
                    const { data, error } = await (supabase
                        .from('briefings') as any)
                        .insert({ tenant_id: activeTenant.id, status: 'draft', ...safePayload })
                        .select()
                        .single();
                    if (error) console.error('Insert error:', error);
                    else console.log('[Onboarding] Inserted briefing id:', (data as any)?.id);
                    if (data) setBriefingId((data as any).id);
                } else {
                    const { error } = await (supabase.from('briefings') as any)
                        .update({ ...safePayload, updated_at: new Date().toISOString() })
                        .eq('id', briefingId);
                    if (error) console.error('Update error:', error);
                    else console.log('[Onboarding] Updated briefing:', briefingId);
                }
            } catch (e: any) {
                console.warn('Auto-save failed:', e);
            }
        }

        const nextIndex = questionIndex + 1;

        if (nextIndex < QUESTIONS.length) {
            // Next question
            await new Promise(r => setTimeout(r, 800));
            const nextQ = QUESTIONS[nextIndex];

            // Acknowledge answer briefly
            const acks = [
                'Ótimo! 🙌',
                'Perfeito, entendido.',
                'Muito bem! Isso ajuda muito.',
                'Excelente! Cada detalhe conta.',
                'Incrível, obrigado pela clareza!',
                'Poderoso! Seguindo...',
                '💡 Muito rico esse detalhe.',
            ];
            const ack = acks[questionIndex % acks.length];
            addAgentMessage(`${ack}\n\n${nextQ.agentMessage}`);
            setQuestionIndex(nextIndex);
        } else {
            // All questions done → phase 2
            addAgentMessage('Perfeito! Já tenho tudo que preciso. 🎯\n\n**Analisando suas respostas e montando a estrutura da sua imersão...**\n\nIsse pode levar alguns segundos.');
            await new Promise(r => setTimeout(r, 1200));
            setPhase(2);
            await runAnalysis(newBriefing);
        }

        setIsTyping(false);
    };

    const runAnalysis = async (finalBriefing: BriefingAccumulated) => {
        // Generate structure
        const gen = await generateImmersionStructure(finalBriefing);
        setStructure(gen);

        // Final save with structure in metadata
        if (activeTenant?.id) {
            try {
                const payload = {
                    ...finalBriefing,
                    status: 'draft',
                    updated_at: new Date().toISOString(),
                } as any;
                if (briefingId) {
                    await (supabase.from('briefings') as any).update(payload).eq('id', briefingId);
                } else {
                    const { data } = await (supabase
                        .from('briefings') as any)
                        .insert({ tenant_id: activeTenant.id, ...payload })
                        .select().single();
                    if (data) setBriefingId((data as any).id);
                }
            } catch (e) {
                console.warn('Final save failed:', e);
            }
        }

        setPhase(3);
    };

    const finalize = () => {
        setShowConfetti(true);
        setPhase(4);
        setTimeout(() => setShowConfetti(false), 4000);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const progress = phase === 1 ? Math.round((questionIndex / QUESTIONS.length) * 100) : phase >= 2 ? 100 : 0;

    // ── PHASE 0: Intro / Already Done ──────────────────────────────────────
    if (phase === 0) {
        // Loading state
        if (loadingBriefing) {
            return (
                <div className="h-[100dvh] bg-gradient-to-br from-slate-950 via-violet-950/30 to-slate-950 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                </div>
            );
        }

        // Already completed onboarding
        if (existingBriefing) {
            const completedAt = existingBriefing.updated_at
                ? new Date(existingBriefing.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
                : null;
            return (
                <div className="h-[100dvh] bg-gradient-to-br from-slate-950 via-violet-950/30 to-slate-950 flex items-center justify-center p-4 sm:p-6">
                    <div className="max-w-2xl w-full">
                        <div className="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-5 sm:p-8 backdrop-blur-sm shadow-2xl">
                            {/* Success Header */}
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center flex-shrink-0">
                                    <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                                </div>
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">Onboarding Concluído!</h1>
                                    <p className="text-emerald-400 text-sm mt-0.5">Sua imersão já foi estruturada pela IA ✨</p>
                                </div>
                            </div>

                            {/* Summary Card */}
                            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-6 space-y-3">
                                {existingBriefing.expert_name && (
                                    <div className="flex items-center gap-3">
                                        <User className="w-4 h-4 text-violet-400 flex-shrink-0" />
                                        <div>
                                            <p className="text-xs text-slate-400">Expert</p>
                                            <p className="text-white font-semibold text-sm">{existingBriefing.expert_name}</p>
                                        </div>
                                    </div>
                                )}
                                {existingBriefing.product_name && (
                                    <div className="flex items-center gap-3">
                                        <Layers className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                        <div>
                                            <p className="text-xs text-slate-400">Produto</p>
                                            <p className="text-white font-semibold text-sm">{existingBriefing.product_name}</p>
                                        </div>
                                    </div>
                                )}
                                {completedAt && (
                                    <div className="flex items-center gap-3">
                                        <Star className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                        <div>
                                            <p className="text-xs text-slate-400">Atualizado em</p>
                                            <p className="text-white font-semibold text-sm">{completedAt}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Status info */}
                            <div className="bg-gradient-to-r from-emerald-500/10 to-violet-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6">
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    Seu briefing está pronto e a Timeline de 7 Semanas foi gerada automaticamente.
                                    Você pode <strong className="text-white">editar os detalhes</strong> no Briefing do Expert ou
                                    <strong className="text-white"> refazer o onboarding</strong> do zero.
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button
                                    onClick={() => setCurrentPage('briefing')}
                                    className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-3 text-sm rounded-xl shadow-lg shadow-violet-500/20 transition-all duration-200 group"
                                >
                                    <FileText className="w-4 h-4 mr-2" />
                                    Ver Briefing Completo
                                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </Button>
                                <Button
                                    onClick={() => setExistingBriefing(null)}
                                    variant="outline"
                                    className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white py-3 text-sm rounded-xl transition-all"
                                >
                                    <Wand2 className="w-4 h-4 mr-2" />
                                    Refazer Onboarding
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // First time — original 'Antes de começar' intro
        return (
            <div className="h-[100dvh] bg-gradient-to-br from-slate-950 via-violet-950/30 to-slate-950 flex items-center justify-center p-4 sm:p-6">
                <div className="max-w-2xl w-full">
                    {/* Main card — no top logo badge, no pill badge */}
                    <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-5 sm:p-8 backdrop-blur-sm shadow-2xl">
                        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 leading-tight">
                            Antes de começar
                        </h1>

                        <p className="text-slate-400 text-sm mb-5 leading-relaxed">
                            Você vai construir, junto com a IA, o roteiro da sua imersão.
                        </p>

                        <div className="space-y-3 mb-6">
                            <p className="text-slate-300 text-sm leading-relaxed">
                                Uma imersão não é apenas uma aula longa. Ela é um evento estruturado para três coisas acontecerem ao mesmo tempo:
                            </p>

                            {[
                                {
                                    num: '01',
                                    title: 'Gerar valor real para quem participa',
                                    desc: 'O participante aprende algo útil, ganha clareza e tem pequenos insights aplicáveis.',
                                    color: 'from-emerald-500/20 to-emerald-500/5',
                                    border: 'border-emerald-500/20',
                                    text: 'text-emerald-400',
                                },
                                {
                                    num: '02',
                                    title: 'Elevar o nível de consciência sobre o problema',
                                    desc: 'Ao longo da imersão, a pessoa entende melhor a origem do problema e por que as tentativas anteriores falharam.',
                                    color: 'from-blue-500/20 to-blue-500/5',
                                    border: 'border-blue-500/20',
                                    text: 'text-blue-400',
                                },
                                {
                                    num: '03',
                                    title: 'Apresentar um caminho estruturado de solução',
                                    desc: 'No final, você mostra que existe um método. A oferta não parece venda — é o próximo passo natural.',
                                    color: 'from-violet-500/20 to-violet-500/5',
                                    border: 'border-violet-500/20',
                                    text: 'text-violet-400',
                                },
                            ].map(item => (
                                <div key={item.num} className={`bg-gradient-to-r ${item.color} border ${item.border} rounded-xl p-3 flex gap-3`}>
                                    <span className={`font-bold text-base ${item.text} flex-shrink-0 mt-0.5`}>{item.num}</span>
                                    <div>
                                        <p className="text-white font-semibold text-sm mb-0.5">{item.title}</p>
                                        <p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-slate-700/50 pt-4">
                            <p className="text-slate-400 text-xs mb-3">
                                A IA vai te fazer <strong className="text-slate-200">7 perguntas</strong> para entender seu método, público e oferta. Com base nas suas respostas, ela vai montar a estrutura completa da sua imersão.
                            </p>
                            <Button
                                onClick={startOnboarding}
                                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-3.5 text-base rounded-xl shadow-lg shadow-violet-500/20 transition-all duration-200 group"
                            >
                                Iniciar minha imersão
                                <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── PHASE 1: Chat ───────────────────────────────────────────────────────
    if (phase === 1) {
        return (
            <div className="h-full overflow-hidden bg-gradient-to-br from-slate-950 via-violet-950/20 to-slate-950 flex flex-col">
                {/* Header */}
                <div className="flex-shrink-0 px-4 py-3 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-sm">
                    <div className="max-w-2xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                <Bot className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <p className="text-white text-sm font-semibold">Concierge de Imersão</p>
                                <p className="text-emerald-400 text-xs flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse inline-block" />
                                    Online
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-slate-400 text-xs mb-1">Pergunta {questionIndex + 1} de {QUESTIONS.length}</p>
                            <div className="w-32 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Messages — anchored to bottom like a real chat */}
                <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col justify-end">
                    <div className="max-w-2xl mx-auto w-full space-y-4">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                {msg.role === 'agent' ? (
                                    <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 shadow-lg shadow-violet-500/20">
                                        <Bot className="w-4 h-4 text-white" />
                                    </div>
                                ) : (
                                    <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                                        <User className="w-4 h-4 text-slate-300" />
                                    </div>
                                )}
                                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'agent'
                                    ? 'bg-slate-800/80 text-slate-200 border border-slate-700/50'
                                    : 'bg-violet-600/20 text-white border border-violet-500/30'
                                    }`}
                                    dangerouslySetInnerHTML={{
                                        __html: msg.content
                                            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                                            .replace(/\*(.*?)\*/g, '<em class="text-slate-400">$1</em>')
                                            .replace(/\n/g, '<br/>')
                                    }}
                                />
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Bot className="w-4 h-4 text-white" />
                                </div>
                                <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl px-4 py-3 flex items-center gap-1">
                                    {[0, 1, 2].map(i => (
                                        <span key={i} className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                                    ))}
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input */}
                <div className="flex-shrink-0 px-4 pb-6 pt-2 bg-slate-950/80 backdrop-blur-sm border-t border-slate-800/50">
                    <div className="max-w-2xl mx-auto">
                        <p className="text-slate-500 text-xs mb-2 px-1">
                            💡 {QUESTIONS[questionIndex]?.hint}
                        </p>
                        <div className="flex gap-2">
                            <Textarea
                                ref={textareaRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onFocus={e => {
                                    // Prevent browser from auto-scrolling container on textarea focus
                                    const resetScroll = (el: Element | null) => {
                                        while (el) {
                                            if (el.scrollTop !== 0) el.scrollTop = 0;
                                            el = el.parentElement;
                                        }
                                    };
                                    setTimeout(() => resetScroll(e.currentTarget.parentElement), 0);
                                }}
                                placeholder="Digite sua resposta aqui... (Enter para enviar)"
                                className="flex-1 bg-slate-800/80 border-slate-700/50 text-white placeholder:text-slate-500 resize-none min-h-[56px] max-h-32 rounded-xl text-sm focus:border-violet-500/50"
                                rows={2}
                                disabled={isTyping}
                            />
                            <Button
                                onClick={handleSend}
                                disabled={!input.trim() || isTyping}
                                className="bg-violet-600 hover:bg-violet-500 text-white px-4 self-end h-[56px] w-[56px] rounded-xl shadow-lg shadow-violet-500/20 flex-shrink-0"
                            >
                                {isTyping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── PHASE 2: Analyzing ──────────────────────────────────────────────────
    if (phase === 2) {
        return (
            <div className="h-[100dvh] bg-gradient-to-br from-slate-950 via-violet-950/30 to-slate-950 flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-violet-500/30 animate-pulse">
                        <Wand2 className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">Montando sua imersão...</h2>
                    <p className="text-slate-400 mb-8">
                        A IA está analisando suas respostas e criando a estrutura completa da sua imersão. Isso pode levar alguns segundos.
                    </p>
                    <div className="space-y-3">
                        {[
                            'Analisando seu perfil e método...',
                            'Mapeando o público e objeções...',
                            'Estruturando os blocos de conteúdo...',
                            'Criando o script de oferta...',
                        ].map((step, i) => (
                            <div key={i} className="flex items-center gap-3 bg-slate-800/50 rounded-xl px-4 py-3 border border-slate-700/30">
                                <Loader2 className="w-4 h-4 text-violet-400 animate-spin flex-shrink-0" />
                                <span className="text-slate-300 text-sm">{step}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ── PHASE 3: Results ────────────────────────────────────────────────────
    if (phase === 3 && structure) {
        return (
            <div className="h-[100dvh] overflow-y-auto bg-gradient-to-br from-slate-950 via-violet-950/20 to-slate-950 p-4 sm:p-6">
                <div className="max-w-3xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-semibold mb-4">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Estrutura gerada com sucesso
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                            Sua Imersão está pronta 🎯
                        </h1>
                        <p className="text-slate-400">
                            Aqui está a estrutura completa criada com base no seu briefing.
                        </p>
                    </div>

                    <div className="space-y-5">
                        {/* Profile card */}
                        <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm">
                            <div className="flex items-center gap-2 mb-3">
                                <Star className="w-4 h-4 text-amber-400" />
                                <h3 className="text-white font-semibold text-sm">Resumo do Briefing</h3>
                            </div>
                            <p className="text-slate-300 text-sm leading-relaxed">{structure.briefing_summary}</p>
                            <div className="mt-3 pt-3 border-t border-slate-700/30 grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {briefing.expert_name && (
                                    <div>
                                        <p className="text-slate-500 text-xs">Expert</p>
                                        <p className="text-white text-sm font-medium">{briefing.expert_name}</p>
                                    </div>
                                )}
                                {briefing.product_name && (
                                    <div>
                                        <p className="text-slate-500 text-xs">Produto</p>
                                        <p className="text-white text-sm font-medium">{briefing.product_name}</p>
                                    </div>
                                )}
                                {briefing.product_price && (
                                    <div>
                                        <p className="text-slate-500 text-xs">Investimento</p>
                                        <p className="text-emerald-400 text-sm font-bold">R$ {briefing.product_price.toLocaleString('pt-BR')}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Narrative */}
                        <div className="bg-slate-900/80 border border-violet-500/20 rounded-2xl p-5 backdrop-blur-sm">
                            <div className="flex items-center gap-2 mb-3">
                                <FileText className="w-4 h-4 text-violet-400" />
                                <h3 className="text-white font-semibold text-sm">Abertura da Imersão</h3>
                            </div>
                            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{structure.narrative}</p>
                        </div>

                        {/* Blocks */}
                        <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <Layers className="w-4 h-4 text-blue-400" />
                                <h3 className="text-white font-semibold text-sm">Blocos de Conteúdo</h3>
                            </div>
                            <div className="space-y-4">
                                {structure.blocks.map((block, i) => (
                                    <div key={i} className="border-l-2 border-violet-500/40 pl-4">
                                        <p className="text-white font-semibold text-sm mb-1">{block.title}</p>
                                        <p className="text-slate-400 text-sm mb-2">{block.description}</p>
                                        {block.exercise && (
                                            <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-2">
                                                <p className="text-violet-300 text-xs">
                                                    <span className="font-semibold">✏️ Exercício:</span> {block.exercise}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Diagnostic */}
                        <div className="bg-slate-900/80 border border-amber-500/20 rounded-2xl p-5 backdrop-blur-sm">
                            <div className="flex items-center gap-2 mb-3">
                                <Target className="w-4 h-4 text-amber-400" />
                                <h3 className="text-white font-semibold text-sm">Diagnóstico do Público</h3>
                            </div>
                            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{structure.diagnostic}</p>
                        </div>

                        {/* Offer script */}
                        <div className="bg-slate-900/80 border border-emerald-500/20 rounded-2xl p-5 backdrop-blur-sm">
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles className="w-4 h-4 text-emerald-400" />
                                <h3 className="text-white font-semibold text-sm">Script da Oferta Final</h3>
                            </div>
                            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{structure.offer_script}</p>
                        </div>

                        {/* CTA */}
                        <div className="flex gap-3 pb-6">
                            <Button
                                onClick={finalize}
                                className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-4 rounded-xl text-base shadow-lg shadow-violet-500/20 group"
                            >
                                Salvar e Finalizar
                                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── PHASE 4: Done ───────────────────────────────────────────────────────
    if (phase === 4) {
        return (
            <div className="h-full overflow-hidden bg-gradient-to-br from-slate-950 via-violet-950/30 to-slate-950 flex items-center justify-center p-4 relative">
                {/* Confetti effect */}
                {showConfetti && (
                    <div className="absolute inset-0 pointer-events-none">
                        {Array.from({ length: 30 }).map((_, i) => (
                            <div
                                key={i}
                                className="absolute w-2 h-2 rounded-sm animate-bounce"
                                style={{
                                    left: `${Math.random() * 100}%`,
                                    top: `${Math.random() * 100}%`,
                                    background: ['#8b5cf6', '#6366f1', '#10b981', '#f59e0b', '#ec4899'][Math.floor(Math.random() * 5)],
                                    animationDelay: `${Math.random() * 1}s`,
                                    animationDuration: `${0.5 + Math.random() * 1}s`,
                                }}
                            />
                        ))}
                    </div>
                )}

                <div className="text-center max-w-md">
                    <div className="text-5xl mb-6 animate-bounce">🎉</div>
                    <h1 className="text-3xl font-bold text-white mb-3">Incrível!</h1>
                    <p className="text-slate-400 text-lg mb-4">
                        Seu briefing foi salvo e a estrutura da sua imersão está pronta.
                    </p>
                    <p className="text-slate-500 text-sm mb-8">
                        Você pode acessar e editar tudo isso na seção <strong className="text-violet-400">Briefing do Expert</strong> a qualquer momento.
                    </p>

                    <div className="bg-slate-800/50 border border-slate-700/30 rounded-2xl p-5 mb-6 text-left space-y-3">
                        {[
                            { icon: '✅', text: 'Briefing primário salvo no banco de dados' },
                            { icon: '🗂️', text: 'Estrutura da imersão gerada pela IA' },
                            { icon: '🎯', text: 'Script de oferta personalizado criado' },
                            { icon: '🚀', text: 'Pronto para sua equipe começar' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className="text-lg">{item.icon}</span>
                                <span className="text-slate-300 text-sm">{item.text}</span>
                            </div>
                        ))}
                    </div>

                    <Button
                        onClick={() => {
                            useUIStore.getState().setCurrentPage('briefing');
                        }}
                        className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-4 text-base rounded-xl shadow-lg shadow-violet-500/20"
                    >
                        Ver Briefing Completo
                        <ChevronRight className="ml-2 w-5 h-5" />
                    </Button>
                </div>
            </div>
        );
    }

    return null;
}
