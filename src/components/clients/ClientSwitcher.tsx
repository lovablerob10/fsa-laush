import { useState, useEffect } from 'react';
import { Building2, ChevronDown, Plus, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store';
import { NovoClienteModal } from './NovoClienteModal';
import { cn } from '@/lib/utils';

export function ClientSwitcher() {
    const { tenant, activeTenant, setActiveTenant, user } = useAuthStore() as any;
    const [clients, setClients] = useState<any[]>([]);
    const [open, setOpen] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const isMaster = tenant?.slug === 'fsa-launch-lab';

    useEffect(() => {
        if (isMaster) loadClients();
    }, [isMaster]);

    async function loadClients() {
        const { data } = await supabase
            .from('tenants')
            .select('id, name, slug, plan, status')
            .order('name');
        if (data) setClients(data);
    }

    function handleSelect(client: any) {
        setActiveTenant(client);
        setOpen(false);
    }

    function handleNewClientSuccess(newTenant: any) {
        setClients(prev => [...prev, newTenant]);
        setActiveTenant(newTenant);
        setShowModal(false);
    }

    if (!isMaster) return null; // só mostra para admin FSA

    return (
        <>
            <div className="relative px-3 py-2">
                <button
                    onClick={() => setOpen(!open)}
                    className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all',
                        'bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20'
                    )}
                >
                    <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-violet-300 font-medium">Cliente ativo</p>
                        <p className="text-sm text-white font-semibold truncate">
                            {activeTenant?.name || 'Selecionar...'}
                        </p>
                    </div>
                    <ChevronDown className={cn('w-4 h-4 text-violet-300 transition-transform', open && 'rotate-180')} />
                </button>

                {open && (
                    <div className="absolute left-3 right-3 top-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                        <div className="p-1.5 max-h-64 overflow-y-auto">
                            {clients.map(client => (
                                <button
                                    key={client.id}
                                    onClick={() => handleSelect(client)}
                                    className={cn(
                                        'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-all',
                                        activeTenant?.id === client.id
                                            ? 'bg-violet-600/30 text-violet-200'
                                            : 'text-slate-300 hover:bg-slate-700'
                                    )}
                                >
                                    <div className={cn(
                                        'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0',
                                        client.slug === 'fsa-launch-lab' ? 'bg-indigo-600 text-white' : 'bg-slate-600 text-slate-200'
                                    )}>
                                        {client.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{client.name}</p>
                                        <p className="text-xs text-slate-500 capitalize">{client.plan}</p>
                                    </div>
                                    {activeTenant?.id === client.id && (
                                        <Check className="w-4 h-4 text-violet-400 flex-shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Botão + Cliente */}
                        <div className="border-t border-slate-700 p-1.5">
                            <button
                                onClick={() => { setOpen(false); setShowModal(true); }}
                                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-all text-sm font-medium"
                            >
                                <div className="w-7 h-7 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                                    <Plus className="w-4 h-4" />
                                </div>
                                + Novo Cliente
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <NovoClienteModal
                open={showModal}
                onClose={() => setShowModal(false)}
                onSuccess={handleNewClientSuccess}
            />
        </>
    );
}
