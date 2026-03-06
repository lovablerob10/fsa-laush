import { useEffect, useRef, useState } from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useUIStore } from '@/store';

export function NotionCallback() {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState('');
    const [workspaceName, setWorkspaceName] = useState('');
    const { setCurrentPage } = useUIStore();
    const hasProcessed = useRef(false); // Guard against double execution (React StrictMode)

    useEffect(() => {
        if (hasProcessed.current) return; // Already processing or processed — bail out
        hasProcessed.current = true;

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

                // Aguardar a sessão do Supabase ser restaurada após o redirect externo
                let currentSession = null;
                for (let i = 0; i < 15; i++) {
                    const { data } = await supabase.auth.getSession();
                    if (data?.session) {
                        currentSession = data.session;
                        break;
                    }
                    await new Promise(res => setTimeout(res, 400));
                }

                if (!currentSession) {
                    throw new Error('Sessão expirada. Volte ao Dashboard, faça login e tente novamente.');
                }

                // Buscar tenant_id diretamente do banco usando o user.id da sessão
                const userId = currentSession.user.id;
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('tenant_id')
                    .eq('id', userId)
                    .returns<{ tenant_id: string }[]>()
                    .single();

                const tenantId = (userData as { tenant_id: string } | null)?.tenant_id;

                if (userError || !tenantId) {
                    throw new Error(`Não foi possível identificar seu tenant (user_id: ${userId}). Entre em contato com o suporte.`);
                }
                const redirectUri = `${window.location.origin}/integrations/notion/callback`;

                const { data, error: invokeError } = await supabase.functions.invoke('notion-auth', {
                    body: {
                        code,
                        redirect_uri: redirectUri,
                        tenant_id: tenantId
                    },
                    headers: {
                        Authorization: `Bearer ${currentSession.access_token}`
                    }
                });

                if (invokeError) throw invokeError;
                if (data?.error) throw new Error(data.error);

                setStatus('success');
                if (data?.workspace_name) setWorkspaceName(data.workspace_name);

                // Redireciona para o dashboard após 2 segundos
                setTimeout(() => {
                    window.location.replace('/');
                }, 2000);

            } catch (err: any) {
                console.error('Notion auth error:', err);
                setStatus('error');
                setErrorMessage(err.message || 'Ocorreu um erro ao conectar com o Notion.');
            }
        };

        processCallback();
    }, [setCurrentPage]);

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
