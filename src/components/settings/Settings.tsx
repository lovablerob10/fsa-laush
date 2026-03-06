import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Link as LinkIcon, AlertCircle, Loader2, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store';
import { supabase } from '@/lib/supabase/client';

export function Settings() {
    const { activeTenant } = useAuthStore() as any;
    const [notionConfig, setNotionConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchIntegrations() {
            if (!activeTenant?.id) return;
            try {
                const { data } = await supabase
                    .from('tenant_notion_config')
                    .select('*')
                    .eq('tenant_id', activeTenant.id)
                    .single();

                setNotionConfig(data || null);
            } catch (err) {
                console.error('Erro ao buscar integrações:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchIntegrations();
    }, [activeTenant?.id]);

    const handleConnectNotion = () => {
        const clientId = import.meta.env.VITE_NOTION_CLIENT_ID;
        const redirectUri = import.meta.env.VITE_NOTION_REDIRECT_URI;

        if (!clientId) {
            alert('VITE_NOTION_CLIENT_ID não configurado no .env');
            return;
        }

        const notionAuthUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${clientId}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}`;
        window.location.href = notionAuthUrl;
    };

    const handleDisconnectNotion = async () => {
        if (!confirm('Tem certeza que deseja desconectar o Notion? Requererá nova autorização para voltar a usar.')) return;

        try {
            setLoading(true);
            await supabase
                .from('tenant_notion_config')
                .delete()
                .eq('tenant_id', activeTenant.id);

            setNotionConfig(null);
        } catch (err) {
            console.error('Erro ao desconectar Notion:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
                    <SettingsIcon className="w-6 h-6 text-slate-300" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Configurações</h1>
                    <p className="text-slate-400">Gerencie as preferências e integrações do cliente.</p>
                </div>
            </div>

            <div className="space-y-6">
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <LinkIcon className="w-5 h-5 text-violet-400" />
                            Integrações
                        </CardTitle>
                        <CardDescription>
                            Conecte suas contas externas para automatizar fluxos com o FSA Launch Lab.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* NOTION INTEGRATION */}
                        <div className="p-5 rounded-xl border border-slate-800 bg-slate-800/30 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 shrink-0 bg-white rounded-xl p-2 flex items-center justify-center shadow-lg">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png" alt="Notion" className="w-8 h-8 object-contain" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                        Notion
                                        {notionConfig && (
                                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                                <Check className="w-3 h-3" /> Conectado
                                            </span>
                                        )}
                                    </h3>
                                    <p className="text-sm text-slate-400 mt-1 max-w-md">
                                        Exporte briefings, calendários de ações e copys diretamente para o seu workspace do Notion.
                                    </p>

                                    {notionConfig && (
                                        <div className="mt-3 text-sm text-slate-300 flex items-center gap-2 bg-slate-800/80 px-3 py-2 rounded-lg border border-slate-700 w-fit">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                            Workspace: <strong className="text-white">{notionConfig.workspace_name}</strong>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="shrink-0 w-full md:w-auto">
                                {loading ? (
                                    <Button disabled className="w-full md:w-auto">
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Carregando...
                                    </Button>
                                ) : notionConfig ? (
                                    <Button variant="outline" className="w-full md:w-auto text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border-slate-700" onClick={handleDisconnectNotion}>
                                        Desconectar
                                    </Button>
                                ) : (
                                    <Button className="w-full md:w-auto bg-violet-600 hover:bg-violet-700" onClick={handleConnectNotion}>
                                        Conectar ao Notion
                                    </Button>
                                )}
                            </div>
                        </div>

                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
