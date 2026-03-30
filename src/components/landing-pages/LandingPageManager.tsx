import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Globe, Sparkles, Loader2, Copy, Check, ExternalLink, Trash2,
  Eye, Code2, Users, Settings2, Plus, RefreshCw, Rocket,
  Monitor, Smartphone, ChevronRight, Download, ToggleLeft, ToggleRight,
  AlertCircle, CheckCircle2, Clock, Edit3, Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store';
import { briefingService } from '@/lib/services/briefingService';
import {
  LandingPage,
  listLandingPages,
  saveLandingPage,
  publishLandingPage,
  unpublishLandingPage,
  deleteLandingPage,
  updateLandingPageHtml,
  getLandingPagePublicUrl,
  getLandingPageLeads,
  generateLandingPageHtml,
} from '@/lib/services/landingPageService';
import { Button } from '@/components/ui/button';
import { generateExpertHeroImage } from '@/lib/services/agentService';

// ── Types ──────────────────────────────────────────────────────────────────

type Tab = 'preview' | 'code' | 'leads' | 'settings';
type PreviewDevice = 'desktop' | 'mobile';

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  created_at: string;
  stage: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}m atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

// ── Component ──────────────────────────────────────────────────────────────

export function LandingPageManager() {
  const { activeTenant, activeLaunch } = useAuthStore();
  const tenantId = activeTenant?.id;
  const launchId = activeLaunch?.id || null;

  const [pages, setPages] = useState<LandingPage[]>([]);
  const [activePage, setActivePage] = useState<LandingPage | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('preview');
  const [device, setDevice] = useState<PreviewDevice>('desktop');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savingCode, setSavingCode] = useState(false);
  const [editingCode, setEditingCode] = useState(false);

  // Expert hero image generation
  const [expertImageScene, setExpertImageScene] = useState<'hero' | 'about' | 'testimonial'>('hero');
  const [generatingExpertImage, setGeneratingExpertImage] = useState(false);
  const [expertImageResult, setExpertImageResult] = useState<{ base64: string; mimeType: string } | null>(null);
  const [briefingCache, setBriefingCache] = useState<import('@/lib/services/briefingService').BriefingData | null>(null);

  const [userNotes, setUserNotes] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [editableName, setEditableName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [codeContent, setCodeContent] = useState('');

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ── Load pages ─────────────────────────────────────────────────────────

  const loadPages = useCallback(async () => {
    if (!tenantId) return;
    try {
      const list = await listLandingPages(tenantId, launchId || undefined);
      setPages(list);
      if (list.length > 0 && !activePage) {
        setActivePage(list[0]);
        setCodeContent(list[0].html_content);
      }
    } catch (e: any) {
      showMsg('err', e.message);
    }
  }, [tenantId, launchId]);

  useEffect(() => { loadPages(); }, [loadPages]);

  // ── Load leads when tab changes ────────────────────────────────────────

  useEffect(() => {
    if (activeTab !== 'leads' || !activePage || !tenantId) return;
    setLeadsLoading(true);
    getLandingPageLeads(tenantId, activePage.id)
      .then(setLeads)
      .catch((e: any) => showMsg('err', e.message))
      .finally(() => setLeadsLoading(false));
  }, [activeTab, activePage?.id, tenantId]);

  // ── Sync code editor with active page ─────────────────────────────────

  useEffect(() => {
    if (activePage) {
      setCodeContent(activePage.html_content);
      setEditableName(activePage.name);
    }
  }, [activePage?.id]);

  // ── Helpers ────────────────────────────────────────────────────────────

  function showMsg(type: 'ok' | 'err', text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  }

  function selectPage(page: LandingPage) {
    setActivePage(page);
    setCodeContent(page.html_content);
    setEditableName(page.name);
    setEditingName(false);
    setEditingCode(false);
    setActiveTab('preview');
  }

  // ── Generate ───────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!tenantId) return;
    setGenerating(true);
    try {
      const briefing = await briefingService.fetchByTenant(tenantId);
      if (!briefing) throw new Error('Preencha o Briefing do Expert antes de gerar a landing page.');

      // Create a placeholder page first to get the ID (needed for the lead form endpoint)
      const placeholder = await saveLandingPage({
        tenant_id: tenantId,
        launch_id: launchId,
        name: `Landing Page v${pages.length + 1}`,
        html_content: '<html><body>Gerando...</body></html>',
        generation_params: { userNotes, generated_at: new Date().toISOString() },
      });

      const html = await generateLandingPageHtml(briefing, tenantId, launchId, placeholder.id, userNotes);

      const updated = await saveLandingPage({ ...placeholder, html_content: html });
      setPages(prev => [updated, ...prev.filter(p => p.id !== updated.id)]);
      setActivePage(updated);
      setCodeContent(html);
      setActiveTab('preview');
      showMsg('ok', '✅ Landing page gerada com sucesso!');
    } catch (e: any) {
      showMsg('err', e.message);
    } finally {
      setGenerating(false);
    }
  }

  // ── Publish / Unpublish ────────────────────────────────────────────────

  async function handleTogglePublish() {
    if (!activePage) return;
    setPublishing(true);
    try {
      const updated = activePage.status === 'published'
        ? await unpublishLandingPage(activePage.id)
        : await publishLandingPage(activePage.id);
      setActivePage(updated);
      setPages(prev => prev.map(p => p.id === updated.id ? updated : p));
      showMsg('ok', updated.status === 'published' ? '🚀 Página publicada!' : '📦 Página despublicada.');
    } catch (e: any) {
      showMsg('err', e.message);
    } finally {
      setPublishing(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!activePage || !confirm('Excluir esta landing page?')) return;
    setDeleting(true);
    try {
      await deleteLandingPage(activePage.id);
      const remaining = pages.filter(p => p.id !== activePage.id);
      setPages(remaining);
      setActivePage(remaining[0] || null);
      showMsg('ok', 'Página excluída.');
    } catch (e: any) {
      showMsg('err', e.message);
    } finally {
      setDeleting(false);
    }
  }

  // ── Save edited code ───────────────────────────────────────────────────

  async function handleSaveCode() {
    if (!activePage) return;
    setSavingCode(true);
    try {
      await updateLandingPageHtml(activePage.id, codeContent);
      const updated = { ...activePage, html_content: codeContent };
      setActivePage(updated);
      setPages(prev => prev.map(p => p.id === updated.id ? updated : p));
      setEditingCode(false);
      showMsg('ok', '✅ Código salvo!');
    } catch (e: any) {
      showMsg('err', e.message);
    } finally {
      setSavingCode(false);
    }
  }

  // ── Save name ──────────────────────────────────────────────────────────

  async function handleSaveName() {
    if (!activePage || !editableName.trim()) return;
    try {
      await saveLandingPage({ ...activePage, name: editableName.trim() });
      const updated = { ...activePage, name: editableName.trim() };
      setActivePage(updated);
      setPages(prev => prev.map(p => p.id === updated.id ? updated : p));
    } finally {
      setEditingName(false);
    }
  }

  // ── Copy URL ───────────────────────────────────────────────────────────

  function handleCopyUrl() {
    if (!activePage) return;
    navigator.clipboard.writeText(getLandingPagePublicUrl(activePage.id));
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  }

  // ── Download HTML ──────────────────────────────────────────────────────

  function handleDownload() {
    if (!activePage) return;
    const blob = new Blob([activePage.html_content], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${activePage.name.replace(/\s+/g, '-').toLowerCase()}.html`;
    a.click();
  }

  // ── Expert Hero Image Generation ───────────────────────────────────────

  async function handleGenerateExpertImage() {
    if (!tenantId) return;
    setGeneratingExpertImage(true);
    setExpertImageResult(null);
    try {
      const b = briefingCache || await briefingService.fetchByTenant(tenantId);
      if (b && !briefingCache) setBriefingCache(b);

      if (!b?.expert_photo_url) {
        showMsg('err', 'Adicione uma foto do expert no Briefing antes de gerar a imagem.');
        return;
      }

      const result = await generateExpertHeroImage(
        b.expert_photo_url,
        b.expert_name || 'Expert',
        b.product_name || 'Produto',
        b.brand_primary_color || '#7C3AED',
        b.brand_secondary_color || '#1E1B4B',
        expertImageScene
      );
      setExpertImageResult(result);
      showMsg('ok', '✅ Imagem gerada! Clique em "Inserir na Página" para aplicar.');
    } catch (e: any) {
      showMsg('err', e.message);
    } finally {
      setGeneratingExpertImage(false);
    }
  }

  async function handleInjectExpertImage() {
    if (!activePage || !expertImageResult) return;
    const dataUrl = `data:${expertImageResult.mimeType};base64,${expertImageResult.base64}`;

    let updated = activePage.html_content;
    const b = briefingCache;
    // Try replacing the expert photo URL first, then fall back to first <img>
    if (b?.expert_photo_url && updated.includes(b.expert_photo_url)) {
      updated = updated.replace(
        new RegExp(b.expert_photo_url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        dataUrl
      );
    } else {
      updated = updated.replace(/(<img\b[^>]*\bsrc=")([^"]+)(")/, `$1${dataUrl}$3`);
    }

    await updateLandingPageHtml(activePage.id, updated);
    const newPage = { ...activePage, html_content: updated };
    setActivePage(newPage);
    setCodeContent(updated);
    setPages(prev => prev.map(p => p.id === newPage.id ? newPage : p));
    showMsg('ok', '✅ Imagem do expert aplicada na landing page!');
  }

  // ── Render ─────────────────────────────────────────────────────────────

  const publicUrl = activePage ? getLandingPagePublicUrl(activePage.id) : '';

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">

      {/* ── Top Header ─────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-border/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Globe className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Landing Pages</h1>
              <p className="text-xs text-muted-foreground">Gere, publique e capture leads</p>
            </div>
          </div>

          {/* Status message */}
          {msg && (
            <div className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium',
              msg.type === 'ok' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
            )}>
              {msg.type === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {msg.text}
            </div>
          )}

          <div className="flex items-center gap-2">
            {activePage && (
              <>
                {/* Publish toggle */}
                <Button
                  onClick={handleTogglePublish}
                  disabled={publishing || !activePage.html_content || activePage.html_content.length < 100}
                  size="sm"
                  className={cn(
                    'gap-2 text-xs font-semibold',
                    activePage.status === 'published'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-violet-600 hover:bg-violet-700 text-white'
                  )}
                >
                  {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                    activePage.status === 'published' ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                  {activePage.status === 'published' ? 'Publicada' : 'Publicar'}
                </Button>

                {/* Copy URL */}
                {activePage.status === 'published' && (
                  <button
                    onClick={handleCopyUrl}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:border-violet-500/50 transition-colors"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedUrl ? 'Copiado!' : 'Copiar URL'}
                  </button>
                )}

                {/* Open in new tab */}
                {activePage.status === 'published' && (
                  <a href={publicUrl} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground hover:border-violet-500/50 transition-colors">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}

                <button onClick={handleDownload}
                  className="p-1.5 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground transition-colors">
                  <Download className="w-4 h-4" />
                </button>

                <button onClick={handleDelete} disabled={deleting}
                  className="p-1.5 rounded-lg border border-red-500/20 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left Panel: Pages list + Generate ──────────────────────── */}
        <div className="w-64 flex-shrink-0 border-r border-border/50 flex flex-col overflow-hidden">

          {/* Generate button */}
          <div className="p-3 border-b border-border/50 space-y-2">
            <Button
              onClick={handleGenerate}
              disabled={generating || !tenantId}
              className="w-full gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-violet-500/20"
            >
              {generating
                ? <><Loader2 className="w-4 h-4 animate-spin" />Gerando IA...</>
                : <><Sparkles className="w-4 h-4" />Gerar com IA</>}
            </Button>

            <textarea
              value={userNotes}
              onChange={e => setUserNotes(e.target.value)}
              placeholder="Notas opcionais (ex: foco em webinário, destacar bônus...)"
              rows={2}
              className="w-full text-xs bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-slate-300 placeholder-slate-600 resize-none focus:outline-none focus:border-violet-500/50"
            />
          </div>

          {/* Pages list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {pages.length === 0 && !generating && (
              <div className="text-center py-8 px-4">
                <Globe className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500">Nenhuma landing page ainda.</p>
                <p className="text-xs text-slate-600 mt-1">Clique em "Gerar com IA" para criar.</p>
              </div>
            )}
            {pages.map(page => (
              <button
                key={page.id}
                onClick={() => selectPage(page)}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-xl border transition-all',
                  activePage?.id === page.id
                    ? 'bg-violet-600/10 border-violet-500/30 text-violet-300'
                    : 'border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold truncate max-w-[130px]">{page.name}</span>
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                    page.status === 'published'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-slate-700/50 text-slate-500'
                  )}>
                    {page.status === 'published' ? '● Ativa' : '○ Rascunho'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-600">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{page.leads_count}</span>
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{page.views_count}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(page.created_at)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Right Panel ────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {activePage ? (
            <>
              {/* Page name + tabs */}
              <div className="flex-shrink-0 border-b border-border/50 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {editingName ? (
                    <div className="flex items-center gap-1">
                      <input
                        value={editableName}
                        onChange={e => setEditableName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                        className="text-sm font-semibold bg-slate-800 border border-violet-500/50 rounded px-2 py-0.5 text-white focus:outline-none"
                        autoFocus
                      />
                      <button onClick={handleSaveName} className="text-emerald-400 hover:text-emerald-300 transition-colors"><Save className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <button onClick={() => setEditingName(true)} className="flex items-center gap-1.5 group">
                      <span className="text-sm font-semibold text-foreground">{activePage.name}</span>
                      <Edit3 className="w-3 h-3 text-slate-600 group-hover:text-slate-400 transition-colors" />
                    </button>
                  )}
                </div>

                {/* Tab bar */}
                <div className="flex items-center gap-1 bg-slate-900/50 rounded-lg p-1">
                  {([
                    { id: 'preview', icon: Eye, label: 'Preview' },
                    { id: 'code', icon: Code2, label: 'Código' },
                    { id: 'leads', icon: Users, label: `Leads (${activePage.leads_count})` },
                    { id: 'settings', icon: Settings2, label: 'Config' },
                  ] as const).map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                        activeTab === tab.id
                          ? 'bg-violet-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      )}
                    >
                      <tab.icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Device toggle (preview only) */}
                {activeTab === 'preview' && (
                  <div className="flex items-center gap-1 bg-slate-900/50 rounded-lg p-1">
                    <button onClick={() => setDevice('desktop')} className={cn('p-1.5 rounded transition-colors', device === 'desktop' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300')}>
                      <Monitor className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDevice('mobile')} className={cn('p-1.5 rounded transition-colors', device === 'mobile' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300')}>
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-hidden">

                {/* PREVIEW */}
                {activeTab === 'preview' && (
                  <div className="h-full flex items-center justify-center bg-slate-950/50 p-4">
                    {generating ? (
                      <div className="text-center space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto animate-pulse">
                          <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-semibold">Gerando sua Landing Page...</p>
                          <p className="text-slate-400 text-sm mt-1">A IA está construindo sua página de alta conversão</p>
                        </div>
                        <div className="flex items-center justify-center gap-1.5">
                          {['Analisando briefing', 'Aplicando cores da marca', 'Construindo seções', 'Adicionando animações'].map((step, i) => (
                            <div key={i} className="flex items-center gap-1 text-[11px] text-slate-500">
                              <Loader2 className="w-3 h-3 animate-spin text-violet-400" />
                              {step}
                              {i < 3 && <ChevronRight className="w-3 h-3" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className={cn(
                        'h-full bg-white rounded-xl overflow-hidden shadow-2xl shadow-black/50 transition-all duration-300',
                        device === 'mobile' ? 'w-[390px]' : 'w-full'
                      )}>
                        <iframe
                          ref={iframeRef}
                          srcDoc={activePage.html_content}
                          className="w-full h-full border-0"
                          sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
                          title="Landing Page Preview"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* CODE */}
                {activeTab === 'code' && (
                  <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 flex-shrink-0">
                      <span className="text-xs text-slate-500 font-mono">index.html · {(activePage.html_content.length / 1024).toFixed(1)} KB</span>
                      <div className="flex items-center gap-2">
                        {editingCode ? (
                          <>
                            <button onClick={() => { setCodeContent(activePage.html_content); setEditingCode(false); }}
                              className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Cancelar</button>
                            <Button onClick={handleSaveCode} disabled={savingCode} size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1">
                              {savingCode ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                              Salvar
                            </Button>
                          </>
                        ) : (
                          <button onClick={() => setEditingCode(true)}
                            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-violet-400 transition-colors">
                            <Edit3 className="w-3.5 h-3.5" />Editar código
                          </button>
                        )}
                      </div>
                    </div>
                    <textarea
                      value={codeContent}
                      onChange={e => setCodeContent(e.target.value)}
                      readOnly={!editingCode}
                      className={cn(
                        'flex-1 font-mono text-xs p-4 bg-slate-950 text-slate-300 resize-none focus:outline-none leading-relaxed',
                        !editingCode && 'cursor-default select-text'
                      )}
                      spellCheck={false}
                    />
                  </div>
                )}

                {/* LEADS */}
                {activeTab === 'leads' && (
                  <div className="h-full overflow-y-auto p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">Leads Capturados</h3>
                        <p className="text-xs text-muted-foreground">{activePage.leads_count} leads via esta landing page</p>
                      </div>
                      <Button
                        onClick={() => {
                          if (!tenantId) return;
                          setLeadsLoading(true);
                          getLandingPageLeads(tenantId, activePage.id).then(setLeads).finally(() => setLeadsLoading(false));
                        }}
                        variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs gap-1.5">
                        <RefreshCw className={cn('w-3.5 h-3.5', leadsLoading && 'animate-spin')} />
                        Atualizar
                      </Button>
                    </div>

                    {leadsLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
                      </div>
                    ) : leads.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm font-medium">Nenhum lead ainda</p>
                        <p className="text-slate-600 text-xs mt-1">Publique a página e compartilhe a URL</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {leads.map(lead => (
                          <div key={lead.id} className="flex items-center gap-3 px-4 py-3 bg-slate-900/50 border border-slate-800/50 rounded-xl hover:border-violet-500/20 transition-colors">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-bold text-violet-400">{lead.name.charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{lead.name}</p>
                              <p className="text-xs text-muted-foreground">{lead.email || lead.phone}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full font-medium border border-emerald-500/20">
                                {lead.stage}
                              </span>
                              <p className="text-[10px] text-slate-600 mt-0.5">{timeAgo(lead.created_at)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* SETTINGS */}
                {activeTab === 'settings' && (
                  <div className="h-full overflow-y-auto p-6 space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-violet-400" />
                        Domínio Personalizado
                      </h3>
                      <div className="space-y-3">
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
                          <p className="text-xs text-slate-400 mb-2 font-medium">URL Pública (Supabase)</p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-[11px] text-violet-300 bg-slate-950/50 px-3 py-2 rounded-lg border border-slate-800 overflow-x-auto whitespace-nowrap">
                              {publicUrl}
                            </code>
                            <button onClick={handleCopyUrl} className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white transition-colors">
                              {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
                          <p className="text-xs text-slate-400 mb-1 font-medium">Domínio / Subdomínio Próprio</p>
                          <p className="text-[11px] text-slate-600 mb-3">Configure um CNAME no seu DNS apontando para a URL acima, ou use um proxy reverso (Cloudflare, Nginx).</p>
                          <input
                            placeholder="Ex: vendas.seudominio.com.br"
                            defaultValue={activePage.custom_domain || ''}
                            className="w-full text-sm bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-violet-500/50"
                          />
                          <div className="mt-3 p-3 bg-slate-950/30 rounded-lg border border-slate-800/50">
                            <p className="text-[11px] text-slate-500 font-mono">
                              1. Adicione no DNS: <span className="text-slate-300">CNAME vendas → {new URL(publicUrl).hostname}</span><br />
                              2. Ative o proxy no Cloudflare (ícone laranja)<br />
                              3. Aguarde propagação (até 24h)
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ── Expert Hero Image Generator ──────────────── */}
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-pink-400" />
                        Imagem do Expert com IA
                      </h3>
                      <p className="text-xs text-slate-500 mb-3">
                        A IA usa a foto do expert como referência e gera uma nova imagem profissional com as cores da sua marca — mantendo a face consistente.
                      </p>

                      {/* Scene selector */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {([
                          { id: 'hero', label: '🎯 Hero', desc: 'Pose frontal confiante' },
                          { id: 'about', label: '💼 Sobre', desc: 'Sentado, sorridente' },
                          { id: 'testimonial', label: '👤 Avatar', desc: 'Headshot circular' },
                        ] as const).map(s => (
                          <button
                            key={s.id}
                            onClick={() => setExpertImageScene(s.id)}
                            className={cn(
                              'p-2.5 rounded-xl border text-left transition-all',
                              expertImageScene === s.id
                                ? 'border-pink-500/50 bg-pink-500/10 text-pink-300'
                                : 'border-slate-700/50 text-slate-400 hover:border-slate-600'
                            )}
                          >
                            <p className="text-xs font-semibold">{s.label}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{s.desc}</p>
                          </button>
                        ))}
                      </div>

                      <Button
                        onClick={handleGenerateExpertImage}
                        disabled={generatingExpertImage}
                        className="w-full gap-2 bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-500 hover:to-violet-500 text-white font-semibold text-sm"
                      >
                        {generatingExpertImage
                          ? <><Loader2 className="w-4 h-4 animate-spin" />Gerando imagem...</>
                          : <><Sparkles className="w-4 h-4" />Gerar Imagem do Expert</>}
                      </Button>

                      {/* Result */}
                      {expertImageResult && (
                        <div className="mt-3 space-y-2">
                          <div className="rounded-xl overflow-hidden border border-pink-500/20 shadow-lg shadow-pink-500/10">
                            <img
                              src={`data:${expertImageResult.mimeType};base64,${expertImageResult.base64}`}
                              alt="Expert hero generated"
                              className="w-full object-cover max-h-72"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={handleInjectExpertImage}
                              disabled={!activePage}
                              size="sm"
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Inserir na Página
                            </Button>
                            <button
                              onClick={() => {
                                const a = document.createElement('a');
                                a.href = `data:${expertImageResult.mimeType};base64,${expertImageResult.base64}`;
                                a.download = `expert-hero-${expertImageScene}.${expertImageResult.mimeType.split('/')[1]}`;
                                a.click();
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white text-xs transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-600 text-center">
                            💡 Regere quantas vezes quiser para encontrar a versão ideal
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Rocket className="w-4 h-4 text-violet-400" />
                        Status da Página
                      </h3>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-3 text-center">
                          <p className="text-2xl font-bold text-violet-400">{activePage.views_count}</p>
                          <p className="text-xs text-slate-500 mt-0.5">Visualizações</p>
                        </div>
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-3 text-center">
                          <p className="text-2xl font-bold text-emerald-400">{activePage.leads_count}</p>
                          <p className="text-xs text-slate-500 mt-0.5">Leads</p>
                        </div>
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-3 text-center">
                          <p className="text-2xl font-bold text-amber-400">
                            {activePage.views_count > 0
                              ? `${((activePage.leads_count / activePage.views_count) * 100).toFixed(1)}%`
                              : '—'}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">Conversão</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4 max-w-sm">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20 flex items-center justify-center mx-auto">
                  <Globe className="w-10 h-10 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Nenhuma Landing Page</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Gere uma página de alta conversão em 1 clique usando o briefing do expert.
                  </p>
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={generating || !tenantId}
                  className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-violet-500/20"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {generating ? 'Gerando...' : 'Gerar Landing Page com IA'}
                </Button>
                <div className="flex items-start gap-2 text-left bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
                  <Sparkles className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-slate-300">O que será gerado:</p>
                    <ul className="text-xs text-slate-500 mt-1 space-y-0.5">
                      <li>✦ Hero com foto do expert + formulário de captura</li>
                      <li>✦ Cores da sua marca aplicadas automaticamente</li>
                      <li>✦ Seções: Problema, Solução, Bio, Prova Social, Oferta, FAQ</li>
                      <li>✦ Animações GSAP + Design dark premium</li>
                      <li>✦ Leads capturados direto no seu CRM</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
