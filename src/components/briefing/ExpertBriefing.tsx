import { useState, useEffect, useCallback } from 'react';
import {
  Save, Sparkles, Loader2, ChevronRight, ChevronLeft, Check, Plus, X,
  User, Package, Target, Lightbulb, Palette, Wand2
} from 'lucide-react';
import { useAuthStore } from '@/store';
import { briefingService, generateWithGemini, BriefingData } from '@/lib/services/briefingService';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 1, title: 'Dados do Expert', icon: User, desc: 'Quem está vendendo' },
  { id: 2, title: 'O Produto', icon: Package, desc: 'O que está sendo vendido' },
  { id: 3, title: 'Público-Alvo', icon: Target, desc: 'Para quem é' },
  { id: 4, title: 'Promessa Central', icon: Lightbulb, desc: 'Por que comprar' },
  { id: 5, title: 'Identidade de Marca', icon: Palette, desc: 'Como comunicar' },
  { id: 6, title: 'Gerar Conteúdo IA', icon: Sparkles, desc: 'IA cria o material' },
];

function TagInput({ label, values, onChange, placeholder }: {
  label: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  const [input, setInput] = useState('');
  function add() {
    const val = input.trim();
    if (val && !values.includes(val)) { onChange([...values, val]); setInput(''); }
  }
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
      <div className="flex gap-2 mb-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder={placeholder || 'Digite e pressione Enter'}
          className="input-dark flex-1" />
        <button type="button" onClick={add}
          className="px-3 py-2.5 bg-violet-600 text-white rounded-xl text-sm hover:bg-violet-700 transition-colors">
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-300">{label}</label>
      {children}
    </div>
  );
}

export function ExpertBriefing() {
  const { activeTenant } = useAuthStore() as any;
  const tenantId = activeTenant?.id;

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [generating, setGenerating] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<Record<string, string>>({});

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

  const progress = (step / STEPS.length) * 100;
  const geminiConfigured = !!import.meta.env.VITE_GEMINI_API_KEY;

  if (!tenantId) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center mx-auto mb-4 neon-glow">
            <Target className="w-8 h-8 text-violet-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Selecione um cliente</h2>
          <p className="text-slate-500">Use o seletor na sidebar para escolher o cliente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[hsl(222,47%,5%)]/80 backdrop-blur-xl border-b border-slate-800/60">
        <div className="px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Briefing do Expert</h1>
            <p className="text-slate-500 text-sm">
              Cliente: <span className="text-violet-400 font-medium">{activeTenant?.name}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {saveMsg && <span className="text-sm font-medium text-slate-300">{saveMsg}</span>}
            <div className="hidden md:flex items-center gap-2">
              <div className="w-28 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs text-slate-600">{step}/{STEPS.length}</span>
            </div>
            <button onClick={() => handleSave()} disabled={saving} className="btn-premium flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar
            </button>
          </div>
        </div>

        {/* Step tabs */}
        <div className="px-6 pb-3 max-w-5xl mx-auto">
          <div className="flex gap-1 overflow-x-auto pb-1">
            {STEPS.map(s => {
              const Icon = s.icon;
              return (
                <button key={s.id} onClick={() => setStep(s.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all border',
                    step === s.id
                      ? 'bg-violet-600/15 text-violet-300 border-violet-500/30'
                      : 'text-slate-500 hover:bg-slate-800/40 hover:text-slate-300 border-transparent'
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
            <div className="border-b border-slate-800/60 pb-4 mb-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-violet-400" /> Dados do Expert
              </h2>
              <p className="text-sm text-slate-500 mt-1">Informações sobre quem está vendendo</p>
            </div>
            <Field label="Nome Completo do Expert *">
              <input value={data.expert_name || ''} onChange={e => set('expert_name', e.target.value)} placeholder="Ex: João Silva" className="input-dark" />
            </Field>
            <Field label="Biografia / História do Expert *">
              <textarea value={data.expert_bio || ''} onChange={e => set('expert_bio', e.target.value)} rows={5} placeholder="Conte a trajetória, conquistas e resultados..." className="input-dark resize-none" />
            </Field>
            <Field label="URL da Foto">
              <input value={data.expert_photo_url || ''} onChange={e => set('expert_photo_url', e.target.value)} placeholder="https://..." type="url" className="input-dark" />
            </Field>
            <TagInput label="Credenciais" values={data.expert_credentials || []} onChange={v => set('expert_credentials', v)} placeholder="Ex: MBA em Marketing → Enter" />
          </div>
        )}

        {step === 2 && (
          <div className="glass-card p-8 space-y-5">
            <div className="border-b border-slate-800/60 pb-4 mb-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><Package className="w-5 h-5 text-violet-400" /> O Produto</h2>
              <p className="text-sm text-slate-500 mt-1">O que está sendo vendido</p>
            </div>
            <Field label="Nome do Produto *"><input value={data.product_name || ''} onChange={e => set('product_name', e.target.value)} placeholder="Ex: Método Corpo Transformado" className="input-dark" /></Field>
            <Field label="Descrição *"><textarea value={data.product_description || ''} onChange={e => set('product_description', e.target.value)} rows={4} placeholder="O que o cliente vai receber?" className="input-dark resize-none" /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Preço (R$) *"><input type="number" value={data.product_price || ''} onChange={e => set('product_price', parseFloat(e.target.value))} placeholder="997" className="input-dark" /></Field>
              <Field label="Parcelas"><select value={data.product_installments || 12} onChange={e => set('product_installments', parseInt(e.target.value))} className="input-dark">
                {[1, 2, 3, 4, 6, 8, 10, 12].map(n => <option key={n} value={n}>{n}x</option>)}
              </select></Field>
            </div>
            <Field label="Garantia"><select value={data.product_guarantee || '7 dias'} onChange={e => set('product_guarantee', e.target.value)} className="input-dark">
              {['7 dias', '15 dias', '30 dias', '60 dias', '90 dias'].map(g => <option key={g}>{g}</option>)}
            </select></Field>
            <TagInput label="Bônus" values={data.product_bonuses || []} onChange={v => set('product_bonuses', v)} placeholder="Lives ao vivo → Enter" />
          </div>
        )}

        {step === 3 && (
          <div className="glass-card p-8 space-y-5">
            <div className="border-b border-slate-800/60 pb-4 mb-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><Target className="w-5 h-5 text-violet-400" /> Público-Alvo</h2>
              <p className="text-sm text-slate-500 mt-1">Para quem é esse produto</p>
            </div>
            <Field label="Descrição do Público *"><textarea value={data.target_audience || ''} onChange={e => set('target_audience', e.target.value)} rows={3} placeholder="Mulheres de 30-50 anos..." className="input-dark resize-none" /></Field>
            <TagInput label="🔥 Dores" values={data.audience_pain_points || []} onChange={v => set('audience_pain_points', v)} placeholder="Não consigo emagrecer → Enter" />
            <TagInput label="✨ Desejos" values={data.audience_desires || []} onChange={v => set('audience_desires', v)} placeholder="Autoestima de volta → Enter" />
            <TagInput label="🚧 Objeções" values={data.audience_objections || []} onChange={v => set('audience_objections', v)} placeholder="Já tentei de tudo → Enter" />
          </div>
        )}

        {step === 4 && (
          <div className="glass-card p-8 space-y-5">
            <div className="border-b border-slate-800/60 pb-4 mb-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><Lightbulb className="w-5 h-5 text-violet-400" /> Promessa Central</h2>
              <p className="text-sm text-slate-500 mt-1">O argumento de venda principal</p>
            </div>
            <Field label="Promessa Principal *"><textarea value={data.main_promise || ''} onChange={e => set('main_promise', e.target.value)} rows={3} placeholder="Em 30 dias você vai..." className="input-dark resize-none" /></Field>
            <Field label="Benefício / Transformação *"><textarea value={data.main_benefit || ''} onChange={e => set('main_benefit', e.target.value)} rows={3} placeholder="Recuperar a confiança..." className="input-dark resize-none" /></Field>
            <Field label="Diferencial Competitivo"><textarea value={data.differentiation || ''} onChange={e => set('differentiation', e.target.value)} rows={3} placeholder="O que torna único..." className="input-dark resize-none" /></Field>
          </div>
        )}

        {step === 5 && (
          <div className="glass-card p-8 space-y-5">
            <div className="border-b border-slate-800/60 pb-4 mb-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><Palette className="w-5 h-5 text-violet-400" /> Identidade de Marca</h2>
              <p className="text-sm text-slate-500 mt-1">Tom de voz e comunicação</p>
            </div>
            <TagInput label="Tom de Voz" values={data.voice_tones || []} onChange={v => set('voice_tones', v)} placeholder="Empático, Direto → Enter" />
            <TagInput label="✅ Palavras para Usar" values={data.words_to_use || []} onChange={v => set('words_to_use', v)} placeholder="Transformação → Enter" />
            <TagInput label="❌ Palavras para Evitar" values={data.words_to_avoid || []} onChange={v => set('words_to_avoid', v)} placeholder="Milagre → Enter" />
          </div>
        )}

        {step === 6 && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-400" /> Geração com Gemini AI
                </h2>
                {data.status === 'approved'
                  ? <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 text-emerald-400 rounded-lg text-sm font-medium border border-emerald-500/20"><Check className="w-4 h-4" /> Aprovado</span>
                  : <button onClick={() => handleSave(true)} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"><Check className="w-4 h-4" /> Aprovar</button>
                }
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[{ l: 'Expert', v: data.expert_name }, { l: 'Produto', v: data.product_name }, { l: 'Preço', v: data.product_price ? `R$ ${data.product_price.toLocaleString('pt-BR')}` : '—' }, { l: 'Garantia', v: data.product_guarantee }].map(i => (
                  <div key={i.l} className="bg-slate-800/30 rounded-xl p-3 border border-slate-800/40">
                    <p className="text-[11px] text-slate-600 mb-0.5">{i.l}</p>
                    <p className="font-semibold text-slate-200 text-sm truncate">{i.v || '—'}</p>
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
              { type: 'campaign', label: '📅 Plano de Conteúdo', desc: '20 posts para redes sociais' },
            ].map(item => (
              <div key={item.type} className="glass-card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-white">{item.label}</h3>
                    <p className="text-sm text-slate-500">{item.desc}</p>
                  </div>
                  <button onClick={() => handleGenerate(item.type)} disabled={!!generating || !geminiConfigured}
                    className={cn('btn-premium flex items-center gap-2 text-sm', (!geminiConfigured || generating) && 'opacity-40 cursor-not-allowed')}>
                    {generating === item.type ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</> : <><Wand2 className="w-4 h-4" /> Gerar</>}
                  </button>
                </div>
                {generatedContent[item.type] && (
                  <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-violet-400">Gerado por Gemini 2.0 Flash</span>
                      <button onClick={() => navigator.clipboard.writeText(generatedContent[item.type])} className="text-xs text-slate-500 hover:text-violet-400 transition-colors">📋 Copiar</button>
                    </div>
                    <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans leading-relaxed max-h-96 overflow-y-auto">{generatedContent[item.type]}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-2">
          <button onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 text-sm font-medium hover:bg-slate-800/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          <div className="flex gap-3">
            <button onClick={() => handleSave()} disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-violet-500/30 text-violet-300 text-sm font-medium hover:bg-violet-600/10 transition-all">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
            </button>
            {step < STEPS.length
              ? <button onClick={() => setStep(s => s + 1)} className="btn-premium flex items-center gap-2">Próximo <ChevronRight className="w-4 h-4" /></button>
              : <button onClick={() => handleSave(true)} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-all"><Check className="w-4 h-4" /> Aprovar</button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
