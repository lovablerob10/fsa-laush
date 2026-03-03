import { useState } from 'react';
import { Eye, EyeOff, Rocket, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export function LoginPage() {
    const { signIn } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await signIn(email, password);
        } catch (err: any) {
            setError(
                err.message === 'Invalid login credentials'
                    ? 'E-mail ou senha incorretos.'
                    : err.message || 'Erro ao entrar. Tente novamente.'
            );
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background orbs */}
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-violet-600/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] bg-fuchsia-600/10 rounded-full blur-[80px] pointer-events-none" />

            {/* Card */}
            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/30 mb-4">
                        <Rocket className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">FSA Launch Lab</h1>
                    <p className="text-slate-400 mt-1 text-sm">Plataforma de Gestão de Lançamentos</p>
                </div>

                {/* Form card */}
                <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold text-white">Entrar na plataforma</h2>
                        <p className="text-slate-400 text-sm mt-1">Acesse com suas credenciais</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                E-mail
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                required
                                autoFocus
                                className={cn(
                                    'w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500',
                                    'bg-slate-800/60 border border-slate-700',
                                    'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500',
                                    'transition-all duration-200'
                                )}
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Senha
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className={cn(
                                        'w-full px-4 py-3 pr-12 rounded-xl text-sm text-white placeholder-slate-500',
                                        'bg-slate-800/60 border border-slate-700',
                                        'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500',
                                        'transition-all duration-200'
                                    )}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                                <span className="text-red-400 text-sm">{error}</span>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading || !email || !password}
                            className={cn(
                                'w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl',
                                'bg-gradient-to-r from-violet-600 to-indigo-600',
                                'text-white font-semibold text-sm',
                                'hover:from-violet-500 hover:to-indigo-500',
                                'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-slate-900',
                                'disabled:opacity-50 disabled:cursor-not-allowed',
                                'transition-all duration-200 shadow-lg shadow-violet-500/25',
                                'active:scale-[0.98]'
                            )}
                        >
                            {isLoading ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</>
                            ) : (
                                <><span>Entrar</span><ArrowRight className="w-4 h-4" /></>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <p className="text-center text-xs text-slate-600 mt-6">
                        FSA Launch Lab Pro · Plataforma privada
                    </p>
                </div>
            </div>
        </div>
    );
}
