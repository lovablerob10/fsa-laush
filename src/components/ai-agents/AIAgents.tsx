import { useState, useCallback, useRef, useEffect } from 'react';
import {
    Bot, Loader2, Copy, Check, X, Send, Clock, Zap, ChevronRight,
    Mail, Film, Pen, Search, Palette, Eye, Pencil, Trash2, ArrowLeft, Database
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store';
import { briefingService, BriefingData } from '@/lib/services/briefingService';
import {
    AI_AGENTS, AIAgent, AgentExecution, runAgent, generateImage,
    AgentExecutionDB, saveExecution, fetchExecutions,
    updateExecutionTitle, deleteExecution, fetchDossieContext,
    scrapeUrl, formatScrapedContent
} from '@/lib/services/agentService';

const AGENT_ICONS: Record<string, React.ElementType> = {
    emilio: Mail,
    picasso: Film,
    cicero: Pen,
    pluto: Search,
    cosmo: Palette,
};

export function AIAgents() {
    const { activeTenant } = useAuthStore() as any;
    const tenantId = activeTenant?.id;

    const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
    const [userInput, setUserInput] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [history, setHistory] = useState<AgentExecutionDB[]>([]);
    const [briefing, setBriefing] = useState<BriefingData | null>(null);
    const [briefingLoaded, setBriefingLoaded] = useState(false);
    const [dossieContext, setDossieContext] = useState<string>('');
    const [viewingHistoryId, setViewingHistoryId] = useState<string | null>(null);
    const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
    const [generatedImage, setGeneratedImage] = useState<{ base64: string; mimeType: string } | null>(null);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const titleInputRef = useRef<HTMLInputElement>(null);

    // Load briefing + dossiê on first interaction
    const ensureBriefing = useCallback(async () => {
        if (briefingLoaded || !tenantId) return;
        const [b, dossie] = await Promise.all([
            briefingService.fetchByTenant(tenantId),
            fetchDossieContext(tenantId),
        ]);
        setBriefing(b);
        setDossieContext(dossie);
        setBriefingLoaded(true);
    }, [tenantId, briefingLoaded]);

    // Load history from DB when agent is selected
    const loadHistory = useCallback(async (agentId?: string) => {
        if (!tenantId) return;
        const executions = await fetchExecutions(tenantId, agentId);
        setHistory(executions);
    }, [tenantId]);

    const handleSelectAgent = async (agent: AIAgent) => {
        setSelectedAgent(agent);
        setResult(null);
        setUserInput('');
        setCopied(false);
        setGeneratedImage(null);
        setViewingHistoryId(null);
        await ensureBriefing();
        await loadHistory(agent.id);
    };

    const handleRun = async () => {
        if (!selectedAgent || isRunning) return;

        const fallbackBriefing: BriefingData = briefing || { tenant_id: tenantId || '' };
        setIsRunning(true);
        setResult(null);
        setCopied(false);

        try {
            // If Picasso agent and input looks like a URL, scrape real content first
            let enrichedDossieContext = dossieContext;
            const urlPattern = /https?:\/\/[^\s]+/i;
            if (selectedAgent.id === 'picasso' && urlPattern.test(userInput)) {
                const urlMatch = userInput.match(urlPattern);
                if (urlMatch) {
                    setResult('🔍 Buscando conteúdo real da URL...');
                    const scrapedData = await scrapeUrl(urlMatch[0]);
                    if (scrapedData) {
                        const formattedContent = formatScrapedContent(scrapedData);
                        enrichedDossieContext = enrichedDossieContext
                            ? `${enrichedDossieContext}\n\n${formattedContent}`
                            : formattedContent;
                    }
                    setResult('🤖 Analisando conteúdo extraído...');
                }
            }

            const { output, durationMs } = await runAgent(selectedAgent.id, fallbackBriefing, userInput, enrichedDossieContext);
            setResult(output);

            // Save to database
            if (tenantId) {
                const saved = await saveExecution(
                    tenantId, selectedAgent.id, selectedAgent.name,
                    userInput || undefined, output, durationMs
                );
                if (saved) {
                    setHistory(prev => [saved, ...prev].slice(0, 20));
                }
            }
        } catch (err: any) {
            setResult(`❌ Erro: ${err.message}`);
        } finally {
            setIsRunning(false);
        }
    };

    const handleGenerateImage = async () => {
        if (!selectedAgent || isGeneratingImage) return;
        const prompt = userInput || 'Professional marketing banner for a digital product launch, modern gradient design, vibrant colors, premium feel';
        setIsGeneratingImage(true);
        setGeneratedImage(null);

        try {
            const { imageBase64, mimeType, durationMs } = await generateImage(prompt, '1:1');
            setGeneratedImage({ base64: imageBase64, mimeType });

            // Save image execution to database
            if (tenantId) {
                const imageDataUrl = `data:${mimeType};base64,${imageBase64}`;
                const saved = await saveExecution(
                    tenantId, selectedAgent.id, selectedAgent.name,
                    prompt, `🖼️ Imagem gerada: ${prompt}`, durationMs,
                    imageDataUrl, 'nano-banana-3.1'
                );
                if (saved) {
                    setHistory(prev => [saved, ...prev].slice(0, 20));
                }
            }
        } catch (err: any) {
            setResult(`❌ Erro ao gerar imagem: ${err.message}`);
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const handleCopy = () => {
        const textToCopy = viewingHistoryId
            ? history.find(h => h.id === viewingHistoryId)?.output
            : result;
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleViewHistory = (exec: AgentExecutionDB) => {
        const agent = AI_AGENTS.find(a => a.id === exec.agent_id);
        if (agent) {
            setSelectedAgent(agent);
            setViewingHistoryId(exec.id);
            setResult(null);
            setUserInput(exec.input || '');
            setCopied(false);
            // Show image if execution has one
            if (exec.image_url) {
                const match = exec.image_url.match(/^data:(image\/[^;]+);base64,(.+)$/);
                if (match) {
                    setGeneratedImage({ base64: match[2], mimeType: match[1] });
                }
            } else {
                setGeneratedImage(null);
            }
        }
    };

    const handleBackFromHistory = () => {
        setViewingHistoryId(null);
        setResult(null);
    };

    const handleRenameHistory = async (execId: string, newTitle: string) => {
        setHistory(prev => prev.map(h =>
            h.id === execId ? { ...h, title: newTitle } : h
        ));
        setEditingTitleId(null);
        // Persist to database
        await updateExecutionTitle(execId, newTitle);
    };

    const handleDeleteHistory = async (execId: string) => {
        setHistory(prev => prev.filter(h => h.id !== execId));
        if (viewingHistoryId === execId) {
            setViewingHistoryId(null);
            setResult(null);
        }
        // Persist to database
        await deleteExecution(execId);
    };

    const geminiConfigured = !!import.meta.env.VITE_GEMINI_API_KEY;

    if (!tenantId) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center mx-auto mb-4 neon-glow">
                        <Bot className="w-8 h-8 text-violet-400" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground mb-2">Selecione um cliente</h2>
                    <p className="text-muted-foreground">Use o seletor na sidebar para escolher o cliente.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border">
                <div className="px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-3">
                            <Bot className="w-7 h-7 text-violet-500" />
                            Equipe IA
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            {AI_AGENTS.length} agentes prontos para trabalhar —
                            <span className="text-violet-500 dark:text-violet-400 font-medium ml-1">
                                {activeTenant?.name}
                            </span>
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border',
                            geminiConfigured
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                        )}>
                            <Zap className="w-3.5 h-3.5" />
                            {geminiConfigured ? 'Gemini API ativa' : 'API não configurada'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left: Agent Grid */}
                    <div className="lg:col-span-1 space-y-3">
                        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
                            Agentes Disponíveis
                        </h2>
                        {AI_AGENTS.map(agent => {
                            const Icon = AGENT_ICONS[agent.id] || Bot;
                            const isSelected = selectedAgent?.id === agent.id;
                            const isWorking = isRunning && isSelected;
                            const execCount = history.filter(h => h.agent_id === agent.id).length;

                            return (
                                <button
                                    key={agent.id}
                                    onClick={() => handleSelectAgent(agent)}
                                    className={cn(
                                        'w-full glass-card p-4 text-left transition-all duration-200 group',
                                        isSelected
                                            ? 'border-violet-500/40 shadow-lg shadow-violet-500/5'
                                            : 'hover:border-border'
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={cn(
                                            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br shadow-lg',
                                            agent.color
                                        )}>
                                            {isWorking ? (
                                                <Loader2 className="w-5 h-5 text-white animate-spin" />
                                            ) : (
                                                <Icon className="w-5 h-5 text-white" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-semibold text-foreground text-sm">{agent.name}</h3>
                                                {execCount > 0 && (
                                                    <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">
                                                        {execCount}x
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground font-medium">{agent.role}</p>
                                            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{agent.description}</p>
                                        </div>
                                        <ChevronRight className={cn(
                                            'w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform',
                                            isSelected && 'text-violet-500 rotate-90'
                                        )} />
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Right: Execution Panel */}
                    <div className="lg:col-span-2">
                        {selectedAgent ? (
                            <div className="glass-card overflow-hidden">
                                {/* Agent header */}
                                <div className="p-6 border-b border-border">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                'w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg',
                                                selectedAgent.color
                                            )}>
                                                {(() => { const I = AGENT_ICONS[selectedAgent.id] || Bot; return <I className="w-6 h-6 text-white" />; })()}
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-bold text-foreground">{selectedAgent.name}</h2>
                                                <p className="text-sm text-muted-foreground">{selectedAgent.role}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { setSelectedAgent(null); setResult(null); }}
                                            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Briefing notice */}
                                    {briefing ? (
                                        <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20">
                                            <Check className="w-3.5 h-3.5" />
                                            Briefing carregado: {briefing.expert_name || briefing.product_name || 'Draft'}
                                        </div>
                                    ) : (
                                        <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20">
                                            ⚠️ Preencha o Briefing do Expert para melhores resultados
                                        </div>
                                    )}
                                </div>

                                {/* Input area */}
                                <div className="p-6 border-b border-border">
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        {selectedAgent.inputLabel || 'Instrução'}
                                    </label>
                                    <div className="flex gap-3">
                                        <textarea
                                            value={userInput}
                                            onChange={e => setUserInput(e.target.value)}
                                            placeholder={selectedAgent.inputPlaceholder}
                                            rows={3}
                                            className="input-theme flex-1 resize-none"
                                        />
                                        <button
                                            onClick={handleRun}
                                            disabled={isRunning || !geminiConfigured}
                                            className={cn(
                                                'btn-premium flex items-center gap-2 self-end px-6',
                                                (isRunning || !geminiConfigured) && 'opacity-40 cursor-not-allowed'
                                            )}
                                        >
                                            {isRunning ? (
                                                <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
                                            ) : (
                                                <><Send className="w-4 h-4" /> Executar</>
                                            )}
                                        </button>
                                        {selectedAgent.id === 'cosmo' && (
                                            <button
                                                onClick={handleGenerateImage}
                                                disabled={isGeneratingImage || !geminiConfigured}
                                                className={cn(
                                                    'flex items-center gap-2 self-end px-5 py-2.5 rounded-xl font-semibold text-sm transition-all',
                                                    'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02]',
                                                    (isGeneratingImage || !geminiConfigured) && 'opacity-40 cursor-not-allowed'
                                                )}
                                            >
                                                {isGeneratingImage ? (
                                                    <><Loader2 className="w-4 h-4 animate-spin" /> Gerando Imagem...</>
                                                ) : (
                                                    <><Palette className="w-4 h-4" /> 🖼️ Gerar Imagem</>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Result area */}
                                <div className="p-6">
                                    {isRunning && (
                                        <div className="flex items-center justify-center py-16">
                                            <div className="text-center">
                                                <Loader2 className="w-8 h-8 text-violet-500 animate-spin mx-auto mb-4" />
                                                <p className="text-sm text-muted-foreground font-medium">
                                                    {selectedAgent.name} está trabalhando...
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Isso pode levar alguns segundos
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Image Generation Loading */}
                                    {isGeneratingImage && (
                                        <div className="flex items-center justify-center py-10 mb-4">
                                            <div className="text-center">
                                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-4 animate-pulse shadow-lg shadow-emerald-500/30">
                                                    <Palette className="w-8 h-8 text-white" />
                                                </div>
                                                <p className="text-sm text-muted-foreground font-medium">
                                                    🎨 Gerando imagem com Nano Banana...
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Isso pode levar 10-30 segundos
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Generated Image Display */}
                                    {generatedImage && !isGeneratingImage && (
                                        <div className="mb-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-xs font-semibold text-emerald-500 dark:text-emerald-400 flex items-center gap-1.5">
                                                    <Palette className="w-3.5 h-3.5" />
                                                    🖼️ Imagem gerada via Nano Banana
                                                </span>
                                                <a
                                                    href={`data:${generatedImage.mimeType};base64,${generatedImage.base64}`}
                                                    download="cosmo-creative.png"
                                                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-emerald-500 transition-colors px-2 py-1 rounded-lg hover:bg-secondary"
                                                >
                                                    ⬇️ Download
                                                </a>
                                            </div>
                                            <div className="bg-secondary/50 rounded-xl p-3 border border-border flex justify-center">
                                                <img
                                                    src={`data:${generatedImage.mimeType};base64,${generatedImage.base64}`}
                                                    alt="Imagem gerada pelo Cosmo"
                                                    className="max-w-full max-h-[500px] rounded-lg shadow-lg"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Viewing history content */}
                                    {viewingHistoryId && !isRunning && (() => {
                                        const histItem = history.find(h => h.id === viewingHistoryId);
                                        if (!histItem) return null;
                                        return (
                                            <div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={handleBackFromHistory}
                                                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-violet-500 transition-colors px-2 py-1 rounded-lg hover:bg-secondary"
                                                        >
                                                            <ArrowLeft className="w-3.5 h-3.5" />
                                                            Voltar
                                                        </button>
                                                        <span className="text-xs font-semibold text-amber-500 dark:text-amber-400 flex items-center gap-1.5">
                                                            <Eye className="w-3.5 h-3.5" />
                                                            Visualizando histórico — {histItem.title || histItem.agent_name}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={handleCopy}
                                                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-violet-500 transition-colors px-2 py-1 rounded-lg hover:bg-secondary"
                                                    >
                                                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                                        {copied ? 'Copiado!' : 'Copiar'}
                                                    </button>
                                                </div>
                                                <div className="bg-secondary/50 rounded-xl p-5 border border-border">
                                                    <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed max-h-[500px] overflow-y-auto">
                                                        {histItem.output}
                                                    </pre>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* New result */}
                                    {result && !isRunning && !viewingHistoryId && (
                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-xs font-semibold text-violet-500 dark:text-violet-400 flex items-center gap-1.5">
                                                    <Zap className="w-3.5 h-3.5" />
                                                    Gerado por {selectedAgent.name} via Gemini 2.5 Flash
                                                </span>
                                                <button
                                                    onClick={handleCopy}
                                                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-violet-500 transition-colors px-2 py-1 rounded-lg hover:bg-secondary"
                                                >
                                                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                                    {copied ? 'Copiado!' : 'Copiar'}
                                                </button>
                                            </div>
                                            <div className="bg-secondary/50 rounded-xl p-5 border border-border">
                                                <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed max-h-[500px] overflow-y-auto">
                                                    {result}
                                                </pre>
                                            </div>
                                        </div>
                                    )}

                                    {!result && !isRunning && !viewingHistoryId && (
                                        <div className="flex items-center justify-center py-16 text-center">
                                            <div>
                                                <div className="text-4xl mb-4">{selectedAgent.emoji}</div>
                                                <p className="text-sm text-muted-foreground font-medium">
                                                    Pronto para executar
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Adicione instruções ou clique "Executar" para usar o prompt padrão
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* Empty state */
                            <div className="glass-card flex items-center justify-center min-h-[500px]">
                                <div className="text-center">
                                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-violet-500/20 neon-glow">
                                        <Bot className="w-10 h-10 text-white" />
                                    </div>
                                    <h2 className="text-xl font-bold text-foreground mb-2">Selecione um Agente</h2>
                                    <p className="text-muted-foreground text-sm max-w-md">
                                        Escolha um agente à esquerda para começar a gerar conteúdo para o lançamento do seu Expert.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Activity History */}
                        {history.length > 0 && (
                            <div className="mt-6">
                                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Clock className="w-4 h-4" /> Histórico de Atividade
                                </h3>
                                <div className="space-y-2">
                                    {history.slice(0, 10).map(exec => {
                                        const agent = AI_AGENTS.find(a => a.id === exec.agent_id);
                                        const isViewing = viewingHistoryId === exec.id;
                                        const isEditingTitle = editingTitleId === exec.id;
                                        return (
                                            <div
                                                key={exec.id}
                                                onClick={() => handleViewHistory(exec)}
                                                className={cn(
                                                    'glass-card p-3 flex items-center gap-3 cursor-pointer transition-all duration-200 hover:border-violet-500/30 hover:shadow-md group',
                                                    isViewing && 'border-violet-500/40 bg-violet-500/5 shadow-md'
                                                )}
                                            >
                                                <div className={cn(
                                                    'w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br flex-shrink-0',
                                                    agent?.color || 'from-gray-500 to-gray-600'
                                                )}>
                                                    <span className="text-sm">{agent?.emoji || '🤖'}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    {isEditingTitle ? (
                                                        <input
                                                            ref={titleInputRef}
                                                            type="text"
                                                            defaultValue={exec.title || exec.agent_name}
                                                            className="input-theme text-sm py-1 px-2 w-full"
                                                            autoFocus
                                                            onClick={e => e.stopPropagation()}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') handleRenameHistory(exec.id, (e.target as HTMLInputElement).value);
                                                                if (e.key === 'Escape') setEditingTitleId(null);
                                                            }}
                                                            onBlur={e => handleRenameHistory(exec.id, e.target.value)}
                                                        />
                                                    ) : (
                                                        <>
                                                            <p className="text-sm font-medium text-foreground flex items-center gap-1">
                                                                {exec.title || exec.agent_name}
                                                                <span className="text-muted-foreground font-normal"> — </span>
                                                                <span className="text-muted-foreground text-xs truncate">
                                                                    {exec.output.slice(0, 50)}...
                                                                </span>
                                                            </p>
                                                            <p className="text-[11px] text-muted-foreground">
                                                                {new Date(exec.created_at).toLocaleTimeString('pt-BR')} · {((exec.duration_ms || 0) / 1000).toFixed(1)}s
                                                            </p>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setEditingTitleId(exec.id); }}
                                                        title="Renomear"
                                                        className="p-1 rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-violet-500 hover:bg-violet-500/10 transition-all"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); handleDeleteHistory(exec.id); }}
                                                        title="Excluir"
                                                        className="p-1 rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    {isViewing ? (
                                                        <Eye className="w-4 h-4 text-violet-500" />
                                                    ) : (
                                                        <Check className="w-4 h-4 text-emerald-500" />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
