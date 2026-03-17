import { useState, useEffect, useCallback } from 'react';
import {
  Save, Sparkles, Loader2, ChevronRight, ChevronLeft, Check, Plus, X,
  User, Package, Target, Lightbulb, Palette, Wand2, Calendar, ArrowRight,
  ExternalLink, Upload, Camera, BookOpen, FileText, Trash2
} from 'lucide-react';

import { useAuthStore, useUIStore } from '@/store';
import { cn } from '@/lib/utils';
import { briefingService, generateWithGemini, generateFieldSuggestion, generate7WeekPlan, BriefingData } from '@/lib/services/briefingService';
import { supabase } from '@/lib/supabase/client';
import { NotionPagePicker } from '@/components/integrations/NotionPagePicker';

/** Convert basic markdown from Gemini output to clean HTML */
function renderMarkdown(text: string): string {
  let html = text
    // Escape HTML entities
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Headers: ### h3, ## h2, # h1
    .replace(/^### (.+)$/gm, '<h4 class="font-bold text-foreground mt-4 mb-1">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="font-bold text-foreground text-base mt-5 mb-1.5">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="font-bold text-foreground text-lg mt-6 mb-2">$1</h2>')
    // Bold: **text**
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    // Italic: *text*
    .replace(/(?<![*])\*(?![*])(.+?)(?<![*])\*(?![*])/g, '<em>$1</em>')
    // Links: [text](url)
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-violet-400 hover:text-violet-300 underline">$1</a>')
    // Horizontal rule: ---
    .replace(/^-{3,}$/gm, '<hr class="border-border/30 my-3" />')
    // Bullet lists: * item or - item
    .replace(/^[*\-] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    // Line breaks
    .replace(/\n/g, '<br />');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li[^>]*>.*?<\/li>(?:<br \/>)?)+)/g, (match) => {
    const cleaned = match.replace(/<br \/>/g, '');
    return `<ul class="space-y-0.5 my-2">${cleaned}</ul>`;
  });

  // Remove orphan <br /> after block elements
  html = html.replace(/(<\/h[234]>)<br \/>/g, '$1');
  html = html.replace(/(<hr[^>]*\/>)<br \/>/g, '$1');
  html = html.replace(/(<\/ul>)<br \/>/g, '$1');

  return html;
}

const STEPS = [
  { id: 1, title: 'Dados do Expert', icon: User, desc: 'Quem está vendendo' },
  { id: 2, title: 'O Produto', icon: Package, desc: 'O que está sendo vendido' },
  { id: 3, title: 'Público-Alvo', icon: Target, desc: 'Para quem é' },
  { id: 4, title: 'Promessa Central', icon: Lightbulb, desc: 'Por que comprar' },
  { id: 5, title: 'Identidade de Marca', icon: Palette, desc: 'Como comunicar' },
  { id: 6, title: 'Gerar Conteúdo IA', icon: Sparkles, desc: 'IA cria o material' },
  { id: 7, title: 'Dossiê IA', icon: BookOpen, desc: 'Cérebro do expert' },
];

function TagInput({ label, values, onChange, placeholder, onGenerateAI, isGenerating }: {
  label: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string;
  onGenerateAI?: () => void; isGenerating?: boolean;
}) {
  const [input, setInput] = useState('');
  function add() {
    const val = input.trim();
    if (val && !values.includes(val)) { onChange([...values, val]); setInput(''); }
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-foreground">{label}</label>
        {onGenerateAI && (
          <button
            type="button"
            onClick={onGenerateAI}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-2 py-1 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {isGenerating ? 'Gerando...' : 'Auto-preencher'}
          </button>
        )}
      </div>
      <div className="flex gap-2 mb-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder={placeholder || 'Digite e pressione Enter'}
          className="input-theme flex-1" />
        <button type="button" onClick={add}
          className="px-3 py-2.5 bg-violet-600 text-foreground rounded-xl text-sm hover:bg-violet-700 transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {values.map((v, i) => (
          <span key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-500/10 text-violet-300 rounded-full text-xs font-medium border border-violet-500/20">
            {v}
            <button onClick={() => onChange(values.filter((_, j) => j !== i))} className="hover:text-red-400 transition-colors">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children, onGenerateAI, isGenerating }: { label: string; children: React.ReactNode; onGenerateAI?: () => void; isGenerating?: boolean }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-foreground">{label}</label>
        {onGenerateAI && (
          <button
            type="button"
            onClick={onGenerateAI}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-2 py-1 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {isGenerating ? 'Gerando...' : 'Auto-preencher'}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

export function ExpertBriefing() {
  const { activeTenant } = useAuthStore() as any;
  const { setCurrentPage } = useUIStore() as any;
  const tenantId = activeTenant?.id;

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [generating, setGenerating] = useState<string | null>(null);
  const [generatingField, setGeneratingField] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<Record<string, string>>({});
  const [planGenerated, setPlanGenerated] = useState(false);
  const [planGenerating, setPlanGenerating] = useState(false);
  const [planError, setPlanError] = useState('');
  const [exportingNotion, setExportingNotion] = useState<string | null>(null);
  const [notionPicker, setNotionPicker] = useState<{ type: string; title: string; content: string } | null>(null);
  // Multi-photo upload: up to 10 expert photos stored as { dataUrl, name }[]
  const [expertPhotos, setExpertPhotos] = useState<Array<{ dataUrl: string; name: string; aspectRatio: string; usageType: string; isPrimary: boolean }>>([]);
  // Knowledge Base state
  const [kbDocuments, setKbDocuments] = useState<any[]>([]);
  const [kbLoading, setKbLoading] = useState(false);
  const [kbIngesting, setKbIngesting] = useState(false);
  const [kbNewText, setKbNewText] = useState('');
  const [kbNewTitle, setKbNewTitle] = useState('');
  // Framework state — resolved frameworks per type (with IDs for toggling)
  const [resolvedFrameworks, setResolvedFrameworks] = useState<Record<string, { items: { id: string; name: string }[]; count: number }>>({});
  // Disabled framework IDs (user toggled off)
  const [disabledFrameworkIds, setDisabledFrameworkIds] = useState<Set<string>>(new Set());
  // Which card's framework panel is expanded
  const [expandedFrameworkCard, setExpandedFrameworkCard] = useState<string | null>(null);

  const toggleFramework = (id: string) => {
    setDisabledFrameworkIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const getActiveCount = (type: string) => {
    const rf = resolvedFrameworks[type];
    if (!rf) return 0;
    return rf.items.filter(f => !disabledFrameworkIds.has(f.id)).length;
  };

  // Load resolved frameworks when entering Step 6
  useEffect(() => {
    if (step !== 6 || !tenantId) return;
    (async () => {
      try {
        const { resolveAllFrameworks } = await import('@/lib/services/frameworkService');
        const types = ['page', 'email_sequence', 'whatsapp'];
        const result: Record<string, { items: { id: string; name: string }[]; count: number }> = {};
        for (const t of types) {
          const resolved = await resolveAllFrameworks(tenantId, t);
          result[t] = { items: resolved.all.map(f => ({ id: f.id, name: f.name })), count: resolved.all.length };
        }
        setResolvedFrameworks(result);
      } catch { /* ignore */ }
    })();
  }, [step, tenantId]);

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const remaining = 10 - expertPhotos.length;
    const toProcess = files.slice(0, remaining);
    toProcess.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        const dataUrl = ev.target?.result as string;
        setExpertPhotos(prev => {
          const isFirst = prev.length === 0;
          const updated = [...prev, { dataUrl, name: file.name, aspectRatio: '1:1', usageType: 'geral', isPrimary: isFirst }].slice(0, 10);
          set('expert_photo_url', updated.find(p => p.isPrimary)?.dataUrl || updated[0]?.dataUrl || '');
          return updated;
        });
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }

  function setPhotoMeta(idx: number, key: string, value: any) {
    setExpertPhotos(prev => {
      const updated = [...prev];
      if (key === 'isPrimary' && value === true) {
        updated.forEach(p => p.isPrimary = false);
      }
      (updated[idx] as any)[key] = value;
      if (key === 'isPrimary') {
        set('expert_photo_url', updated.find(p => p.isPrimary)?.dataUrl || updated[0]?.dataUrl || '');
      }
      return updated;
    });
  }

  function removePhoto(idx: number) {
    setExpertPhotos(prev => {
      const updated = prev.filter((_, i) => i !== idx);
      set('expert_photo_url', updated[0]?.dataUrl || '');
      return updated;
    });
  }


  const [data, setData] = useState<BriefingData>({
    tenant_id: tenantId || '',
    expert_name: '', expert_bio: '', expert_photo_url: '', expert_credentials: [],
    product_name: '', product_description: '', product_price: undefined,
    product_installments: 12, product_bonuses: [], product_guarantee: '7 dias',
    target_audience: '', audience_pain_points: [], audience_desires: [], audience_objections: [],
    main_promise: '', main_benefit: '', differentiation: '',
    voice_tones: [], words_to_use: [], words_to_avoid: [],
    status: 'draft',
  });

  useEffect(() => {
    if (!tenantId) return;
    setData(d => ({ ...d, tenant_id: tenantId }));
    briefingService.fetchByTenant(tenantId).then(b => { if (b) setData(b); });
  }, [tenantId]);

  const set = useCallback((field: keyof BriefingData, value: any) => {
    setData(d => ({ ...d, [field]: value }));
  }, []);

  async function handleSave(approve = false) {
    if (!tenantId) return;
    setSaving(true); setSaveMsg('');
    try {
      const toSave = { ...data, tenant_id: tenantId, status: approve ? 'approved' as const : data.status };
      const saved = await briefingService.save(toSave);
      if (saved) setData(saved);
      setSaveMsg(approve ? '✅ Briefing aprovado!' : '✅ Salvo!');

      // OPRF: Auto-ingestão na Knowledge Base (fire-and-forget)
      import('@/lib/services/knowledgeService').then(({ ingestBriefing }) => {
        ingestBriefing(tenantId, toSave).then(docId => {
          if (docId) console.log('[OPRF] Briefing ingerido na Knowledge Base:', docId);
        }).catch(err => console.warn('[OPRF] Erro ao ingerir briefing:', err.message));
      });
    } catch (err: any) { setSaveMsg(`❌ ${err.message}`); }
    finally { setSaving(false); setTimeout(() => setSaveMsg(''), 3000); }
  }

  async function handleGenerate(type: string) {
    setGenerating(type);
    try {
      const content = await generateWithGemini(data, type, tenantId || undefined);
      setGeneratedContent(prev => ({ ...prev, [type]: content }));
      // Auto-ingestão no Dossiê IA
      if (tenantId) {
        import('@/lib/services/knowledgeService').then(({ ingestGeneratedContent }) => {
          ingestGeneratedContent(tenantId, type, content, data.expert_name).catch(console.error);
        });
      }
    } catch (err: any) { alert('Erro: ' + err.message); }
    finally { setGenerating(null); }
  }

  function handleExportToNotion(type: string, titleStr: string, content: string) {
    setNotionPicker({ type, title: titleStr, content });
  }


  async function handleGeneratePlan() {
    if (!tenantId) return;
    setPlanGenerating(true);
    setPlanError('');
    setPlanGenerated(false);
    try {
      // 1. Generate 7-week plan with Gemini 2.5 Pro
      const plan = await generate7WeekPlan(data, tenantId || undefined);

      // 2. Create launch record
      const { data: launchData, error: launchError } = await (supabase.from('launches') as any)
        .insert({
          tenant_id: tenantId,
          name: plan.launch_name,
          product_name: data.product_name || plan.launch_name,
          start_date: new Date().toISOString().split('T')[0],
          current_week: 1,
          status: 'active',
        })
        .select()
        .single();
      if (launchError) throw launchError;
      const launchId = (launchData as any).id;

      // 3. Create phases and tasks
      for (const week of plan.weeks) {
        const phaseColors: Record<string, string> = {
          planning: 'bg-blue-500', anticipation: 'bg-violet-500',
          sales: 'bg-emerald-500', immersion: 'bg-amber-500', upsell: 'bg-rose-500',
        };
        const { data: phaseData, error: phaseError } = await (supabase.from('launch_phases') as any)
          .insert({
            launch_id: launchId,
            tenant_id: tenantId,
            name: week.theme,
            week_start: week.week_start,
            week_end: week.week_end,
            status: 'pending',
            color: phaseColors[week.phase] || 'bg-violet-500',
          })
          .select()
          .single();
        if (phaseError) throw phaseError;
        const phaseId = (phaseData as any).id;

        // Insert tasks for this phase
        if (week.tasks?.length) {
          const tasksToInsert = week.tasks.map((t) => ({
            phase_id: phaseId,
            tenant_id: tenantId,
            name: t.name,
            description: t.description || '',
            priority: t.priority || 'medium',
            status: 'pending',
          }));
          await (supabase.from('tasks') as any).insert(tasksToInsert);
        }
      }

      setPlanGenerated(true);
    } catch (err: any) {
      console.error('Plan generation error:', err);
      setPlanError(err.message || 'Erro ao gerar plano');
    } finally {
      setPlanGenerating(false);
    }
  }

  async function handleGenerateField(fieldKey: keyof BriefingData, fieldTitle: string) {
    if (!tenantId) return;
    setGeneratingField(fieldKey as string);
    try {
      const suggestion = await generateFieldSuggestion(data, fieldKey as string, fieldTitle);

      const isArrayField = ['expert_credentials', 'product_bonuses', 'audience_pain_points', 'audience_desires', 'audience_objections', 'voice_tones', 'words_to_use', 'words_to_avoid'].includes(fieldKey as string);

      if (isArrayField) {
        const newItems = suggestion.split(/[\n,]+/).map(s => s.trim().replace(/^[-*•]\s*/, '')).filter(Boolean);
        const existing = (data[fieldKey] as string[]) || [];
        const unique = Array.from(new Set([...existing, ...newItems]));
        set(fieldKey, unique);
      } else {
        set(fieldKey, suggestion);
      }
    } catch (err: any) {
      alert('Erro ao gerar com IA: ' + err.message);
    } finally {
      setGeneratingField(null);
    }
  }

  const progress = (step / STEPS.length) * 100;
  const geminiConfigured = !!import.meta.env.VITE_GEMINI_API_KEY;

  if (!tenantId) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-secondary/50 border border-border/50 flex items-center justify-center mx-auto mb-4 neon-glow">
            <Target className="w-8 h-8 text-violet-400" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Selecione um cliente</h2>
          <p className="text-muted-foreground">Use o seletor na sidebar para escolher o cliente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Notion Page Picker Modal */}
      {notionPicker && tenantId && (
        <NotionPagePicker
          tenantId={tenantId}
          exportTitle={notionPicker.title}
          exportContent={notionPicker.content}
          onClose={() => setNotionPicker(null)}
        />
      )}
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/60">
        <div className="px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Briefing do Expert</h1>
            <p className="text-muted-foreground text-sm">
              Cliente: <span className="text-violet-400 font-medium">{activeTenant?.name}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {saveMsg && <span className="text-sm font-medium text-foreground">{saveMsg}</span>}
            <div className="hidden md:flex items-center gap-2">
              <div className="w-28 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs text-muted-foreground">{step}/{STEPS.length}</span>
            </div>
            <button onClick={() => handleSave()} disabled={saving} className="btn-premium flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar
            </button>
          </div>
        </div>

        {/* Step tabs */}
        <div className="px-6 pb-4 max-w-5xl mx-auto">
          <div className="flex flex-wrap gap-2 pb-2 justify-start items-center">
            {STEPS.map(s => {
              const Icon = s.icon;
              return (
                <button key={s.id} onClick={() => setStep(s.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all border',
                    step === s.id
                      ? 'bg-violet-600/15 text-violet-300 border-violet-500/30'
                      : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground border-transparent'
                  )}>
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{s.title}</span>
                  {s.id < step && <Check className="w-3 h-3 text-emerald-400" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {step === 1 && (
          <div className="glass-card p-8">
            <div className="border-b border-border/60 pb-4 mb-6">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <User className="w-5 h-5 text-violet-400" /> Dados do Expert
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Informações sobre quem está vendendo</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-5">
                <Field label="Nome Completo do Expert *">
                  <input value={data.expert_name || ''} onChange={e => set('expert_name', e.target.value)} placeholder="Ex: João Silva" className="input-theme" />
                </Field>
                <Field label="Biografia / História do Expert *" onGenerateAI={() => handleGenerateField('expert_bio', 'Biografia / História do Expert')} isGenerating={generatingField === 'expert_bio'}>
                  <textarea value={data.expert_bio || ''} onChange={e => set('expert_bio', e.target.value)} rows={9} placeholder="Conte a trajetória, conquistas e resultados..." className="input-theme resize-none" />
                </Field>
              </div>

              <div className="space-y-6">
                {/* Multi-photo upload — up to 10 photos */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-violet-400" /> Fotos do Expert
                      <span className="text-xs text-muted-foreground ml-1">({expertPhotos.length}/10)</span>
                    </label>
                    {expertPhotos.length < 10 && (
                      <label className="cursor-pointer flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 border border-violet-500/30 rounded-lg px-3 py-1.5 transition-colors hover:bg-violet-500/10">
                        <Upload className="w-3.5 h-3.5" />
                        {expertPhotos.length === 0 ? 'Enviar fotos' : 'Adicionar mais'}
                        <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
                      </label>
                    )}
                  </div>
                  {expertPhotos.length === 0 ? (
                    <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-border/60 rounded-xl cursor-pointer hover:border-violet-400/60 hover:bg-violet-500/5 transition-all">
                      <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Arraste ou clique para enviar fotos do expert</span>
                      <span className="text-xs text-muted-foreground mt-0.5">Até 10 fotos • JPG, PNG, WebP</span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
                    </label>
                  ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                      {expertPhotos.map((photo, idx) => (
                        <div key={idx} className={cn('relative group rounded-xl overflow-hidden border transition-all', photo.isPrimary ? 'border-violet-500/60 ring-2 ring-violet-500/20' : 'border-border/60')}>
                          <div className="aspect-square">
                            <img src={photo.dataUrl} alt={photo.name} className="w-full h-full object-cover" />
                          </div>
                          {/* Primary badge */}
                          {photo.isPrimary && (
                            <div className="absolute top-1.5 left-1.5 bg-violet-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">⭐ Principal</div>
                          )}
                          {/* Delete button */}
                          <button
                            onClick={() => removePhoto(idx)}
                            className="absolute top-1.5 right-1.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                          {/* Metadata controls */}
                          <div className="p-2 bg-black/40 backdrop-blur-sm space-y-1.5">
                            <div className="flex gap-1.5">
                              <select
                                value={photo.aspectRatio}
                                onChange={e => setPhotoMeta(idx, 'aspectRatio', e.target.value)}
                                className="flex-1 text-[10px] bg-black/40 text-white border border-white/20 rounded px-1 py-0.5"
                              >
                                <option value="1:1">1:1 Feed</option>
                                <option value="16:9">16:9 Landscape</option>
                                <option value="9:16">9:16 Stories</option>
                                <option value="4:5">4:5 Facebook</option>
                                <option value="3:4">3:4 Pinterest</option>
                              </select>
                              <select
                                value={photo.usageType}
                                onChange={e => setPhotoMeta(idx, 'usageType', e.target.value)}
                                className="flex-1 text-[10px] bg-black/40 text-white border border-white/20 rounded px-1 py-0.5"
                              >
                                <option value="geral">Geral</option>
                                <option value="perfil">Perfil</option>
                                <option value="hero">Hero/Banner</option>
                                <option value="stories">Stories</option>
                                <option value="thumbnail">Thumbnail</option>
                              </select>
                            </div>
                            {!photo.isPrimary && (
                              <button
                                onClick={() => setPhotoMeta(idx, 'isPrimary', true)}
                                className="w-full text-[10px] text-violet-300 hover:text-violet-200 transition-colors"
                              >
                                Definir como principal
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {expertPhotos.length < 10 && (
                        <label className="aspect-square rounded-xl border-2 border-dashed border-border/60 flex flex-col items-center justify-center cursor-pointer hover:border-violet-400/60 transition-colors gap-1">
                          <Plus className="w-5 h-5 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">Adicionar</span>
                          <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
                        </label>
                      )}
                    </div>
                  )}
                </div>
                
                <TagInput label="Credenciais" values={data.expert_credentials || []} onChange={v => set('expert_credentials', v)} placeholder="Ex: MBA em Marketing → Enter" onGenerateAI={() => handleGenerateField('expert_credentials', 'Credenciais Acadêmicas ou Profissionais')} isGenerating={generatingField === 'expert_credentials'} />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="glass-card p-8">
            <div className="border-b border-border/60 pb-4 mb-6">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Package className="w-5 h-5 text-violet-400" /> O Produto</h2>
              <p className="text-sm text-muted-foreground mt-1">O que está sendo vendido</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-5">
                <Field label="Nome do Produto *"><input value={data.product_name || ''} onChange={e => set('product_name', e.target.value)} placeholder="Ex: Método Corpo Transformado" className="input-theme" /></Field>
                <Field label="Descrição *" onGenerateAI={() => handleGenerateField('product_description', 'Descrição Comercial do Produto')} isGenerating={generatingField === 'product_description'}><textarea value={data.product_description || ''} onChange={e => set('product_description', e.target.value)} rows={7} placeholder="O que o cliente vai receber?" className="input-theme resize-none" /></Field>
              </div>
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Preço (R$) *"><input type="number" value={data.product_price || ''} onChange={e => set('product_price', parseFloat(e.target.value))} placeholder="997" className="input-theme" /></Field>
                  <Field label="Parcelas"><select value={data.product_installments || 12} onChange={e => set('product_installments', parseInt(e.target.value))} className="input-theme">
                    {[1, 2, 3, 4, 6, 8, 10, 12].map(n => <option key={n} value={n}>{n}x</option>)}
                  </select></Field>
                </div>
                <Field label="Garantia"><select value={data.product_guarantee || '7 dias'} onChange={e => set('product_guarantee', e.target.value)} className="input-theme">
                  {['7 dias', '15 dias', '30 dias', '60 dias', '90 dias'].map(g => <option key={g}>{g}</option>)}
                </select></Field>
                <TagInput label="Bônus" values={data.product_bonuses || []} onChange={v => set('product_bonuses', v)} placeholder="Lives ao vivo → Enter" onGenerateAI={() => handleGenerateField('product_bonuses', 'Ideias de Bônus Atraentes')} isGenerating={generatingField === 'product_bonuses'} />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="glass-card p-8">
            <div className="border-b border-border/60 pb-4 mb-6">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Target className="w-5 h-5 text-violet-400" /> Público-Alvo</h2>
              <p className="text-sm text-muted-foreground mt-1">Para quem é esse produto</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-5">
                <Field label="Descrição do Público *" onGenerateAI={() => handleGenerateField('target_audience', 'Descrição do Público-Alvo / Avatar')} isGenerating={generatingField === 'target_audience'}><textarea value={data.target_audience || ''} onChange={e => set('target_audience', e.target.value)} rows={9} placeholder="Mulheres de 30-50 anos..." className="input-theme resize-none" /></Field>
              </div>
              <div className="space-y-5">
                <TagInput label="🔥 Dores" values={data.audience_pain_points || []} onChange={v => set('audience_pain_points', v)} placeholder="Não consigo emagrecer → Enter" onGenerateAI={() => handleGenerateField('audience_pain_points', 'Principais Dores do Público')} isGenerating={generatingField === 'audience_pain_points'} />
                <TagInput label="✨ Desejos" values={data.audience_desires || []} onChange={v => set('audience_desires', v)} placeholder="Autoestima de volta → Enter" onGenerateAI={() => handleGenerateField('audience_desires', 'Maiores Desejos do Público')} isGenerating={generatingField === 'audience_desires'} />
                <TagInput label="🚧 Objeções" values={data.audience_objections || []} onChange={v => set('audience_objections', v)} placeholder="Já tentei de tudo → Enter" onGenerateAI={() => handleGenerateField('audience_objections', 'Principais Objeções de Compra')} isGenerating={generatingField === 'audience_objections'} />
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="glass-card p-8">
            <div className="border-b border-border/60 pb-4 mb-6">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Lightbulb className="w-5 h-5 text-violet-400" /> Promessa Central</h2>
              <p className="text-sm text-muted-foreground mt-1">O argumento de venda principal</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Field label="Promessa Principal *" onGenerateAI={() => handleGenerateField('main_promise', 'A Grande Promessa do Produto')} isGenerating={generatingField === 'main_promise'}><textarea value={data.main_promise || ''} onChange={e => set('main_promise', e.target.value)} rows={6} placeholder="Em 30 dias você vai..." className="input-theme resize-none" /></Field>
              <Field label="Benefício / Transformação *" onGenerateAI={() => handleGenerateField('main_benefit', 'A Transformação / Benefício Central')} isGenerating={generatingField === 'main_benefit'}><textarea value={data.main_benefit || ''} onChange={e => set('main_benefit', e.target.value)} rows={6} placeholder="Recuperar a confiança..." className="input-theme resize-none" /></Field>
              <Field label="Diferencial Competitivo" onGenerateAI={() => handleGenerateField('differentiation', 'O Diferencial Único / Mecanismo Único')} isGenerating={generatingField === 'differentiation'}><textarea value={data.differentiation || ''} onChange={e => set('differentiation', e.target.value)} rows={6} placeholder="O que torna único..." className="input-theme resize-none" /></Field>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="glass-card p-8">
            <div className="border-b border-border/60 pb-4 mb-6">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Palette className="w-5 h-5 text-violet-400" /> Identidade de Marca</h2>
              <p className="text-sm text-muted-foreground mt-1">Tom de voz, comunicação e identidade visual</p>
            </div>
            
            {/* Voice & Words */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <TagInput label="Tom de Voz" values={data.voice_tones || []} onChange={v => set('voice_tones', v)} placeholder="Empático, Direto → Enter" onGenerateAI={() => handleGenerateField('voice_tones', 'Tons de Voz para a Comunicação')} isGenerating={generatingField === 'voice_tones'} />
              <TagInput label="✅ Palavras para Usar" values={data.words_to_use || []} onChange={v => set('words_to_use', v)} placeholder="Transformação → Enter" onGenerateAI={() => handleGenerateField('words_to_use', 'Palavras-chave Estratégicas Positivas')} isGenerating={generatingField === 'words_to_use'} />
              <TagInput label="❌ Palavras para Evitar" values={data.words_to_avoid || []} onChange={v => set('words_to_avoid', v)} placeholder="Milagre → Enter" />
            </div>

            {/* Brand Visual Identity */}
            <div className="border-t border-border/40 pt-6">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                🎨 Identidade Visual
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Color Pickers */}
                {([
                  { key: 'brand_primary_color', label: 'Cor Primária', fallback: '#8B5CF6' },
                  { key: 'brand_secondary_color', label: 'Cor Secundária', fallback: '#1E1B4B' },
                  { key: 'brand_accent_color', label: 'Cor de Acento', fallback: '#EC4899' },
                ] as const).map(item => (
                  <div key={item.key}>
                    <label className="input-label text-xs font-medium text-muted-foreground mb-1.5 block">{item.label}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={(data as any)[item.key] || item.fallback}
                        onChange={e => set(item.key as any, e.target.value)}
                        className="w-10 h-10 rounded-lg cursor-pointer border border-border/40 bg-transparent"
                      />
                      <input
                        type="text"
                        value={(data as any)[item.key] || ''}
                        onChange={e => set(item.key as any, e.target.value)}
                        placeholder={item.fallback}
                        className="input-field flex-1 text-xs font-mono"
                      />
                    </div>
                  </div>
                ))}

                {/* Font Selector */}
                <div>
                  <label className="input-label text-xs font-medium text-muted-foreground mb-1.5 block">Fonte Principal</label>
                  <select
                    value={data.brand_font || 'Inter'}
                    onChange={e => set('brand_font', e.target.value)}
                    className="input-field w-full"
                  >
                    {['Inter', 'Roboto', 'Outfit', 'Montserrat', 'Poppins', 'Open Sans', 'Lato', 'Nunito', 'Raleway', 'Oswald'].map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Color Preview */}
              {(data.brand_primary_color || data.brand_secondary_color || data.brand_accent_color) && (
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Preview:</span>
                  <div className="flex gap-1.5">
                    {data.brand_primary_color && <div className="w-8 h-8 rounded-lg border border-border/30" style={{ backgroundColor: data.brand_primary_color }} title="Primária" />}
                    {data.brand_secondary_color && <div className="w-8 h-8 rounded-lg border border-border/30" style={{ backgroundColor: data.brand_secondary_color }} title="Secundária" />}
                    {data.brand_accent_color && <div className="w-8 h-8 rounded-lg border border-border/30" style={{ backgroundColor: data.brand_accent_color }} title="Acento" />}
                  </div>
                  {data.brand_font && <span className="text-xs text-muted-foreground ml-2" style={{ fontFamily: data.brand_font }}>{data.brand_font}</span>}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-6">
            {/* Header + Summary */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-400" /> Geração com Gemini AI
                </h2>
                {data.status === 'approved'
                  ? <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 text-emerald-400 rounded-lg text-sm font-medium border border-emerald-500/20"><Check className="w-4 h-4" /> Aprovado</span>
                  : <button onClick={() => handleSave(true)} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-foreground rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"><Check className="w-4 h-4" /> Aprovar</button>
                }
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                {[{ l: 'Expert', v: data.expert_name }, { l: 'Produto', v: data.product_name }, { l: 'Preço', v: data.product_price ? `R$ ${data.product_price.toLocaleString('pt-BR')}` : '—' }, { l: 'Garantia', v: data.product_guarantee }].map(i => (
                  <div key={i.l} className="bg-secondary/30 rounded-xl p-3 border border-border/40">
                    <p className="text-[11px] text-muted-foreground mb-0.5">{i.l}</p>
                    <p className="font-semibold text-foreground text-sm truncate">{i.v || '—'}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', geminiConfigured ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20')}>
                  {geminiConfigured ? '✅ Gemini API configurada' : '❌ Configure VITE_GEMINI_API_KEY no .env'}
                </span>
              </div>
            </div>

            {/* Action cards — compact grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { type: 'page', label: '📄 Página de Vendas', desc: 'Copy completa para landing page' },
                { type: 'email_sequence', label: '📧 Sequência de Emails', desc: '5 emails para semana de lançamento' },
                { type: 'whatsapp', label: '💬 Scripts WhatsApp', desc: '5 mensagens de disparo' },
              ].map(item => (
                <div key={item.type} className={cn(
                  'glass-card p-5 flex flex-col justify-between transition-all hover:shadow-lg hover:shadow-violet-500/5',
                  generatedContent[item.type] && 'border-emerald-500/20 bg-emerald-500/[0.02]'
                )}>
                  <div className="mb-4">
                    <h3 className="font-bold text-foreground text-base">{item.label}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                    {resolvedFrameworks[item.type]?.count > 0 && (
                      <>
                        <button 
                          onClick={() => setExpandedFrameworkCard(expandedFrameworkCard === item.type ? null : item.type)}
                          className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-violet-500/8 border border-violet-500/15 hover:bg-violet-500/15 transition-colors cursor-pointer group"
                        >
                          <span className="text-violet-400 text-[11px]">✨</span>
                          <span className="text-[11px] text-violet-300/80 font-medium">
                            {getActiveCount(item.type)}/{resolvedFrameworks[item.type].count} ativos
                          </span>
                          <span className={cn('text-violet-400/50 text-[10px] transition-transform', expandedFrameworkCard === item.type && 'rotate-180')}>▾</span>
                        </button>

                        {expandedFrameworkCard === item.type && (
                          <div className="mt-2 p-2.5 rounded-lg bg-black/10 border border-border/20 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                            {resolvedFrameworks[item.type].items.map(fw => {
                              const isActive = !disabledFrameworkIds.has(fw.id);
                              return (
                                <label key={fw.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 transition-colors cursor-pointer select-none">
                                  <div
                                    onClick={(e) => { e.preventDefault(); toggleFramework(fw.id); }}
                                    className={cn(
                                      'w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-all',
                                      isActive ? 'bg-violet-500 border-violet-400' : 'bg-transparent border-slate-600'
                                    )}
                                  >
                                    {isActive && <Check className="w-2.5 h-2.5 text-white" />}
                                  </div>
                                  <span className={cn('text-[11px] truncate', isActive ? 'text-foreground/80' : 'text-muted-foreground/50 line-through')}>{fw.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleGenerate(item.type)} disabled={!!generating || !geminiConfigured}
                      className={cn('btn-premium flex items-center justify-center flex-1 gap-2 text-sm py-2.5 rounded-xl', (!geminiConfigured || generating) && 'opacity-40 cursor-not-allowed')}>
                      {generating === item.type ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</> : <><Wand2 className="w-4 h-4" /> Gerar</>}
                    </button>
                    {generatedContent[item.type] && (
                      <span className="text-emerald-400 text-xs font-medium flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Pronto</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Generated content — full-width, one section per type */}
            {[
              { type: 'page', label: '📄 Página de Vendas' },
              { type: 'email_sequence', label: '📧 Sequência de Emails' },
              { type: 'whatsapp', label: '💬 Scripts WhatsApp' },
            ].map(item => generatedContent[item.type] ? (
              <div key={item.type} className="glass-card p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground text-sm">{item.label}</h3>
                    <span className="text-[11px] px-2 py-0.5 bg-violet-500/15 text-violet-300 rounded-full border border-violet-500/20 font-medium">Gemini 2.5 Pro</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExportToNotion(item.type, `${data.expert_name || 'Expert'} - ${item.label}`, generatedContent[item.type])}
                      disabled={exportingNotion === item.type}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {exportingNotion === item.type ? <Loader2 className="w-3 h-3 animate-spin text-violet-400" /> : <img src="https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png" className="w-3.5 h-3.5" alt="Notion" />}
                      Exportar Notion
                    </button>
                    <button onClick={() => navigator.clipboard.writeText(generatedContent[item.type])} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/60 hover:bg-secondary text-xs text-muted-foreground hover:text-foreground transition-colors border border-border/30">
                      📋 Copiar
                    </button>
                  </div>
                </div>
                <div className="prose-generated text-sm text-foreground/90 leading-relaxed max-h-[400px] overflow-y-auto bg-black/15 p-5 rounded-xl border border-border/20" dangerouslySetInnerHTML={{ __html: renderMarkdown(generatedContent[item.type]) }} />
              </div>
            ) : null)}

            {/* 7-Week Plan Card — special AI agent */}
            <div className="glass-card p-6 border-2 border-violet-500/30 bg-violet-500/5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-violet-400" />
                    📅 Plano de Lançamento 7 Semanas
                  </h3>
                  <p className="text-sm text-muted-foreground">Agente especialista gera seu calendário completo de lançamento personalizado</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-[11px] px-2 py-0.5 bg-violet-500/15 text-violet-300 rounded-full border border-violet-500/20 font-medium">✨ Gemini 2.5 Pro</span>
                    <span className="text-[11px] text-muted-foreground">Modelo mais avançado disponível</span>
                  </div>
                </div>
                <button
                  onClick={handleGeneratePlan}
                  disabled={planGenerating || !geminiConfigured}
                  className={cn('btn-premium flex items-center gap-2 text-sm', (!geminiConfigured || planGenerating) && 'opacity-40 cursor-not-allowed')}
                >
                  {planGenerating
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando plano...</>
                    : <><Wand2 className="w-4 h-4" /> Gerar Plano</>
                  }
                </button>
              </div>

              {planError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400">
                  ❌ {planError}
                </div>
              )}

              {planGenerated && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                  <p className="text-emerald-400 font-semibold text-sm mb-3">✅ Plano de 7 semanas criado com sucesso!</p>
                  <p className="text-sm text-muted-foreground mb-3">Seu calendario personalizado de lançamento foi gerado com tarefas específicas para cada fase. Veja agora na Timeline!</p>
                  <button
                    onClick={() => setCurrentPage('timeline')}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors"
                  >
                    <Calendar className="w-4 h-4" />
                    Ver Timeline 7 Semanas
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {!planGenerated && !planGenerating && !planError && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  <p>O agente vai criar um plano personalizado com base no seu briefing, incluindo:</p>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                    <span className="bg-secondary/40 rounded-lg px-2 py-1.5">📋 Tarefas por semana</span>
                    <span className="bg-secondary/40 rounded-lg px-2 py-1.5">📱 Posts para redes sociais</span>
                    <span className="bg-secondary/40 rounded-lg px-2 py-1.5">🎯 Estratégia personalizada</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-6">
            {/* Dossiê Header */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-violet-400" /> Dossiê IA — {data.expert_name || 'Expert'}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Memória central unificada. Tudo que é feito no sistema alimenta o cérebro da IA.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    if (!tenantId) return;
                    setKbLoading(true);
                    try {
                      const { listDocuments } = await import('@/lib/services/knowledgeService');
                      const docs = await listDocuments(tenantId);
                      setKbDocuments(docs);
                    } catch { /* ignore */ }
                    finally { setKbLoading(false); }
                  }}
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
                >
                  {kbLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : '🔄 Atualizar'}
                </button>
              </div>

              {/* Source Status Dashboard */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                {(() => {
                  const briefingDocs = kbDocuments.filter((d: any) => d.source_type === 'briefing');
                  const generatedDocs = kbDocuments.filter((d: any) => d.source_type === 'generated');
                  const manualDocs = kbDocuments.filter((d: any) => d.source_type === 'text' || d.source_type === 'pdf' || d.source_type === 'url');
                  const totalChunks = kbDocuments.reduce((sum: number, d: any) => sum + (d.chunk_count || 0), 0);
                  return [
                    { label: 'Briefing', emoji: '📋', count: briefingDocs.length, ok: briefingDocs.length > 0, sub: briefingDocs.length > 0 ? 'Indexado' : 'Pendente' },
                    { label: 'Copys IA', emoji: '✨', count: generatedDocs.length, ok: generatedDocs.length > 0, sub: `${generatedDocs.length} tipo${generatedDocs.length !== 1 ? 's' : ''}` },
                    { label: 'Materiais', emoji: '📄', count: manualDocs.length, ok: manualDocs.length > 0, sub: `${manualDocs.length} doc${manualDocs.length !== 1 ? 's' : ''}` },
                    { label: 'Chunks', emoji: '🧩', count: totalChunks, ok: totalChunks > 0, sub: `${totalChunks} fragmentos` },
                  ].map(item => (
                    <div key={item.label} className={cn('rounded-xl p-3 border transition-all', item.ok ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-secondary/30 border-border/40')}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{item.emoji}</span>
                        <span className="text-xs font-semibold text-foreground">{item.label}</span>
                        {item.ok && <Check className="w-3 h-3 text-emerald-400 ml-auto" />}
                      </div>
                      <p className={cn('text-[11px]', item.ok ? 'text-emerald-400' : 'text-muted-foreground')}>{item.sub}</p>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Auto-ingestion info */}
            <div className="bg-violet-500/8 border border-violet-500/15 rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm text-violet-300 font-medium mb-1.5">
                <Sparkles className="w-4 h-4" /> Ingestão Automática Ativa
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                O Dossiê é alimentado automaticamente: <strong className="text-foreground/80">Briefing</strong> ao salvar, <strong className="text-foreground/80">Copys geradas</strong> (Página, Emails, WhatsApp) ao gerar no Step 6. Adicione materiais extras abaixo.
              </p>
            </div>

            {/* Add new document */}
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                <Upload className="w-4 h-4 text-violet-400" /> Adicionar Material ao Dossiê
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="input-label text-xs font-medium text-muted-foreground">Título do Documento</label>
                  <input
                    type="text"
                    value={kbNewTitle}
                    onChange={e => setKbNewTitle(e.target.value)}
                    placeholder="Ex: Artigo sobre método do expert"
                    className="input-field w-full mt-1"
                  />
                </div>
                <div className="lg:row-span-2">
                  <label className="input-label text-xs font-medium text-muted-foreground">Conteúdo (cole o texto)</label>
                  <textarea
                    value={kbNewText}
                    onChange={e => setKbNewText(e.target.value)}
                    placeholder="Cole aqui artigos, transcrições, metodologias, depoimentos..."
                    rows={5}
                    className="input-field w-full mt-1 resize-y"
                  />
                </div>
              </div>
              <button
                onClick={async () => {
                  if (!kbNewText.trim() || !tenantId) return;
                  setKbIngesting(true);
                  try {
                    const { ingestDocument } = await import('@/lib/services/knowledgeService');
                    await ingestDocument(tenantId, kbNewTitle || 'Documento sem título', kbNewText.trim(), 'text');
                    setKbNewText('');
                    setKbNewTitle('');
                    const { listDocuments } = await import('@/lib/services/knowledgeService');
                    const docs = await listDocuments(tenantId);
                    setKbDocuments(docs);
                  } catch (err: any) {
                    alert('Erro ao ingerir: ' + err.message);
                  } finally {
                    setKbIngesting(false);
                  }
                }}
                disabled={!kbNewText.trim() || kbIngesting}
                className={cn('btn-premium flex items-center gap-2 text-sm w-full justify-center', (!kbNewText.trim() || kbIngesting) && 'opacity-40 cursor-not-allowed')}
              >
                {kbIngesting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando embeddings...</>
                  : <><Upload className="w-4 h-4" /> Adicionar ao Dossiê</>
                }
              </button>
            </div>

            {/* Documents list */}
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">📚 Documentos Indexados ({kbDocuments.length})</h3>

              {kbDocuments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>Nenhum documento indexado ainda.</p>
                  <p className="text-xs mt-1">Salve o briefing, gere copys ou adicione documentos acima.</p>
                  <button
                    onClick={async () => {
                      if (!tenantId) return;
                      setKbLoading(true);
                      try {
                        const { listDocuments } = await import('@/lib/services/knowledgeService');
                        const docs = await listDocuments(tenantId);
                        setKbDocuments(docs);
                      } catch { /* ignore */ }
                      finally { setKbLoading(false); }
                    }}
                    className="mt-3 text-xs text-violet-400 hover:text-violet-300 underline"
                  >
                    Carregar documentos existentes
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {kbDocuments.map((doc: any) => {
                    const typeIcon = doc.source_type === 'briefing' ? '📋' : doc.source_type === 'generated' ? '✨' : '📄';
                    const typeBadge = doc.source_type === 'briefing' ? 'Briefing' : doc.source_type === 'generated' ? 'IA' : 'Manual';
                    return (
                      <div key={doc.id} className="flex items-center gap-3 bg-secondary/30 rounded-xl p-3 border border-border/30">
                        <span className="text-lg flex-shrink-0">{typeIcon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300 font-medium">{typeBadge}</span>
                            <span className="text-[11px] text-muted-foreground">{doc.chunk_count || 0} chunks</span>
                            <span className={cn(
                              'text-[11px] px-1.5 py-0.5 rounded-full font-medium',
                              doc.status === 'ready' ? 'bg-emerald-500/15 text-emerald-400' :
                              doc.status === 'processing' ? 'bg-yellow-500/15 text-yellow-400' :
                              doc.status === 'error' ? 'bg-red-500/15 text-red-400' :
                              'bg-gray-500/15 text-gray-400'
                            )}>
                              {doc.status === 'ready' ? '✅ Indexado' : doc.status === 'processing' ? '⏳ Processando' : doc.status === 'error' ? '❌ Erro' : '⏸ Pendente'}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            if (!confirm('Deletar este documento do Dossiê?')) return;
                            try {
                              const { deleteDocument } = await import('@/lib/services/knowledgeService');
                              await deleteDocument(doc.id);
                              setKbDocuments(prev => prev.filter(d => d.id !== doc.id));
                            } catch (err: any) {
                              alert('Erro: ' + err.message);
                            }
                          }}
                          className="text-muted-foreground hover:text-red-400 transition-colors"
                          title="Remover documento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-2">
          <button onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border/50 text-muted-foreground text-sm font-medium hover:bg-secondary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          <div className="flex gap-3">
            <button onClick={() => handleSave()} disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-violet-500/30 text-violet-300 text-sm font-medium hover:bg-violet-600/10 transition-all">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
            </button>
            {step < STEPS.length
              ? <button onClick={() => setStep(s => s + 1)} className="btn-premium flex items-center gap-2">Próximo <ChevronRight className="w-4 h-4" /></button>
              : <button onClick={() => handleSave(true)} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-foreground text-sm font-semibold hover:bg-emerald-700 transition-all"><Check className="w-4 h-4" /> Aprovar</button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
