import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Link as LinkIcon, Loader2, Check, ExternalLink, FolderOpen, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store';
import { supabase } from '@/lib/supabase/client';

// Extracts a Notion page ID from a URL or raw ID
function extractNotionPageId(input: string): string | null {
    if (!input) return null;
    // Handle URLs like: https://www.notion.so/My-Page-abc123def456...
    const urlMatch = input.match(/([a-f0-9]{32})(?:[?#]|$)/i);
    if (urlMatch) return urlMatch[1];
    // Also handle dashed UUID format
    const uuidMatch = input.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    if (uuidMatch) return uuidMatch[1].replace(/-/g, '');
    // Raw 32-char hex
    if (/^[a-f0-9]{32}$/i.test(input.trim())) return input.trim();
    return null;
}

export function Settings() {
    const { tenant } = useAuthStore() as any;
    const [notionConfig, setNotionConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [pageUrlInput, setPageUrlInput] = useState('');
    const [savingPage, setSavingPage] = useState(false);
    const [saveMsg, setSaveMsg] = useState('');

    useEffect(() => {
        async function fetchIntegrations() {
            if (!tenant?.id) return;
            try {
                const { data } = await supabase
                    .from('tenant_notion_config')
                    .select('*')
                    .eq('tenant_id', tenant.id)
                    .maybeSingle();

                setNotionConfig(data || null);
                if (data?.default_page_id) {
                    setPageUrlInput(data.default_page_id);
                }
            } catch (err) {
                console.error('Erro ao buscar integrações:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchIntegrations();
    }, [tenant?.id]);

    const handleConnectNotion = () => {
        const clientId = import.meta.env.VITE_NOTION_CLIENT_ID;
        const redirectUri = import.meta.env.VITE_NOTION_REDIRECT_URI;
        if (!clientId) { alert('VITE_NOTION_CLIENT_ID não configurado no .env'); return; }
        const notionAuthUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${clientId}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}`;
        window.location.href = notionAuthUrl;
    };

    const handleDisconnectNotion = async () => {
        if (!confirm('Tem certeza que deseja desconectar o Notion?')) return;
        try {
            setLoading(true);
            await supabase.from('tenant_notion_config').delete().eq('tenant_id', tenant.id);
            setNotionConfig(null);
            setPageUrlInput('');
        } catch (err) {
            console.error('Erro ao desconectar Notion:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveDefaultPage = async () => {
        setSaveMsg('');
        const pageId = extractNotionPageId(pageUrlInput);
        if (!pageId && pageUrlInput.trim()) {
            setSaveMsg('URL ou ID inválido. Cole o link completo da página do Notion.');
            return;
        }

        setSavingPage(true);
        try {
            const { error } = await supabase
                .from('tenant_notion_config')
                .update({ default_page_id: pageId || null })
                .eq('tenant_id', tenant.id);

            if (error) throw error;
            setNotionConfig((prev: any) => ({ ...prev, default_page_id: pageId }));
            setSaveMsg(pageId ? '✅ Página de destino salva! Exports irão para essa página.' : '✅ Removed. Exports vão para a raiz do workspace.');
            setTimeout(() => setSaveMsg(''), 4000);
        } catch (err: any) {
            setSaveMsg('Erro ao salvar: ' + err.message);
        } finally {
            setSavingPage(false);
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
                        <div className="rounded-xl border border-slate-800 bg-slate-800/30 overflow-hidden">
                            {/* Header row */}
                            <div className="p-5 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
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
                                            <div className="mt-2 text-sm text-slate-300 flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 w-fit">
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

                            {/* Default page config - only when connected */}
                            {notionConfig && (
                                <div className="border-t border-slate-800 px-5 py-4 bg-slate-900/40">
                                    <div className="flex items-center gap-2 mb-3">
                                        <FolderOpen className="w-4 h-4 text-violet-400" />
                                        <span className="text-sm font-medium text-slate-300">Página de Destino dos Exports</span>
                                        {notionConfig.default_page_id && (
                                            <span className="px-2 py-0.5 text-xs bg-violet-500/20 text-violet-400 rounded border border-violet-500/20">Configurada</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mb-3">
                                        Cole o link de uma página do Notion para que todos os exports sejam criados como subpáginas dentro dela.
                                        Deixe em branco para exportar na raiz do workspace.
                                    </p>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={pageUrlInput}
                                            onChange={e => setPageUrlInput(e.target.value)}
                                            placeholder="https://notion.so/Minha-Pagina-abc123..."
                                            className="flex-1 px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                                        />
                                        <Button
                                            onClick={handleSaveDefaultPage}
                                            disabled={savingPage}
                                            className="bg-violet-600 hover:bg-violet-700 shrink-0"
                                            size="sm"
                                        >
                                            {savingPage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            <span className="ml-1">Salvar</span>
                                        </Button>
                                        {notionConfig.default_page_id && (
                                            <a
                                                href={`https://notion.so/${notionConfig.default_page_id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors flex items-center"
                                                title="Abrir página no Notion"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        )}
                                    </div>
                                    {saveMsg && (
                                        <p className={`mt-2 text-xs ${saveMsg.startsWith('✅') ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {saveMsg}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
