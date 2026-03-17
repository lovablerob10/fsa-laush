import { useState, useEffect, useCallback } from 'react';
import {
  Save, Sparkles, Loader2, ChevronRight, ChevronLeft, Check, Plus, X,
  User, Package, Target, Lightbulb, Palette, Wand2, Calendar, ArrowRight,
  ExternalLink, Upload, Camera, BookOpen, FileText, Trash2
} from 'lucide-react';

import { useAuthStore, useUIStore } from '@/store';
import { briefingService, generateWithGemini, generateFieldSuggestion, generate7WeekPlan, BriefingData } from '@/lib/services/briefingService';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { NotionPagePicker } from '@/components/integrations/NotionPagePicker';

const STEPS = [
  { id: 1, title: 'Dados do Expert', icon: User, desc: 'Quem está vendendo' },
  { id: 2, title: 'O Produto', icon: Package, desc: 'O que está sendo vendido' },
  { id: 3, title: 'Público-Alvo', icon: Target, desc: 'Para quem é' },
  { id: 4, title: 'Promessa Central', icon: Lightbulb, desc: 'Por que comprar' },
  { id: 5, title: 'Identidade de Marca', icon: Palette, desc: 'Como comunicar' },
  { id: 6, title: 'Gerar Conteúdo IA', icon: Sparkles, desc: 'IA cria o material' },
  { id: 7, title: 'Base de Conhecimento', icon: BookOpen, desc: 'Cérebro do expert' },
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
  const [expertPhotos, setExpertPhotos] = useState<Array<{ dataUrl: string; name: string }>>([]);
  // Knowledge Base state
  const [kbDocuments, setKbDocuments] = useState<any[]>([]);
  const [kbLoading, setKbLoading] = useState(false);
  const [kbIngesting, setKbIngesting] = useState(false);
  const [kbNewText, setKbNewText] = useState('');
  const [kbNewTitle, setKbNewTitle] = useState('');

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const remaining = 10 - expertPhotos.length;
    const toProcess = files.slice(0, remaining);
    toProcess.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        const dataUrl = ev.target?.result as string;
        setExpertPhotos(prev => {
          const updated = [...prev, { dataUrl, name: file.name }].slice(0, 10);
          // Store first photo URL in briefing for compatibility
          set('expert_photo_url', updated[0]?.dataUrl || '');
          return updated;
        });
      };
      reader.readAsDataURL(file);
    });
    // Reset input
    e.target.value = '';
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
      const content = await generateWithGemini(data, type);
      setGeneratedContent(prev => ({ ...prev, [type]: content }));
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
      const plan = await generate7WeekPlan(data);

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
        <div className="px-6 pb-3 max-w-5xl mx-auto">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-violet-500/20 scrollbar-track-transparent">
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
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {step === 1 && (
          <div className="glass-card p-8 space-y-5">
            <div className="border-b border-border/60 pb-4 mb-2">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <User className="w-5 h-5 text-violet-400" /> Dados do Expert
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Informações sobre quem está vendendo</p>
            </div>
            <Field label="Nome Completo do Expert *">
              <input value={data.expert_name || ''} onChange={e => set('expert_name', e.target.value)} placeholder="Ex: João Silva" className="input-theme" />
            </Field>
            <Field label="Biografia / História do Expert *" onGenerateAI={() => handleGenerateField('expert_bio', 'Biografia / História do Expert')} isGenerating={generatingField === 'expert_bio'}>
              <textarea value={data.expert_bio || ''} onChange={e => set('expert_bio', e.target.value)} rows={5} placeholder="Conte a trajetória, conquistas e resultados..." className="input-theme resize-none" />
            </Field>
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
                <div className="grid grid-cols-5 gap-2">
                  {expertPhotos.map((photo, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-border/60">
                      <img src={photo.dataUrl} alt={photo.name} className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <div className="absolute top-1 left-1 bg-violet-600 text-white text-[9px] font-bold px-1 rounded">Principal</div>
                      )}
                      <button
                        onClick={() => removePhoto(idx)}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                  {expertPhotos.length < 10 && (
                    <label className="aspect-square rounded-lg border-2 border-dashed border-border/60 flex items-center justify-center cursor-pointer hover:border-violet-400/60 transition-colors">
                      <Plus className="w-5 h-5 text-muted-foreground" />
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
                    </label>
                  )}
                </div>
              )}
            </div>
            <TagInput label="Credenciais" values={data.expert_credentials || []} onChange={v => set('expert_credentials', v)} placeholder="Ex: MBA em Marketing → Enter" onGenerateAI={() => handleGenerateField('expert_credentials', 'Credenciais Acadêmicas ou Profissionais')} isGenerating={generatingField === 'expert_credentials'} />
          </div>
        )}

        {step === 2 && (
          <div className="glass-card p-8 space-y-5">
            <div className="border-b border-border/60 pb-4 mb-2">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Package className="w-5 h-5 text-violet-400" /> O Produto</h2>
              <p className="text-sm text-muted-foreground mt-1">O que está sendo vendido</p>
            </div>
            <Field label="Nome do Produto *"><input value={data.product_name || ''} onChange={e => set('product_name', e.target.value)} placeholder="Ex: Método Corpo Transformado" className="input-theme" /></Field>
            <Field label="Descrição *" onGenerateAI={() => handleGenerateField('product_description', 'Descrição Comercial do Produto')} isGenerating={generatingField === 'product_description'}><textarea value={data.product_description || ''} onChange={e => set('product_description', e.target.value)} rows={4} placeholder="O que o cliente vai receber?" className="input-theme resize-none" /></Field>
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
        )}

        {step === 3 && (
          <div className="glass-card p-8 space-y-5">
            <div className="border-b border-border/60 pb-4 mb-2">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Target className="w-5 h-5 text-violet-400" /> Público-Alvo</h2>
              <p className="text-sm text-muted-foreground mt-1">Para quem é esse produto</p>
            </div>
            <Field label="Descrição do Público *" onGenerateAI={() => handleGenerateField('target_audience', 'Descrição do Público-Alvo / Avatar')} isGenerating={generatingField === 'target_audience'}><textarea value={data.target_audience || ''} onChange={e => set('target_audience', e.target.value)} rows={3} placeholder="Mulheres de 30-50 anos..." className="input-theme resize-none" /></Field>
            <TagInput label="🔥 Dores" values={data.audience_pain_points || []} onChange={v => set('audience_pain_points', v)} placeholder="Não consigo emagrecer → Enter" onGenerateAI={() => handleGenerateField('audience_pain_points', 'Principais Dores do Público')} isGenerating={generatingField === 'audience_pain_points'} />
            <TagInput label="✨ Desejos" values={data.audience_desires || []} onChange={v => set('audience_desires', v)} placeholder="Autoestima de volta → Enter" onGenerateAI={() => handleGenerateField('audience_desires', 'Maiores Desejos do Público')} isGenerating={generatingField === 'audience_desires'} />
            <TagInput label="🚧 Objeções" values={data.audience_objections || []} onChange={v => set('audience_objections', v)} placeholder="Já tentei de tudo → Enter" onGenerateAI={() => handleGenerateField('audience_objections', 'Principais Objeções de Compra')} isGenerating={generatingField === 'audience_objections'} />
          </div>
        )}

        {step === 4 && (
          <div className="glass-card p-8 space-y-5">
            <div className="border-b border-border/60 pb-4 mb-2">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Lightbulb className="w-5 h-5 text-violet-400" /> Promessa Central</h2>
              <p className="text-sm text-muted-foreground mt-1">O argumento de venda principal</p>
            </div>
            <Field label="Promessa Principal *" onGenerateAI={() => handleGenerateField('main_promise', 'A Grande Promessa do Produto')} isGenerating={generatingField === 'main_promise'}><textarea value={data.main_promise || ''} onChange={e => set('main_promise', e.target.value)} rows={3} placeholder="Em 30 dias você vai..." className="input-theme resize-none" /></Field>
            <Field label="Benefício / Transformação *" onGenerateAI={() => handleGenerateField('main_benefit', 'A Transformação / Benefício Central')} isGenerating={generatingField === 'main_benefit'}><textarea value={data.main_benefit || ''} onChange={e => set('main_benefit', e.target.value)} rows={3} placeholder="Recuperar a confiança..." className="input-theme resize-none" /></Field>
            <Field label="Diferencial Competitivo" onGenerateAI={() => handleGenerateField('differentiation', 'O Diferencial Único / Mecanismo Único')} isGenerating={generatingField === 'differentiation'}><textarea value={data.differentiation || ''} onChange={e => set('differentiation', e.target.value)} rows={3} placeholder="O que torna único..." className="input-theme resize-none" /></Field>
          </div>
        )}

        {step === 5 && (
          <div className="glass-card p-8 space-y-5">
            <div className="border-b border-border/60 pb-4 mb-2">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Palette className="w-5 h-5 text-violet-400" /> Identidade de Marca</h2>
              <p className="text-sm text-muted-foreground mt-1">Tom de voz e comunicação</p>
            </div>
            <TagInput label="Tom de Voz" values={data.voice_tones || []} onChange={v => set('voice_tones', v)} placeholder="Empático, Direto → Enter" onGenerateAI={() => handleGenerateField('voice_tones', 'Tons de Voz para a Comunicação')} isGenerating={generatingField === 'voice_tones'} />
            <TagInput label="✅ Palavras para Usar" values={data.words_to_use || []} onChange={v => set('words_to_use', v)} placeholder="Transformação → Enter" onGenerateAI={() => handleGenerateField('words_to_use', 'Palavras-chave Estratégicas Positivas')} isGenerating={generatingField === 'words_to_use'} />
            <TagInput label="❌ Palavras para Evitar" values={data.words_to_avoid || []} onChange={v => set('words_to_avoid', v)} placeholder="Milagre → Enter" />
          </div>
        )}

        {step === 6 && (
          <div className="space-y-6">
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
              <div className="grid grid-cols-2 gap-3 mb-4">
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

            {[
              { type: 'page', label: '📄 Página de Vendas', desc: 'Copy completa para landing page' },
              { type: 'email_sequence', label: '📧 Sequência de Emails', desc: '5 emails para semana de lançamento' },
              { type: 'whatsapp', label: '💬 Scripts WhatsApp', desc: '5 mensagens de disparo' },
            ].map(item => (
              <div key={item.type} className="glass-card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-foreground">{item.label}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  <button onClick={() => handleGenerate(item.type)} disabled={!!generating || !geminiConfigured}
                    className={cn('btn-premium flex items-center gap-2 text-sm', (!geminiConfigured || generating) && 'opacity-40 cursor-not-allowed')}>
                    {generating === item.type ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</> : <><Wand2 className="w-4 h-4" /> Gerar</>}
                  </button>
                </div>
                {generatedContent[item.type] && (
                  <div className="bg-secondary/30 rounded-xl p-4 border border-border/30">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-violet-400">Gerado por Gemini 2.5 Pro</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleExportToNotion(item.type, `${data.expert_name || 'Expert'} - ${item.label}`, generatedContent[item.type])}
                          disabled={exportingNotion === item.type}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-white rounded-md transition-colors disabled:opacity-50"
                        >
                          {exportingNotion === item.type ? <Loader2 className="w-3 h-3 animate-spin text-violet-400" /> : <img src="https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png" className="w-3 h-3" alt="Notion" />}
                          Exportar
                        </button>
                        <button onClick={() => navigator.clipboard.writeText(generatedContent[item.type])} className="text-xs text-muted-foreground hover:text-violet-400 transition-colors">📋 Copiar</button>
                      </div>
                    </div>
                    <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed max-h-96 overflow-y-auto">{generatedContent[item.type]}</pre>
                  </div>
                )}

              </div>
            ))}

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
            <div className="glass-card p-6">
              <div className="border-b border-border/60 pb-4 mb-4">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-violet-400" /> Base de Conhecimento — Método OPRF
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Alimente o cérebro do expert com documentos, textos e materiais. Tudo será indexado para enriquecer copys, criativos e respostas da IA.
                </p>
              </div>

              {/* Auto-ingest briefing info */}
              <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 mb-5">
                <div className="flex items-center gap-2 text-sm text-violet-300 font-medium mb-1">
                  <Sparkles className="w-4 h-4" /> Ingestão Automática
                </div>
                <p className="text-xs text-muted-foreground">
                  O briefing ({data.expert_name || 'Expert'} — {data.product_name || 'Produto'}) é indexado automaticamente ao salvar. Aqui você pode adicionar materiais extras como PDFs, artigos, e anotações.
                </p>
              </div>

              {/* Add new document */}
              <div className="space-y-3 mb-6">
                <div>
                  <label className="input-label text-sm font-medium text-foreground">Título do Documento</label>
                  <input
                    type="text"
                    value={kbNewTitle}
                    onChange={e => setKbNewTitle(e.target.value)}
                    placeholder="Ex: Artigo sobre método do expert"
                    className="input-field w-full mt-1"
                  />
                </div>
                <div>
                  <label className="input-label text-sm font-medium text-foreground">Conteúdo (cole o texto)</label>
                  <textarea
                    value={kbNewText}
                    onChange={e => setKbNewText(e.target.value)}
                    placeholder="Cole aqui o conteúdo de artigos, transcrições, metodologias, depoimentos..."
                    rows={6}
                    className="input-field w-full mt-1 resize-y"
                  />
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
                      // Refresh list
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
                    : <><Upload className="w-4 h-4" /> Ingerir na Base de Conhecimento</>
                  }
                </button>
              </div>

              {/* Documents list */}
              <div className="border-t border-border/40 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground">Documentos Indexados</h3>
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
                    className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    {kbLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : '🔄 Atualizar'}
                  </button>
                </div>

                {kbDocuments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>Nenhum documento indexado ainda.</p>
                    <p className="text-xs mt-1">Salve o briefing ou adicione documentos acima.</p>
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
                    {kbDocuments.map((doc: any) => (
                      <div key={doc.id} className="flex items-center gap-3 bg-secondary/30 rounded-xl p-3 border border-border/30">
                        <FileText className="w-5 h-5 text-violet-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-muted-foreground">{doc.char_count?.toLocaleString()} chars</span>
                            <span className="text-[11px] text-muted-foreground">•</span>
                            <span className="text-[11px] text-muted-foreground">{doc.chunk_count} chunks</span>
                            <span className="text-[11px] text-muted-foreground">•</span>
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
                            if (!confirm('Deletar este documento da base de conhecimento?')) return;
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
                    ))}
                  </div>
                )}
              </div>
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
