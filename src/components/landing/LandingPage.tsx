import { useState, useEffect, useRef } from 'react';
import UnicornScene from 'unicornstudio-react';
import { Rocket, ArrowRight, CheckCircle2, Zap, Users, MessageSquare, Brain, BarChart3, Shield, Clock, Target, TrendingUp, ChevronRight, Menu, X, Send, Star } from 'lucide-react';

interface LandingPageProps {
    onEnterApp: () => void;
}

/* ──────────────────────────────── helpers ──────────────────────────────── */

function useScrollReveal() {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const node = ref.current;
        if (!node) return;
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) {
                        e.target.classList.add('lp-in-view');
                        observer.unobserve(e.target);
                    }
                });
            },
            { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
        );
        node.querySelectorAll('[data-lp-reveal]').forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, []);
    return ref;
}

/* ──────────────────── component ──────────────────── */

export function LandingPage({ onEnterApp }: LandingPageProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [formData, setFormData] = useState({ name: '', email: '', whatsapp: '' });
    const [formSubmitted, setFormSubmitted] = useState(false);
    const wrapperRef = useScrollReveal();

    useEffect(() => {
        const onScroll = () => {
            const y = window.scrollY;
            const max = document.documentElement.scrollHeight - window.innerHeight;
            setScrollProgress(max > 0 ? Math.min(1, y / max) : 0);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormSubmitted(true);
    };

    const features = [
        { icon: <Clock className="w-6 h-6" />, title: 'Timeline 7 Semanas', desc: 'Cronograma inteligente com fases pré-configuradas para lançamentos de alta performance.' },
        { icon: <Users className="w-6 h-6" />, title: 'Mini CRM Integrado', desc: 'Gestão completa de leads com tags, funis e scoring automático.' },
        { icon: <MessageSquare className="w-6 h-6" />, title: 'WhatsApp Automation', desc: 'Disparo inteligente, templates, recuperação de carrinho e follow-up automático.' },
        { icon: <Brain className="w-6 h-6" />, title: 'RAG + IA Contextual', desc: 'Base de conhecimento com IA que entende seus documentos e gera respostas precisas.' },
        { icon: <Target className="w-6 h-6" />, title: 'Frameworks de Lançamento', desc: 'Metodologias comprovadas: PLF, Meteórico, Semente — prontas para aplicar.' },
        { icon: <TrendingUp className="w-6 h-6" />, title: 'Recuperação de Vendas', desc: 'Sistema automático para carrinhos abandonados e re-engajamento de leads frios.' },
    ];

    const metrics = [
        { label: 'Taxa de Conversão Média', value: '+47%', sub: 'Versus lançamentos sem plataforma' },
        { label: 'Leads Recuperados', value: '2.3x', sub: 'Com automação WhatsApp integrada' },
        { label: 'Tempo de Setup', value: '< 24h', sub: 'Configuração completa da plataforma' },
    ];

    const testimonials = [
        { text: '"O FSA Launch Lab transformou completamente nossa operação de lançamentos. Antes levávamos 3 semanas pra organizar, agora em 2 dias tá tudo rodando."', name: 'Carlos M.', role: 'Expert em Marketing Digital', stars: 5 },
        { text: '"A integração com WhatsApp é insana. Recuperamos 34% dos carrinhos abandonados no último lançamento. Nunca vi isso antes."', name: 'Amanda R.', role: 'Gestora de Lançamentos', stars: 5 },
        { text: '"O RAG com IA é um diferencial absurdo. A equipe de suporte responde usando a base de conhecimento automaticamente. Escalou demais."', name: 'Pedro L.', role: 'Co-Pilot de Lançamentos', stars: 5 },
    ];

    const steps = [
        { num: '01', title: 'Briefing Expert', desc: 'Configure seu lançamento com nosso wizard inteligente' },
        { num: '02', title: 'Setup Automático', desc: 'Timeline, templates e automações pré-configuradas' },
        { num: '03', title: 'Captação de Leads', desc: 'Funil integrado com WhatsApp e CRM' },
        { num: '04', title: 'Lançamento', desc: 'Execução assistida com métricas em tempo real' },
        { num: '05', title: 'Pós-Venda', desc: 'Recuperação e fidelização automática' },
    ];

    return (
        <div ref={wrapperRef} className="lp-root bg-black text-white overflow-x-hidden min-h-screen relative selection:bg-cyan-500/30">
            {/* ── Scroll Progress ── */}
            <div className="fixed top-0 left-0 h-[2px] w-full z-[70] bg-gradient-to-r from-violet-500 via-cyan-400 to-violet-400 pointer-events-none" style={{ transform: `scaleX(${scrollProgress})`, transformOrigin: 'left center' }} />

            {/* ── Fixed BG Layers ── */}
            <div className="fixed inset-0 lp-vertical-streaks pointer-events-none z-0" />
            <div className="fixed inset-0 lp-crt-scanlines pointer-events-none z-0 opacity-30" />
            <div className="fixed inset-0 z-0 pointer-events-none" style={{ background: 'radial-gradient(circle at center, rgba(139,92,246,0.04), rgba(0,0,0,0.97), black)' }} />

            {/* ── NAV ── */}
            <nav className="fixed top-0 left-0 z-50 w-full bg-black/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto flex h-20 px-6 md:px-10 items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
                            <Rocket className="w-5 h-5 text-white" />
                        </div>
                        <a href="#home" className="font-orbitron text-xs md:text-sm uppercase tracking-[0.25em] text-white/90 hover:text-cyan-400 transition-colors">
                            FSA Launch <span className="text-cyan-400">PRO</span>
                        </a>
                    </div>

                    <div className="ml-auto flex items-center gap-6">
                        <div className="hidden md:flex items-center gap-10">
                            <a href="#features" className="text-xs font-orbitron uppercase tracking-[0.15em] text-neutral-500 hover:text-cyan-400 transition-colors">Recursos</a>
                            <a href="#process" className="text-xs font-orbitron uppercase tracking-[0.15em] text-neutral-500 hover:text-cyan-400 transition-colors">Processo</a>
                            <a href="#pricing" className="text-xs font-orbitron uppercase tracking-[0.15em] text-neutral-500 hover:text-cyan-400 transition-colors">Planos</a>
                            <a href="#capture" className="text-xs font-orbitron uppercase tracking-[0.15em] text-neutral-500 hover:text-cyan-400 transition-colors">Contato</a>
                        </div>

                        <button onClick={onEnterApp} className="hidden md:inline-flex font-orbitron text-xs uppercase tracking-[0.15em] border border-cyan-500/30 text-cyan-400 bg-cyan-500/5 px-6 py-2.5 hover:bg-cyan-400 hover:text-black hover:border-cyan-400 transition-all duration-300 relative group overflow-hidden">
                            <div className="absolute inset-0 w-full h-full bg-cyan-400 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-0" />
                            <span className="relative z-10 flex items-center gap-2">Acessar <ArrowRight className="w-3.5 h-3.5" /></span>
                        </button>

                        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-white/70">
                            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden bg-black/95 backdrop-blur-xl border-t border-white/5 px-6 py-6 space-y-4">
                        <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-orbitron uppercase tracking-[0.15em] text-neutral-400 hover:text-cyan-400">Recursos</a>
                        <a href="#process" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-orbitron uppercase tracking-[0.15em] text-neutral-400 hover:text-cyan-400">Processo</a>
                        <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-orbitron uppercase tracking-[0.15em] text-neutral-400 hover:text-cyan-400">Planos</a>
                        <a href="#capture" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-orbitron uppercase tracking-[0.15em] text-neutral-400 hover:text-cyan-400">Contato</a>
                        <button onClick={onEnterApp} className="w-full font-orbitron text-xs uppercase tracking-[0.15em] border border-cyan-500/30 text-cyan-400 bg-cyan-500/5 px-6 py-3 hover:bg-cyan-400 hover:text-black transition-all">
                            Acessar Plataforma
                        </button>
                    </div>
                )}
            </nav>

            {/* ── MAIN CONTENT ── */}
            <main className="relative z-10 w-full">

                {/* ═══════════════════════════════════════ HERO ═══════════════════════════════════════ */}
                <section id="home" className="relative w-full min-h-screen flex items-center border-b border-white/5 overflow-hidden pt-20">
                    {/* Unicorn Studio WebGL Background */}
                    <div className="absolute inset-0 w-full h-full opacity-60 mix-blend-screen pointer-events-none z-0">
                        <UnicornScene
                            projectId="U1UkAdFYC0obzysXIB00"
                            sdkUrl="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.1.0-1/dist/unicornStudio.umd.js"
                            width="100%"
                            height="100%"
                            scale={1}
                            dpi={1.5}
                            fps={60}
                            lazyLoad={false}
                        />
                    </div>
                    {/* Animated BG orbs */}
                    <div className="absolute top-[-15%] right-[-10%] w-[700px] h-[700px] bg-violet-600/8 rounded-full blur-[150px] pointer-events-none lp-float" />
                    <div className="absolute bottom-[-20%] left-[-5%] w-[500px] h-[500px] bg-cyan-500/6 rounded-full blur-[120px] pointer-events-none lp-float" style={{ animationDelay: '7s' }} />

                    <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 w-full py-20 md:py-0">
                        <div className="max-w-3xl lp-hero-rise">
                            <div className="flex items-center gap-3 mb-8">
                                <span className="w-2 h-2 bg-cyan-400 animate-pulse" />
                                <span className="text-xs font-orbitron tracking-[0.4em] text-cyan-500 uppercase">Sistema Operacional</span>
                                <span className="w-12 h-[1px] bg-cyan-500/50" />
                            </div>

                            <h1 className="font-orbitron text-white uppercase leading-[1.08] tracking-tight text-4xl md:text-6xl lg:text-7xl">
                                Domine Seus <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-cyan-400 to-violet-300">
                                    Lançamentos Digitais.
                                </span>
                            </h1>

                            <p className="mt-8 text-sm md:text-base text-neutral-400 font-light tracking-wide max-w-xl border-l-2 border-violet-500/40 pl-5 py-1">
                                Plataforma completa com IA, automações WhatsApp, CRM inteligente e frameworks comprovados — tudo que você precisa para lançar com precisão militar.
                            </p>

                            <div className="mt-10 flex flex-col sm:flex-row items-start gap-4">
                                <a href="#capture" className="group relative inline-flex items-center gap-3 border border-cyan-400 bg-cyan-400/10 text-cyan-400 font-orbitron font-medium text-xs uppercase tracking-[0.15em] px-8 py-4 transition-all duration-300 hover:bg-cyan-400 hover:text-black hover:shadow-[0_0_40px_rgba(0,255,255,0.3)]">
                                    <span>Garantir Minha Vaga</span>
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/50 group-hover:border-black/50" />
                                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/50 group-hover:border-black/50" />
                                </a>
                                <a href="#features" className="group relative inline-flex items-center gap-3 border border-white/10 bg-transparent text-white font-orbitron font-medium text-xs uppercase tracking-[0.15em] px-8 py-4 transition-all duration-300 hover:border-white/30 hover:bg-white/5">
                                    <span>Ver Recursos</span>
                                    <ChevronRight className="w-4 h-4" />
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Bottom tech badges */}
                    <div className="absolute bottom-10 right-6 lg:right-16 z-30 flex-col items-end gap-2 text-right pointer-events-none hidden md:flex">
                        <p className="font-orbitron text-xs tracking-[0.3em] text-neutral-600 uppercase">Core Stack</p>
                        <div className="flex gap-3 text-xs font-mono text-violet-400/70 mt-2">
                            <span>[ IA ]</span>
                            <span>[ WHATSAPP API ]</span>
                            <span>[ CRM ]</span>
                        </div>
                    </div>
                </section>

                {/* ═══════════════════════════════════════ FEATURES ═══════════════════════════════════════ */}
                <section id="features" className="py-24 md:py-36 px-6 md:px-12 lg:px-24 w-full border-b border-white/5 bg-black relative">
                    <div className="max-w-7xl mx-auto">
                        <div className="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/10 pb-8" data-lp-reveal>
                            <div>
                                <p className="font-orbitron text-xs uppercase tracking-[0.4em] text-cyan-500 mb-4 flex items-center gap-3">
                                    <span className="w-8 h-[1px] bg-cyan-500" /> 01 // Recursos
                                </p>
                                <h2 className="text-3xl md:text-5xl font-medium tracking-tight text-white font-orbitron uppercase">Arsenal Completo</h2>
                            </div>
                            <p className="text-neutral-500 text-xs font-orbitron tracking-[0.15em] uppercase max-w-xs text-right">
                                Ferramentas de ponta para lançamentos profissionais.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {features.map((feat, i) => (
                                <div key={i} className="group relative bg-neutral-950 border border-white/10 hover:border-cyan-500/50 transition-colors duration-500 p-6 flex flex-col justify-between min-h-[280px] overflow-hidden cursor-pointer" data-lp-reveal style={{ '--lp-delay': `${i * 80}ms` } as React.CSSProperties}>
                                    <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0" />
                                    <div className="absolute top-0 left-0 w-full h-[1px] overflow-hidden">
                                        <div className="h-full w-1/3 bg-cyan-400 lp-scan-line hidden group-hover:block" />
                                    </div>

                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-10">
                                            <div className="w-12 h-12 border border-white/10 bg-black flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform duration-500">
                                                {feat.icon}
                                            </div>
                                            <span className="text-[10px] font-orbitron tracking-[0.2em] text-neutral-600 border border-white/5 px-2 py-1 uppercase">Módulo</span>
                                        </div>
                                        <h3 className="text-lg font-medium tracking-tight mb-2 text-white font-orbitron uppercase group-hover:text-cyan-300 transition-colors">{feat.title}</h3>
                                        <p className="text-xs text-neutral-500 font-light leading-relaxed">{feat.desc}</p>
                                    </div>

                                    <div className="relative z-10 flex items-center gap-2 text-cyan-500 text-xs font-orbitron tracking-[0.15em] uppercase mt-6 opacity-50 group-hover:opacity-100 transition-opacity">
                                        Explorar <ArrowRight className="w-3.5 h-3.5" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ═══════════════════════════════════════ METRICS ═══════════════════════════════════════ */}
                <section className="py-24 md:py-36 px-6 md:px-12 lg:px-24 w-full border-b border-white/5 relative bg-neutral-950/30">
                    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-16 lg:gap-24 items-center relative z-10">
                        <div className="w-full lg:w-1/2 space-y-8">
                            <p className="font-orbitron text-xs uppercase tracking-[0.4em] text-cyan-500 flex items-center gap-3" data-lp-reveal>
                                <span className="w-8 h-[1px] bg-cyan-500" /> 02 // Resultados
                            </p>
                            <h2 className="text-3xl md:text-5xl font-medium tracking-tight text-white font-orbitron uppercase leading-[1.1]" data-lp-reveal>
                                Resultados<br />Mensuráveis.
                            </h2>
                            <div className="space-y-6 text-sm text-neutral-400 font-light leading-relaxed border-l border-white/10 pl-6" data-lp-reveal>
                                <p>
                                    A era dos lançamentos manuais acabou. Interfaces precisam ser fluidas, automações precisam ser inteligentes, e dados precisam direcionar cada decisão.
                                </p>
                                <p>
                                    Combinando IA contextual, automações WhatsApp e frameworks validados, o FSA Launch Lab PRO elimina gargalos operacionais e maximiza conversão em todas as fases do lançamento.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" data-lp-reveal>
                                {metrics.map((m, i) => (
                                    <div key={i} className="border border-white/10 bg-black/40 p-4">
                                        <p className="text-[10px] font-orbitron uppercase tracking-[0.2em] text-neutral-500">{m.label}</p>
                                        <p className="mt-3 text-2xl font-orbitron text-cyan-400">{m.value}</p>
                                        <p className="mt-1 text-[10px] text-neutral-600">{m.sub}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Telemetry panel */}
                        <div className="w-full lg:w-1/2 relative bg-black border border-white/10 p-8 md:p-12" data-lp-reveal>
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-cyan-500 to-transparent" />
                            <h3 className="text-xs font-orbitron tracking-[0.3em] uppercase text-neutral-500 mb-8 flex items-center justify-between">
                                <span>Telemetria do Sistema</span>
                                <span className="text-cyan-500 animate-pulse">● LIVE</span>
                            </h3>

                            <div className="space-y-7">
                                {[
                                    { label: 'Automação WhatsApp', val: '99.2%', w: '99%' },
                                    { label: 'Precisão da IA', val: '94.8%', w: '95%' },
                                    { label: 'Uptime da Plataforma', val: '99.97%', w: '100%' },
                                    { label: 'Velocidade de Setup', val: 'Real-time', w: '88%' },
                                ].map((r, i) => (
                                    <div key={i}>
                                        <div className="flex justify-between text-xs font-orbitron text-cyan-400 mb-2 tracking-widest uppercase">
                                            <span>{r.label}</span>
                                            <span>{r.val}</span>
                                        </div>
                                        <div className="h-[2px] w-full bg-white/5 relative overflow-hidden">
                                            <div className="absolute top-0 left-0 h-full bg-cyan-400 shadow-[0_0_10px_rgba(0,255,255,0.5)]" style={{ width: r.w }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ═══════════════════════════════════════ PROCESS TIMELINE ═══════════════════════════════════════ */}
                <section id="process" className="py-24 md:py-36 px-6 md:px-12 lg:px-24 w-full border-b border-white/5 bg-black">
                    <div className="max-w-7xl mx-auto">
                        <div className="mb-16" data-lp-reveal>
                            <p className="font-orbitron text-xs uppercase tracking-[0.4em] text-cyan-500 mb-4 flex items-center gap-3">
                                <span className="w-8 h-[1px] bg-cyan-500" /> 03 // Processo
                            </p>
                            <h2 className="text-3xl md:text-5xl font-medium tracking-tight text-white font-orbitron uppercase">
                                Do Conceito ao Lançamento
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            {steps.map((s, i) => (
                                <div key={i} className="border border-white/10 p-5 bg-neutral-950/60 hover:border-cyan-500/30 transition-colors group" data-lp-reveal style={{ '--lp-delay': `${i * 100}ms` } as React.CSSProperties}>
                                    <div className="absolute top-0 left-0 w-[2px] h-0 bg-cyan-500 group-hover:h-full transition-all duration-500 ease-out" style={{ position: 'relative' }} />
                                    <p className="text-cyan-400 text-xs font-orbitron uppercase tracking-[0.2em]">{s.num}</p>
                                    <p className="text-sm text-white mt-3 font-medium">{s.title}</p>
                                    <p className="text-[11px] text-neutral-500 mt-2 leading-relaxed">{s.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ═══════════════════════════════════════ TESTIMONIALS ═══════════════════════════════════════ */}
                <section className="py-24 md:py-36 px-6 md:px-12 lg:px-24 w-full border-b border-white/5 bg-neutral-950/30">
                    <div className="max-w-7xl mx-auto">
                        <div className="mb-20" data-lp-reveal>
                            <p className="font-orbitron text-xs uppercase tracking-[0.4em] text-cyan-500 mb-4 flex items-center gap-3">
                                <span className="w-8 h-[1px] bg-cyan-500" /> 04 // Depoimentos
                            </p>
                            <h2 className="text-3xl md:text-5xl font-medium tracking-tight text-white font-orbitron uppercase">
                                Quem Já Lançou Com a Gente
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {testimonials.map((t, i) => (
                                <div key={i} className="bg-black border border-white/10 p-8 relative group hover:border-cyan-500/30 transition-colors duration-500" data-lp-reveal style={{ '--lp-delay': `${i * 100}ms` } as React.CSSProperties}>
                                    <div className="absolute top-6 right-6 flex gap-0.5">
                                        {Array.from({ length: t.stars }).map((_, j) => (
                                            <Star key={j} className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                        ))}
                                    </div>
                                    <p className="text-sm text-neutral-400 font-light leading-relaxed mb-8 relative z-10">{t.text}</p>
                                    <div className="flex items-center gap-4 border-t border-white/5 pt-6 mt-auto">
                                        <div className="w-10 h-10 border border-violet-500/30 bg-violet-500/5 flex items-center justify-center rounded-lg">
                                            <Users className="w-4 h-4 text-violet-400" />
                                        </div>
                                        <div>
                                            <p className="font-orbitron text-xs tracking-[0.1em] text-white uppercase">{t.name}</p>
                                            <p className="text-[10px] text-cyan-500 tracking-[0.15em] font-orbitron uppercase mt-1">{t.role}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ═══════════════════════════════════════ PRICING ═══════════════════════════════════════ */}
                <section id="pricing" className="py-24 md:py-36 px-6 md:px-12 lg:px-24 w-full border-b border-white/5 bg-black relative">
                    <div className="max-w-7xl mx-auto">
                        <div className="mb-20 flex flex-col items-center text-center" data-lp-reveal>
                            <p className="font-orbitron text-xs uppercase tracking-[0.4em] text-cyan-500 mb-4 flex items-center justify-center gap-3">
                                05 // Planos
                            </p>
                            <h2 className="text-3xl md:text-5xl font-medium tracking-tight text-white font-orbitron uppercase">
                                Escolha Seu Nível
                            </h2>
                            <p className="mt-6 text-sm text-neutral-400 font-light tracking-wide max-w-xl">
                                Acesse o Launch Lab PRO e transforme a forma como você planeja, executa e escala seus lançamentos digitais.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-end">
                            {/* Starter */}
                            <div className="border border-white/10 bg-neutral-950/50 p-8 flex flex-col h-full hover:border-white/30 transition-colors" data-lp-reveal>
                                <div className="mb-8">
                                    <h3 className="text-xs font-orbitron tracking-[0.3em] uppercase text-neutral-500 mb-4">Starter</h3>
                                    <div className="flex items-baseline gap-2 mb-2">
                                        <span className="text-3xl font-orbitron font-medium text-white">R$97</span>
                                        <span className="text-xs text-neutral-500 tracking-widest uppercase">/ Mês</span>
                                    </div>
                                    <p className="text-xs text-neutral-400 font-light">Acesso básico à plataforma e ferramentas essenciais.</p>
                                </div>
                                <ul className="space-y-4 mb-10 flex-1">
                                    {['Timeline de 7 semanas', 'CRM básico (até 500 leads)', 'Templates padrão', '1 integração WhatsApp'].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3 text-xs text-neutral-300">
                                            <CheckCircle2 className="w-4 h-4 text-white/30 shrink-0 mt-0.5" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                                <a href="#capture" className="w-full text-center border border-white/10 bg-white/5 hover:bg-white/10 text-white font-orbitron text-xs uppercase tracking-[0.15em] py-4 transition-colors block">
                                    Começar Agora
                                </a>
                            </div>

                            {/* PRO — Destaque */}
                            <div className="border border-violet-500/50 bg-black p-8 flex flex-col h-full relative shadow-[0_0_30px_rgba(139,92,246,0.08)] lg:-translate-y-4" data-lp-reveal>
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-cyan-400 to-violet-500" />
                                <div className="absolute -top-3 right-6 bg-violet-500/10 border border-violet-500/30 text-violet-400 text-[10px] font-orbitron uppercase tracking-[0.2em] px-3 py-1 backdrop-blur-md">
                                    Recomendado
                                </div>

                                <div className="mb-8 mt-2">
                                    <h3 className="text-xs font-orbitron tracking-[0.3em] uppercase text-cyan-400 mb-4">PRO</h3>
                                    <div className="flex items-baseline gap-2 mb-2">
                                        <span className="text-4xl font-orbitron font-medium text-white">R$297</span>
                                        <span className="text-xs text-neutral-500 tracking-widest uppercase">/ Mês</span>
                                    </div>
                                    <p className="text-xs text-neutral-400 font-light">Acesso completo + IA + automações avançadas.</p>
                                </div>

                                <ul className="space-y-4 mb-10 flex-1">
                                    {[
                                        'Tudo do Starter',
                                        'IA RAG contextual',
                                        'Automação WhatsApp ilimitada',
                                        'CRM ilimitado + scoring',
                                        'Frameworks de lançamento',
                                        'Recuperação de vendas',
                                        'Suporte prioritário',
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3 text-xs text-neutral-300">
                                            <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>

                                <a href="#capture" className="w-full text-center border border-violet-500 bg-violet-500/10 hover:bg-violet-500 hover:text-white text-violet-400 font-orbitron text-xs uppercase tracking-[0.15em] py-4 transition-all duration-300 group block">
                                    <span className="relative z-10 flex justify-center items-center gap-2">Garantir PRO <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" /></span>
                                </a>
                            </div>

                            {/* Enterprise */}
                            <div className="border border-white/10 bg-neutral-950/50 p-8 flex flex-col h-full hover:border-white/30 transition-colors" data-lp-reveal>
                                <div className="mb-8">
                                    <h3 className="text-xs font-orbitron tracking-[0.3em] uppercase text-neutral-500 mb-4">Enterprise</h3>
                                    <div className="flex items-baseline gap-2 mb-2">
                                        <span className="text-3xl font-orbitron font-medium text-white">Sob Medida</span>
                                    </div>
                                    <p className="text-xs text-neutral-400 font-light">Solução personalizada para equipes e agências.</p>
                                </div>
                                <ul className="space-y-4 mb-10 flex-1">
                                    {['Tudo do PRO', 'Multi-tenancy (vários experts)', 'API personalizada', 'Onboarding dedicado', 'SLA de suporte 4h'].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3 text-xs text-neutral-300">
                                            <CheckCircle2 className="w-4 h-4 text-white/30 shrink-0 mt-0.5" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                                <a href="#capture" className="w-full text-center border border-white/10 bg-transparent hover:bg-white/5 text-white font-orbitron text-xs uppercase tracking-[0.15em] py-4 transition-colors block">
                                    Falar com Vendas
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ═══════════════════════════════════════ CAPTURE CTA ═══════════════════════════════════════ */}
                <section id="capture" className="py-32 px-6 md:px-12 lg:px-24 w-full bg-black relative overflow-hidden border-b border-white/5">
                    {/* Dot grid overlay */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LCAyNTUsIDI1NSwgMC4wNSkiLz48L3N2Zz4=\")" }} />

                    <div className="max-w-2xl mx-auto relative z-10" data-lp-reveal>
                        <div className="text-center mb-12">
                            <p className="font-orbitron text-xs uppercase tracking-[0.5em] text-cyan-500 mb-8 border border-cyan-500/20 px-4 py-1 bg-cyan-500/5 inline-block">
                                06 // Sua Vaga
                            </p>
                            <h2 className="text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight text-white font-orbitron uppercase mb-6">
                                Inicie Agora <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-cyan-400 to-violet-300">
                                    Sua Jornada.
                                </span>
                            </h2>
                            <p className="text-sm text-neutral-500 font-mono tracking-widest max-w-md mx-auto">
                                &gt; Preencha abaixo e receba acesso exclusivo ao FSA Launch Lab PRO.
                            </p>
                        </div>

                        {/* Capture form */}
                        {!formSubmitted ? (
                            <form onSubmit={handleFormSubmit} className="border border-white/10 bg-neutral-950/60 p-8 md:p-10 space-y-6 backdrop-blur-sm">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-cyan-400 to-transparent" style={{ position: 'relative' }} />

                                <div>
                                    <label className="block text-xs font-orbitron uppercase tracking-[0.2em] text-neutral-400 mb-2">Nome Completo</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        required
                                        placeholder="Seu nome"
                                        className="w-full px-4 py-3.5 bg-black/60 border border-white/10 text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-orbitron uppercase tracking-[0.2em] text-neutral-400 mb-2">E-mail</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                        required
                                        placeholder="seu@email.com"
                                        className="w-full px-4 py-3.5 bg-black/60 border border-white/10 text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-orbitron uppercase tracking-[0.2em] text-neutral-400 mb-2">WhatsApp</label>
                                    <input
                                        type="tel"
                                        value={formData.whatsapp}
                                        onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                                        placeholder="(00) 00000-0000"
                                        className="w-full px-4 py-3.5 bg-black/60 border border-white/10 text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                                    />
                                </div>

                                <button type="submit" className="w-full group relative inline-flex items-center justify-center gap-3 bg-white text-black font-orbitron font-medium text-sm uppercase tracking-[0.15em] px-8 py-5 transition-all duration-300 hover:bg-cyan-400 hover:shadow-[0_0_40px_rgba(0,255,255,0.3)] overflow-hidden">
                                    <span className="relative z-10 flex items-center gap-2">
                                        Garantir Minha Vaga <Send className="w-4 h-4" />
                                    </span>
                                </button>

                                <p className="text-center text-[10px] text-neutral-600 font-orbitron tracking-[0.15em] uppercase">
                                    <Shield className="w-3 h-3 inline mr-1" /> Dados seguros • Sem spam
                                </p>
                            </form>
                        ) : (
                            <div className="border border-cyan-500/30 bg-cyan-500/5 p-10 text-center">
                                <div className="w-16 h-16 border border-cyan-500/30 bg-cyan-500/10 flex items-center justify-center mx-auto mb-6">
                                    <Zap className="w-8 h-8 text-cyan-400" />
                                </div>
                                <h3 className="text-xl font-orbitron uppercase text-white mb-3">Vaga Garantida!</h3>
                                <p className="text-sm text-neutral-400 mb-6">Em breve você receberá um e-mail com os próximos passos.</p>
                                <button onClick={onEnterApp} className="font-orbitron text-xs uppercase tracking-[0.15em] border border-cyan-400 text-cyan-400 bg-cyan-400/10 px-8 py-3 hover:bg-cyan-400 hover:text-black transition-all duration-300">
                                    Acessar Plataforma →
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                {/* ═══════════════════════════════════════ FOOTER ═══════════════════════════════════════ */}
                <footer className="bg-black pt-20 pb-10 px-6 md:px-12 lg:px-24 relative overflow-hidden w-full">
                    <div className="absolute inset-0 lp-crt-scanlines pointer-events-none opacity-15" />
                    <div className="max-w-7xl mx-auto relative z-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 mb-16">
                            {/* Brand */}
                            <div className="lg:col-span-4 flex flex-col items-start">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                                        <Rocket className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="font-orbitron text-sm uppercase tracking-[0.25em] text-white">FSA Launch <span className="text-cyan-400">PRO</span></span>
                                </div>
                                <p className="text-xs text-neutral-500 font-light leading-relaxed mb-8 max-w-xs">
                                    Plataforma de gestão e automação de lançamentos digitais. Impulsionada por IA, validada por resultados.
                                </p>
                                <div className="border border-white/10 flex items-center gap-3 px-4 py-2 bg-white/5 w-fit">
                                    <span className="w-1.5 h-1.5 bg-green-500 shadow-[0_0_8px_#22c55e]" />
                                    <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">Sistema Online</span>
                                </div>
                            </div>

                            {/* Links */}
                            <div className="lg:col-span-2 lg:col-start-7">
                                <h4 className="font-orbitron text-xs uppercase tracking-[0.2em] text-white mb-6">Plataforma</h4>
                                <ul className="space-y-4">
                                    <li><a href="#features" className="text-xs text-neutral-500 hover:text-cyan-400 transition-colors tracking-wide">Recursos</a></li>
                                    <li><a href="#process" className="text-xs text-neutral-500 hover:text-cyan-400 transition-colors tracking-wide">Processo</a></li>
                                    <li><a href="#pricing" className="text-xs text-neutral-500 hover:text-cyan-400 transition-colors tracking-wide">Planos</a></li>
                                    <li><button onClick={onEnterApp} className="text-xs text-neutral-500 hover:text-cyan-400 transition-colors tracking-wide">Login</button></li>
                                </ul>
                            </div>

                            <div className="lg:col-span-2">
                                <h4 className="font-orbitron text-xs uppercase tracking-[0.2em] text-white mb-6">Recursos</h4>
                                <ul className="space-y-4">
                                    <li><a href="#" className="text-xs text-neutral-500 hover:text-cyan-400 transition-colors tracking-wide">Documentação</a></li>
                                    <li><a href="#" className="text-xs text-neutral-500 hover:text-cyan-400 transition-colors tracking-wide">Integrações</a></li>
                                    <li><a href="#" className="text-xs text-neutral-500 hover:text-cyan-400 transition-colors tracking-wide">Suporte</a></li>
                                </ul>
                            </div>

                            <div className="lg:col-span-2">
                                <h4 className="font-orbitron text-xs uppercase tracking-[0.2em] text-white mb-6">Legal</h4>
                                <ul className="space-y-4">
                                    <li><a href="#" className="text-xs text-neutral-500 hover:text-cyan-400 transition-colors tracking-wide">Privacidade</a></li>
                                    <li><a href="#" className="text-xs text-neutral-500 hover:text-cyan-400 transition-colors tracking-wide">Termos de Uso</a></li>
                                </ul>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
                            <p className="text-xs font-orbitron uppercase tracking-[0.2em] text-neutral-600">
                                © 2025 FSA Launch Lab PRO. Todos os direitos reservados.
                            </p>
                            <div className="flex items-center gap-4">
                                <a href="#" className="w-10 h-10 border border-white/5 flex items-center justify-center text-neutral-500 hover:bg-violet-500/10 hover:border-violet-500/30 hover:text-violet-400 transition-all duration-300">
                                    <BarChart3 className="w-4 h-4" />
                                </a>
                                <a href="#" className="w-10 h-10 border border-white/5 flex items-center justify-center text-neutral-500 hover:bg-violet-500/10 hover:border-violet-500/30 hover:text-violet-400 transition-all duration-300">
                                    <Zap className="w-4 h-4" />
                                </a>
                                <a href="#" className="w-10 h-10 border border-white/5 flex items-center justify-center text-neutral-500 hover:bg-violet-500/10 hover:border-violet-500/30 hover:text-violet-400 transition-all duration-300">
                                    <Shield className="w-4 h-4" />
                                </a>
                            </div>
                        </div>
                    </div>
                </footer>
            </main>

            {/* ── Floating Terminal ── */}
            <div className="fixed bottom-8 right-8 z-50 hidden md:flex flex-col items-end gap-1 text-cyan-400 border border-white/10 bg-black/80 backdrop-blur-md p-4 shadow-[0_0_20px_rgba(0,0,0,0.8)]">
                <div className="flex items-center gap-3 border-b border-white/10 pb-2 mb-2 w-full justify-between">
                    <span className="font-orbitron text-xs tracking-[0.3em] uppercase text-white/50">Terminal</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                        <span className="animate-pulse w-1.5 h-1.5 bg-cyan-400" />
                        <span className="font-mono text-xs tracking-widest uppercase">FSA_PRO._Ready</span>
                    </div>
                    <span className="font-mono text-xs opacity-50 tracking-widest text-white/30">V.1.0.0</span>
                </div>
            </div>
        </div>
    );
}
