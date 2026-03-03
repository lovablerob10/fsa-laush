import { useState, useEffect, useCallback } from 'react';
import {
  Save, Sparkles, Loader2, ChevronRight, ChevronLeft, Check, Plus, X,
  User, Package, Target, Lightbulb, Palette, BookOpen, Wand2
} from 'lucide-react';
import { useAuthStore } from '@/store';
import { briefingService, generateBriefingContent, BriefingData } from '@/lib/services/briefingService';
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
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <div className="flex gap-2 mb-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder={placeholder || 'Digite e pressione Enter'}
          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all" />
        <button type="button" onClick={add}
          className="px-3 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {values.map((v, i) => (
          <span key={i} className="flex items-center gap-1 px-2.5 py-1 bg-violet-50 text-violet-700 rounded-full text-xs font-medium border border-violet-200">
            {v}
            <button onClick={() => onChange(values.filter((_, j) => j !== i))}>
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
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all bg-white";

export function ExpertBriefing() {
  const { activeTenant } = useAuthStore() as any;
  const tenantId = activeTenant?.id;

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [generating, setGenerating] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<Record<string, string>>({});
  const [apiKey, setApiKey] = useState('');
  const [showApiInput, setShowApiInput] = useState(false);

  const [data, setData] = useState<BriefingData>({
    tenant_id: tenantId || '',
    expert_name: '', expert_bio: '', expert_photo_url: '', expert_credentials: [],
    product_name: '', product_description: '', product_price: undefined,
    product_installments: 12, product_bonuses: [], product_guarantee: '7 dias',
    target_audience: '', audience_pain_points: [], audience_desires: [], audience_objections: [],
    main_promise: '', main_benefit: '', differentiation: '',
    voice_tones: [], words_to_use: [], words_to_avoid: [],
    framework_page: 'padrao', framework_email: 'padrao', framework_whatsapp: 'padrao',
    status: 'draft',
  });

  // Carrega briefing do tenant ativo
  useEffect(() => {
    if (!tenantId) return;
    setData(d => ({ ...d, tenant_id: tenantId }));
    briefingService.fetchByTenant(tenantId).then(b => {
      if (b) setData(b);
    });
  }, [tenantId]);

  const set = useCallback((field: keyof BriefingData, value: any) => {
    setData(d => ({ ...d, [field]: value }));
  }, []);

  async function handleSave(approve = false) {
    if (!tenantId) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const toSave = { ...data, tenant_id: tenantId, status: approve ? 'approved' as const : data.status };
      const saved = await briefingService.save(toSave);
      if (saved) setData(saved);
      setSaveMsg(approve ? '✅ Briefing aprovado!' : '✅ Rascunho salvo!');
    } catch (err: any) {
      setSaveMsg(`❌ ${err.message}`);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 3000);
    }
  }

  async function handleGenerate(type: string) {
    if (!apiKey) { setShowApiInput(true); return; }
    setGenerating(type);
    try {
      const content = await generateBriefingContent({ ...data, __apiKey: apiKey } as any, type);
      setGeneratedContent(prev => ({ ...prev, [type]: content }));
    } catch (err: any) {
      alert('Erro ao gerar: ' + err.message);
    } finally {
      setGenerating(null);
    }
  }

  const progress = (step / STEPS.length) * 100;

  if (!tenantId) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Target className="w-8 h-8 text-violet-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Selecione um cliente</h2>
        <p className="text-slate-500">Use o seletor na sidebar para escolher com qual cliente deseja trabalhar.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Briefing do Expert</h1>
            <p className="text-slate-500 text-sm">Cliente: <span className="text-violet-600 font-semibold">{activeTenant?.name}</span></p>
          </div>
          <div className="flex items-center gap-4">
            {saveMsg && <span className="text-sm font-medium text-slate-700">{saveMsg}</span>}
            <div className="text-sm text-slate-500 hidden md:block">
              Etapa {step} de {STEPS.length}
            </div>
            {/* Progress bar */}
            <div className="hidden md:flex items-center gap-2">
              <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs text-slate-500">{Math.round(progress)}%</span>
            </div>
            <button onClick={() => handleSave()} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-all">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar
            </button>
          </div>
        </div>

        {/* Step indicator */}
        <div className="px-6 pb-3 max-w-5xl mx-auto">
          <div className="flex gap-1 overflow-x-auto pb-1">
            {STEPS.map(s => {
              const Icon = s.icon;
              return (
                <button key={s.id} onClick={() => setStep(s.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
                    step === s.id ? 'bg-violet-100 text-violet-700' : 'text-slate-500 hover:bg-slate-100'
                  )}>
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{s.title}</span>
                  <span className="sm:hidden">{s.id}</span>
                  {s.id < step && <Check className="w-3 h-3 text-emerald-500" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* ===== ETAPA 1: EXPERT ===== */}
        {step === 1 && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 space-y-5">
            <div className="border-b pb-4 mb-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <User className="w-5 h-5 text-violet-600" /> Dados do Expert
              </h2>
              <p className="text-sm text-slate-500 mt-1">Informações sobre quem está vendendo</p>
            </div>
            <Field label="Nome Completo do Expert *">
              <input value={data.expert_name || ''} onChange={e => set('expert_name', e.target.value)}
                placeholder="Ex: João Silva" className={inputCls} />
            </Field>
            <Field label="Biografia / História do Expert *">
              <textarea value={data.expert_bio || ''} onChange={e => set('expert_bio', e.target.value)}
                rows={5} placeholder="Conte a trajetória, conquistas, credibilidade e resultados..."
                className={cn(inputCls, 'resize-none')} />
            </Field>
            <Field label="URL da Foto do Expert">
              <input value={data.expert_photo_url || ''} onChange={e => set('expert_photo_url', e.target.value)}
                placeholder="https://exemplo.com/foto.jpg" type="url" className={inputCls} />
              {data.expert_photo_url && (
                <img src={data.expert_photo_url} alt="Expert" className="w-16 h-16 rounded-full object-cover mt-2 border-2 border-violet-200" />
              )}
            </Field>
            <TagInput label="Credenciais / Certificações"
              values={data.expert_credentials || []}
              onChange={v => set('expert_credentials', v)}
              placeholder="Ex: MBA em Marketing → Enter" />
          </div>
        )}

        {/* ===== ETAPA 2: PRODUTO ===== */}
        {step === 2 && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 space-y-5">
            <div className="border-b pb-4 mb-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Package className="w-5 h-5 text-violet-600" /> O Produto
              </h2>
              <p className="text-sm text-slate-500 mt-1">O que está sendo vendido</p>
            </div>
            <Field label="Nome do Produto *">
              <input value={data.product_name || ''} onChange={e => set('product_name', e.target.value)}
                placeholder="Ex: Método Corpo Transformado" className={inputCls} />
            </Field>
            <Field label="Descrição do Produto *">
              <textarea value={data.product_description || ''} onChange={e => set('product_description', e.target.value)}
                rows={4} placeholder="O que o cliente vai receber? Formato, módulos, duração..."
                className={cn(inputCls, 'resize-none')} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Preço (R$) *">
                <input type="number" value={data.product_price || ''} onChange={e => set('product_price', parseFloat(e.target.value))}
                  placeholder="997.00" className={inputCls} />
              </Field>
              <Field label="Parcelas">
                <select value={data.product_installments || 12} onChange={e => set('product_installments', parseInt(e.target.value))} className={inputCls}>
                  {[1, 2, 3, 4, 6, 8, 10, 12].map(n => <option key={n} value={n}>{n}x</option>)}
                </select>
              </Field>
            </div>
            <Field label="Garantia">
              <select value={data.product_guarantee || '7 dias'} onChange={e => set('product_guarantee', e.target.value)} className={inputCls}>
                {['7 dias', '15 dias', '30 dias', '60 dias', '90 dias'].map(g => <option key={g}>{g}</option>)}
              </select>
            </Field>
            <TagInput label="Bônus" values={data.product_bonuses || []}
              onChange={v => set('product_bonuses', v)}
              placeholder="Ex: Lives ao vivo → Enter" />
          </div>
        )}

        {/* ===== ETAPA 3: PÚBLICO ===== */}
        {step === 3 && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 space-y-5">
            <div className="border-b pb-4 mb-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Target className="w-5 h-5 text-violet-600" /> Público-Alvo
              </h2>
              <p className="text-sm text-slate-500 mt-1">Para quem é esse produto</p>
            </div>
            <Field label="Descrição do Público-Alvo *">
              <textarea value={data.target_audience || ''} onChange={e => set('target_audience', e.target.value)}
                rows={3} placeholder="Mulheres de 30-50 anos, que trabalham mas não têm tempo para academia..."
                className={cn(inputCls, 'resize-none')} />
            </Field>
            <TagInput label="🔥 Principais Dores" values={data.audience_pain_points || []}
              onChange={v => set('audience_pain_points', v)}
              placeholder="Ex: Não consigo emagrecer → Enter" />
            <TagInput label="✨ Desejos e Sonhos" values={data.audience_desires || []}
              onChange={v => set('audience_desires', v)}
              placeholder="Ex: Ter autoestima de volta → Enter" />
            <TagInput label="🚧 Objeções" values={data.audience_objections || []}
              onChange={v => set('audience_objections', v)}
              placeholder="Ex: Já tentei de tudo → Enter" />
          </div>
        )}

        {/* ===== ETAPA 4: PROMESSA ===== */}
        {step === 4 && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 space-y-5">
            <div className="border-b pb-4 mb-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-violet-600" /> Promessa Central
              </h2>
              <p className="text-sm text-slate-500 mt-1">O argumento de venda principal</p>
            </div>
            <Field label="Promessa Principal *">
              <textarea value={data.main_promise || ''} onChange={e => set('main_promise', e.target.value)}
                rows={3} placeholder="Ex: Em 30 dias você vai perder 5kg sem cortar o que gosta..."
                className={cn(inputCls, 'resize-none')} />
            </Field>
            <Field label="Principal Benefício / Transformação *">
              <textarea value={data.main_benefit || ''} onChange={e => set('main_benefit', e.target.value)}
                rows={3} placeholder="Ex: Recuperar a confiança no próprio corpo e ter energia o dia todo..."
                className={cn(inputCls, 'resize-none')} />
            </Field>
            <Field label="Diferencial Competitivo">
              <textarea value={data.differentiation || ''} onChange={e => set('differentiation', e.target.value)}
                rows={3} placeholder="O que torna esse produto único em relação a concorrência..."
                className={cn(inputCls, 'resize-none')} />
            </Field>
          </div>
        )}

        {/* ===== ETAPA 5: IDENTIDADE ===== */}
        {step === 5 && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 space-y-5">
            <div className="border-b pb-4 mb-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Palette className="w-5 h-5 text-violet-600" /> Identidade de Marca
              </h2>
              <p className="text-sm text-slate-500 mt-1">Tom de voz e comunicação</p>
            </div>
            <TagInput label="Tom de Voz" values={data.voice_tones || []}
              onChange={v => set('voice_tones', v)}
              placeholder="Ex: Empático, Direto, Motivacional → Enter" />
            <TagInput label="✅ Palavras para Usar" values={data.words_to_use || []}
              onChange={v => set('words_to_use', v)}
              placeholder="Ex: Transformação, Conquista, Resultado → Enter" />
            <TagInput label="❌ Palavras para Evitar" values={data.words_to_avoid || []}
              onChange={v => set('words_to_avoid', v)}
              placeholder="Ex: Milagre, Fácil demais → Enter" />
          </div>
        )}

        {/* ===== ETAPA 6: GERAR COM IA ===== */}
        {step === 6 && (
          <div className="space-y-6">
            {/* Resumo do briefing */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-600" /> Geração de Conteúdo com IA
                </h2>
                {data.status !== 'approved' && (
                  <button onClick={() => handleSave(true)} disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
                    <Check className="w-4 h-4" /> Aprovar Briefing
                  </button>
                )}
                {data.status === 'approved' && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium">
                    <Check className="w-4 h-4" /> Aprovado
                  </span>
                )}
              </div>

              {/* Resumo visual */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { label: 'Expert', value: data.expert_name || '—' },
                  { label: 'Produto', value: data.product_name || '—' },
                  { label: 'Preço', value: data.product_price ? `R$ ${data.product_price.toLocaleString('pt-BR')}` : '—' },
                  { label: 'Garantia', value: data.product_guarantee || '—' },
                ].map(item => (
                  <div key={item.label} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-500 mb-0.5">{item.label}</p>
                    <p className="font-semibold text-slate-800 text-sm truncate">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* API Key input */}
              <div className="border-t pt-4">
                <button onClick={() => setShowApiInput(!showApiInput)}
                  className="text-sm text-violet-600 hover:underline flex items-center gap-1">
                  🔑 {apiKey ? '✅ Chave OpenAI configurada' : 'Configurar chave OpenAI (GPT-4o)'}
                </button>
                {showApiInput && (
                  <div className="mt-3 flex gap-2">
                    <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                      placeholder="sk-..." className={cn(inputCls, 'flex-1')} />
                    <button onClick={() => setShowApiInput(false)}
                      className="px-3 py-2 bg-violet-600 text-white rounded-lg text-sm">Salvar</button>
                  </div>
                )}
              </div>
            </div>

            {/* Botões de geração */}
            {[
              { type: 'page', label: '📄 Página de Vendas', desc: 'Copy completa para landing page' },
              { type: 'email_sequence', label: '📧 Sequência de Emails', desc: '5 emails para semana de lançamento' },
              { type: 'whatsapp', label: '💬 Scripts WhatsApp', desc: '5 mensagens de disparo' },
              { type: 'campaign', label: '📅 Plano de Conteúdo', desc: '20 posts para redes sociais' },
            ].map(item => (
              <div key={item.type} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-800">{item.label}</h3>
                    <p className="text-sm text-slate-500">{item.desc}</p>
                  </div>
                  <button onClick={() => handleGenerate(item.type)}
                    disabled={!!generating || !apiKey}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                      !apiKey ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-violet-500/20',
                      generating === item.type && 'opacity-70'
                    )}>
                    {generating === item.type ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
                    ) : (
                      <><Wand2 className="w-4 h-4" /> Gerar</>
                    )}
                  </button>
                </div>

                {/* Conteúdo gerado */}
                {generatedContent[item.type] && (
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-violet-600">Conteúdo gerado por GPT-4o</span>
                      <button onClick={() => navigator.clipboard.writeText(generatedContent[item.type])}
                        className="text-xs text-slate-500 hover:text-violet-600 transition-colors">📋 Copiar</button>
                    </div>
                    <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed max-h-96 overflow-y-auto">
                      {generatedContent[item.type]}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-2">
          <button onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          <div className="flex gap-3">
            <button onClick={() => handleSave()} disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-violet-200 text-violet-700 text-sm font-medium hover:bg-violet-50 transition-all">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Rascunho
            </button>
            {step < STEPS.length ? (
              <button onClick={() => setStep(s => s + 1)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-all">
                Próximo <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={() => handleSave(true)} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-all">
                <Check className="w-4 h-4" /> Aprovar Briefing
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
