import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore, useUIStore } from '@/store';

export function NotionCallback() {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState('');
    const [workspaceName, setWorkspaceName] = useState('');
    const { setCurrentPage } = useUIStore();
    const { activeTenant } = useAuthStore() as any;

    useEffect(() => {
        const processCallback = async () => {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const code = urlParams.get('code');
                const error = urlParams.get('error');

                if (error) {
                    throw new Error(`Acesso negado ou erro no Notion: ${error}`);
                }

                if (!code) {
                    throw new Error('Código de autorização não encontrado na URL.');
                }

                // O Notion faz um redirecionamento externo que recarrega nosso SPA.
                // Precisamos garantir que o Supabase restaurou a sessão no LocalStorage ANTES
                // de chamar a Edge Function, senão o Kong Gateway retorna 401 (Invalid JWT).
                let currentSession = null;
                for (let i = 0; i < 10; i++) {
                    const { data } = await supabase.auth.getSession();
                    if (data?.session) {
                        currentSession = data.session;
                        break;
                    }
                    console.log('Aguardando restauração da sessão Supabase...');
                    await new Promise(res => setTimeout(res, 500));
                }

                if (!currentSession) {
                    throw new Error('Sessão expirada ou não restaurada. Por favor, volte ao Dashboard, faça login se necessário e tente novamente.');
                }

                const redirectUri = `${window.location.origin}/integrations/notion/callback`;

                const { data, error: invokeError } = await supabase.functions.invoke('notion-auth', {
                    body: { code, redirect_uri: redirectUri },
                    headers: {
                        Authorization: `Bearer ${currentSession.access_token}`
                    }
                });

                if (invokeError) throw invokeError;
                if (data?.error) throw new Error(data.error.message || JSON.stringify(data.error));

                setStatus('success');
                if (data?.workspace_name) setWorkspaceName(data.workspace_name);

                // Limpa a URL e redireciona para o dashboard após 3 segundos
                setTimeout(() => {
                    window.history.replaceState({}, document.title, '/');
                    setCurrentPage('dashboard');
                }, 3000);

            } catch (err: any) {
                console.error('Notion auth error:', err);
                setStatus('error');
                setErrorMessage(err.message || 'Ocorreu um erro ao conectar com o Notion.');
            }
        };

        processCallback();
    }, [activeTenant?.id, setCurrentPage]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
            <div className="w-full max-w-md p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
                <div className="w-16 h-16 mx-auto mb-6 bg-slate-800 rounded-2xl border border-slate-700 flex items-center justify-center">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png" alt="Notion" className="w-8 h-8 object-contain" />
                </div>

                {status === 'loading' && (
                    <>
                        <Loader2 className="w-8 h-8 text-violet-500 animate-spin mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-white mb-2">Conectando ao Notion...</h2>
                        <p className="text-slate-400">Por favor, aguarde enquanto finalizamos a integração de forma segura.</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-12 h-12 mx-auto mb-4 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Notion Conectado!</h2>
                        <p className="text-emerald-400 mb-6">Integração bem-sucedida com o workspace <strong>{workspaceName}</strong>.</p>
                        <p className="text-sm text-slate-500">Redirecionando para a plataforma...</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="w-12 h-12 mx-auto mb-4 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center">
                            <XCircle className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Erro na Integração</h2>
                        <p className="text-rose-400 mb-6">{errorMessage}</p>
                        <button
                            onClick={() => {
                                window.history.replaceState({}, document.title, '/');
                                setCurrentPage('dashboard');
                            }}
                            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                        >
                            Voltar para o Dashboard
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
