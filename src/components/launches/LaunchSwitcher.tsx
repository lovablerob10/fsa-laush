import { useState, useEffect } from 'react';
import { Plus, Rocket, ChevronDown, Check, X, Loader2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store';
import { supabase } from '@/lib/supabase/client';

// Launch types (Robson's methodology)
const LAUNCH_TYPES = [
    { id: 'meteorico', label: 'Meteórico', emoji: '☄️', desc: '3–7 dias de aquecimento' },
    { id: 'webinar', label: 'Webinar', emoji: '🎙', desc: 'Aula ao vivo + vendas' },
    { id: 'perpétuo', label: 'Perpétuo', emoji: '♾️', desc: 'Vendas contínuas' },
    { id: 'aceleracao', label: 'Aceleração', emoji: '🚀', desc: '7 semanas intensas' },
    { id: 'imersao', label: 'Imersão', emoji: '🎯', desc: 'Evento presencial/online' },
    { id: 'semente', label: 'Semente', emoji: '🌱', desc: 'Primeira turma validação' },
];

export function LaunchSwitcher() {
    const { activeTenant, activeLaunch, setActiveLaunch } = useAuthStore() as any;
    const [launches, setLaunches] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // New launch form state
    const [newName, setNewName] = useState('');
    const [newProduct, setNewProduct] = useState('');
    const [newType, setNewType] = useState('aceleracao');
    const [newDate, setNewDate] = useState('');
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    // Fetch launches for the active tenant
    useEffect(() => {
        if (!activeTenant?.id) return;
        setLoading(true);
        (supabase.from('launches') as any)
            .select('id, name, product_name, launch_type, start_date, status')
            .eq('tenant_id', activeTenant.id)
            .order('created_at', { ascending: false })
            .then(({ data }: any) => {
                const list = data || [];
                setLaunches(list);
                // Auto-select the first launch if none is selected or selected one doesn't belong to this tenant
                if (!activeLaunch || !list.find((l: any) => l.id === activeLaunch?.id)) {
                    setActiveLaunch(list[0] || null);
                }
                setLoading(false);
            });
    }, [activeTenant?.id]);

    async function createLaunch() {
        if (!newName.trim() || !activeTenant?.id) return;
        setCreating(true);
        setCreateError('');
        try {
            // Calculate 7-week timeline
            const start = newDate ? new Date(newDate) : new Date();
            const end = new Date(start);
            end.setDate(end.getDate() + 49); // 7 weeks

            const { data, error } = await (supabase.from('launches') as any)
                .insert({
                    tenant_id: activeTenant.id,
                    name: newName.trim(),
                    product_name: newProduct.trim() || newName.trim(),
                    launch_type: newType,
                    start_date: newDate || null,
                    status: 'planning',
                })
                .select()
                .single();

            if (error) throw error;

            // Create the 7 standard phases for the new launch
            const phaseNames = [
                { name: 'Fundação da Aceleração', week: 1 },
                { name: 'Construção da Audiência', week: 2 },
                { name: 'Aquecimento Direto', week: 3 },
                { name: 'Pré-Lançamento', week: 4 },
                { name: 'Lançamento', week: 5 },
                { name: 'Pós-Lançamento', week: 6 },
                { name: 'Escala e Otimização', week: 7 },
            ];
            const phaseStart = new Date(start);
            for (let i = 0; i < phaseNames.length; i++) {
                const ws = new Date(phaseStart);
                ws.setDate(ws.getDate() + i * 7);
                const we = new Date(ws);
                we.setDate(we.getDate() + 6);
                await (supabase.from('launch_phases') as any).insert({
                    launch_id: data.id,
                    name: phaseNames[i].name,
                    week_number: i + 1,
                    week_start: ws.toISOString().split('T')[0],
                    week_end: we.toISOString().split('T')[0],
                    order: i + 1,
                });
            }

            const updated = [...launches, data];
            setLaunches(updated);
            setActiveLaunch(data);
            setShowModal(false);
            setNewName('');
            setNewProduct('');
            setNewType('aceleracao');
            setNewDate('');
        } catch (e: any) {
            setCreateError(e.message || 'Erro ao criar lançamento');
        } finally {
            setCreating(false);
        }
    }

    const selectedType = LAUNCH_TYPES.find(t => t.id === (activeLaunch?.launch_type || 'aceleracao'));

    if (!activeTenant?.id) return null;

    return (
        <>
            {/* Launch Switcher Widget */}
            <div className="px-3 py-2">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-1.5 px-1">
                    Lançamento Ativo
                </p>

                {loading ? (
                    <div className="flex items-center gap-2 px-2 py-2">
                        <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
                        <span className="text-xs text-slate-500">Carregando...</span>
                    </div>
                ) : (
                    <div className="relative">
                        {/* Selected launch display */}
                        <button
                            onClick={() => setDropdownOpen(o => !o)}
                            className={cn(
                                'w-full flex items-center gap-2 px-2.5 py-2 rounded-xl border transition-all text-left',
                                'border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10'
                            )}
                        >
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                                <span className="text-sm">{selectedType?.emoji || '🚀'}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate leading-tight">
                                    {activeLaunch?.name || 'Nenhum lançamento'}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate leading-tight">
                                    {activeLaunch?.product_name || 'Selecione um lançamento'}
                                </p>
                            </div>
                            <ChevronDown className={cn('w-3 h-3 text-muted-foreground flex-shrink-0 transition-transform', dropdownOpen && 'rotate-180')} />
                        </button>

                        {/* Dropdown */}
                        {dropdownOpen && (
                            <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-sidebar border border-sidebar-border rounded-xl shadow-2xl shadow-black/40 overflow-hidden">
                                <div className="max-h-52 overflow-y-auto">
                                    {launches.length === 0 && (
                                        <div className="px-3 py-3 text-center text-xs text-slate-500">
                                            Nenhum lançamento encontrado
                                        </div>
                                    )}
                                    {launches.map(launch => {
                                        const lType = LAUNCH_TYPES.find(t => t.id === launch.launch_type);
                                        const isActive = activeLaunch?.id === launch.id;
                                        return (
                                            <button
                                                key={launch.id}
                                                onClick={() => { setActiveLaunch(launch); setDropdownOpen(false); }}
                                                className={cn(
                                                    'w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors text-left',
                                                    isActive ? 'bg-violet-500/10' : 'hover:bg-slate-800/50'
                                                )}
                                            >
                                                <span className="text-base flex-shrink-0">{lType?.emoji || '🚀'}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className={cn('text-xs font-semibold truncate', isActive ? 'text-violet-300' : 'text-foreground')}>
                                                        {launch.name}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground truncate">
                                                        {lType?.label || launch.launch_type} · {launch.product_name}
                                                    </p>
                                                </div>
                                                {isActive && <Check className="w-3 h-3 text-violet-400 flex-shrink-0" />}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="border-t border-sidebar-border">
                                    <button
                                        onClick={() => { setDropdownOpen(false); setShowModal(true); }}
                                        className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-violet-400 hover:bg-violet-500/10 transition-colors"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Novo Lançamento
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* New Launch Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#0F0F1A] border border-slate-700/60 rounded-2xl w-full max-w-md shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-700 rounded-xl flex items-center justify-center">
                                    <Rocket className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-white">Novo Lançamento</h2>
                                    <p className="text-xs text-slate-400">Para cliente: {activeTenant?.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-5">
                            {/* Launch name */}
                            <div>
                                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Nome do Lançamento *</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder="Ex: Lançamento Meteórico Jan/2026"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                                />
                            </div>

                            {/* Product name */}
                            <div>
                                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Nome do Produto</label>
                                <input
                                    type="text"
                                    value={newProduct}
                                    onChange={e => setNewProduct(e.target.value)}
                                    placeholder="Ex: Curso de IA Aplicada"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                                />
                            </div>

                            {/* Launch type */}
                            <div>
                                <label className="text-xs font-semibold text-slate-300 mb-2 block">Tipo de Lançamento *</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {LAUNCH_TYPES.map(type => (
                                        <button
                                            key={type.id}
                                            onClick={() => setNewType(type.id)}
                                            className={cn(
                                                'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all',
                                                newType === type.id
                                                    ? 'border-violet-500 bg-violet-500/10 text-white'
                                                    : 'border-slate-700 text-slate-400 hover:border-slate-600'
                                            )}
                                        >
                                            <span className="text-lg">{type.emoji}</span>
                                            <div>
                                                <p className="text-xs font-semibold leading-tight">{type.label}</p>
                                                <p className="text-[10px] text-slate-500 leading-tight">{type.desc}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Start date */}
                            <div>
                                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Data de Início</label>
                                <input
                                    type="date"
                                    value={newDate}
                                    onChange={e => setNewDate(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                                />
                                <p className="text-[10px] text-slate-500 mt-1">As 7 fases serão criadas automaticamente a partir desta data</p>
                            </div>

                            {createError && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                                    <p className="text-red-400 text-xs">{createError}</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-800 flex gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 text-sm font-semibold transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={createLaunch}
                                disabled={creating || !newName.trim()}
                                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {creating
                                    ? <><Loader2 className="w-4 h-4 animate-spin" />Criando...</>
                                    : <><Zap className="w-4 h-4" />Criar Lançamento</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
