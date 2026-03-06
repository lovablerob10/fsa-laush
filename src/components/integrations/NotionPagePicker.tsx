import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Check, X, FolderOpen, ExternalLink, Home } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface NotionPage {
    id: string;
    title: string;
    url: string;
    icon?: string;
}

interface Props {
    tenantId: string;
    exportTitle: string;
    exportContent: string;
    onClose: () => void;
}

export function NotionPagePicker({ tenantId, exportTitle, exportContent, onClose }: Props) {
    const [pages, setPages] = useState<NotionPage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [exportingId, setExportingId] = useState<string | null>(null);
    const [exported, setExported] = useState<string | null>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadPages();
        setTimeout(() => searchRef.current?.focus(), 100);
    }, []);

    async function loadPages(query?: string) {
        setLoading(true);
        setError('');
        try {
            const { data, error: fnError } = await supabase.functions.invoke('notion-pages', {
                body: { tenant_id: tenantId, query: query || '' },
                headers: {
                    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY
                }
            });
            if (fnError) throw fnError;
            if (data?.error) throw new Error(data.error);
            setPages(data?.pages || []);
        } catch (err: any) {
            setError(err.message || 'Erro ao buscar páginas do Notion');
        } finally {
            setLoading(false);
        }
    }

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => {
            loadPages(search);
        }, 400);
        return () => clearTimeout(t);
    }, [search]);

    async function exportToPage(pageId: string | null) {
        if (exportingId !== null) return;
        setExportingId(pageId ?? '__root__');
        try {
            const { data, error: fnError } = await supabase.functions.invoke('notion-export', {
                body: {
                    title: exportTitle,
                    content: exportContent,
                    tenant_id: tenantId,
                    override_page_id: pageId // null = workspace root
                },
                headers: {
                    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY
                }
            });
            if (fnError) throw fnError;
            if (data?.error) throw new Error(data.error);
            setExported(pageId ?? '__root__');
            setTimeout(() => onClose(), 1800);
        } catch (err: any) {
            alert('Erro ao exportar: ' + err.message);
            setExportingId(null);
        }
    }

    const filtered = pages.filter(p =>
        p.title.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-violet-950/60 to-slate-900">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png" alt="Notion" className="w-5 h-5 object-contain" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-white">Exportar para Notion</p>
                            <p className="text-xs text-slate-400 truncate max-w-[260px]">{exportTitle}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-4 py-3 border-b border-slate-800">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                        <input
                            ref={searchRef}
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar página no Notion..."
                            className="w-full pl-8 pr-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                        />
                    </div>
                </div>

                {/* Workspace root option */}
                <div className="px-4 pt-3">
                    <button
                        onClick={() => exportToPage(null)}
                        disabled={!!exportingId}
                        className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border text-sm font-medium mb-2',
                            exported === '__root__'
                                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                                : 'border-slate-700 hover:border-violet-500/40 hover:bg-violet-500/5 text-slate-300'
                        )}
                    >
                        <div className="w-7 h-7 bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
                            {exported === '__root__' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> :
                                exportingId === '__root__' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" /> :
                                    <Home className="w-3.5 h-3.5 text-slate-400" />}
                        </div>
                        <span>{exported === '__root__' ? '✅ Exportado para raiz!' : 'Raiz do Workspace'}</span>
                    </button>
                    <p className="text-[11px] text-slate-500 mb-2 px-1">Ou escolha uma página:</p>
                </div>

                {/* Pages list */}
                <div className="px-4 pb-4 max-h-64 overflow-y-auto space-y-1.5">
                    {loading && (
                        <div className="flex items-center justify-center py-8 text-slate-400">
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            <span className="text-sm">Buscando páginas...</span>
                        </div>
                    )}

                    {!loading && error && (
                        <div className="text-center py-6">
                            <p className="text-sm text-rose-400">{error}</p>
                        </div>
                    )}

                    {!loading && !error && filtered.length === 0 && (
                        <div className="text-center py-6">
                            <FolderOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                            <p className="text-sm text-slate-500">Nenhuma página encontrada</p>
                        </div>
                    )}

                    {!loading && filtered.map(page => {
                        const isExportingThis = exportingId === page.id;
                        const isDone = exported === page.id;
                        return (
                            <button
                                key={page.id}
                                onClick={() => exportToPage(page.id)}
                                disabled={!!exportingId}
                                className={cn(
                                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border text-sm group',
                                    isDone
                                        ? 'bg-emerald-500/10 border-emerald-500/40'
                                        : 'border-transparent hover:border-violet-500/30 hover:bg-violet-500/5'
                                )}
                            >
                                <div className="w-7 h-7 bg-slate-800 rounded-lg flex items-center justify-center shrink-0 text-sm">
                                    {isDone ? <Check className="w-3.5 h-3.5 text-emerald-400" /> :
                                        isExportingThis ? <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" /> :
                                            (page.icon || '📄')}
                                </div>
                                <span className={cn(
                                    'flex-1 truncate',
                                    isDone ? 'text-emerald-400' : 'text-slate-300 group-hover:text-white'
                                )}>
                                    {isDone ? `✅ Exportado!` : page.title}
                                </span>
                                {!isExportingThis && !isDone && (
                                    <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-violet-400 transition-colors shrink-0" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
