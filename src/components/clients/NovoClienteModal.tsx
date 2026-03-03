import { useState } from 'react';
import { X, Building2, User, Mail, Lock, Loader2, CheckCircle2, ChevronDown, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface NovoClienteModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: (tenant: { id: string; name: string; slug: string }) => void;
}

export function NovoClienteModal({ open, onClose, onSuccess }: NovoClienteModalProps) {
    const [form, setForm] = useState({
        tenantName: '',
        adminName: '',
        adminEmail: '',
        tempPassword: '',
        plan: 'starter' as 'starter' | 'pro' | 'enterprise',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState<string | null>(null);

    if (!open) return null;

    function slugify(text: string) {
        return text.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Sessão expirada');

            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-client`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                    },
                    body: JSON.stringify({
                        tenantName: form.tenantName,
                        slug: slugify(form.tenantName),
                        plan: form.plan,
                        adminName: form.adminName,
                        adminEmail: form.adminEmail,
                        tempPassword: form.tempPassword,
                    }),
                }
            );

            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            setSuccess(data.message);
            onSuccess({ id: data.tenantId, name: form.tenantName, slug: slugify(form.tenantName) });

            setTimeout(() => {
                setSuccess(null);
                setForm({ tenantName: '', adminName: '', adminEmail: '', tempPassword: '', plan: 'starter' });
                onClose();
            }, 2000);

        } catch (err: any) {
            setError(err.message || 'Erro ao criar cliente');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-violet-600" />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-900">Novo Cliente</h2>
                            <p className="text-xs text-slate-500">Cria o tenant + usuário admin automaticamente</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Success state */}
                {success ? (
                    <div className="p-8 text-center">
                        <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
                        <h3 className="font-semibold text-slate-900 text-lg">{success}</h3>
                        <p className="text-slate-500 text-sm mt-1">Redirecionando...</p>
                    </div>
                ) : (
                    <form onSubmit={handleCreate} className="p-6 space-y-4">
                        {/* Nome do Cliente */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                <Building2 className="w-3.5 h-3.5 inline mr-1.5" />
                                Nome do Cliente / Empresa
                            </label>
                            <input
                                value={form.tenantName}
                                onChange={e => setForm(f => ({ ...f, tenantName: e.target.value }))}
                                placeholder="Ex: Expert João Silva - Fitness"
                                required
                                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
                            />
                            {form.tenantName && (
                                <p className="text-xs text-slate-400 mt-1">
                                    ID: <span className="font-mono text-violet-600">{slugify(form.tenantName)}</span>
                                </p>
                            )}
                        </div>

                        {/* Nome Admin */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                <User className="w-3.5 h-3.5 inline mr-1.5" />
                                Nome do Admin
                            </label>
                            <input
                                value={form.adminName}
                                onChange={e => setForm(f => ({ ...f, adminName: e.target.value }))}
                                placeholder="Nome de quem vai acessar"
                                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                <Mail className="w-3.5 h-3.5 inline mr-1.5" />
                                E-mail do Admin
                            </label>
                            <input
                                type="email"
                                value={form.adminEmail}
                                onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))}
                                placeholder="email@cliente.com"
                                required
                                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                            />
                        </div>

                        {/* Senha temporária */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                <Lock className="w-3.5 h-3.5 inline mr-1.5" />
                                Senha Temporária
                            </label>
                            <input
                                type="password"
                                value={form.tempPassword}
                                onChange={e => setForm(f => ({ ...f, tempPassword: e.target.value }))}
                                placeholder="Mínimo 6 caracteres"
                                minLength={6}
                                required
                                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                            />
                            <p className="text-xs text-slate-400 mt-1">O cliente pode alterar após o primeiro login.</p>
                        </div>

                        {/* Plano */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Plano</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['starter', 'pro', 'enterprise'] as const).map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, plan: p }))}
                                        className={cn(
                                            'py-2 rounded-lg border-2 text-xs font-medium capitalize transition-all',
                                            form.plan === p
                                                ? 'border-violet-500 bg-violet-50 text-violet-700'
                                                : 'border-slate-200 text-slate-500 hover:border-violet-300'
                                        )}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={onClose}
                                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                                Cancelar
                            </button>
                            <button type="submit" disabled={loading || !form.tenantName || !form.adminEmail || !form.tempPassword}
                                className={cn(
                                    'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white transition-all',
                                    'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500',
                                    'disabled:opacity-50 disabled:cursor-not-allowed'
                                )}>
                                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Criando...</> : <>Criar Cliente</>}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
