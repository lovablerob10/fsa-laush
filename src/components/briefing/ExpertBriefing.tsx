import { useState, useEffect } from 'react';
import { 
  User, 
  Target, 
  FileText, 
  MessageSquare, 
  Save, 
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Upload,
  Building2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/store';
import { cn } from '@/lib/utils';

interface BriefingData {
  tenant_id: string;
  // Dados do Expert
  expertName: string;
  expertBio: string;
  expertPhoto: string;
  expertCredentials: string[];
  
  // Dados do Produto
  productName: string;
  productDescription: string;
  productPrice: string;
  productInstallments: string;
  productBonuses: string[];
  productGuarantee: string;
  
  // Público-Alvo
  targetAudience: string;
  audiencePainPoints: string[];
  audienceDesires: string[];
  audienceObjections: string[];
  
  // Proposta de Valor
  mainPromise: string;
  mainBenefit: string;
  differentiation: string;
  
  // Tom de Voz
  voiceTone: string[];
  wordsToUse: string[];
  wordsToAvoid: string[];
  
  // Frameworks
  frameworkPage: string;
  frameworkEmail: string;
  frameworkWhatsApp: string;
}

const INITIAL_DATA: BriefingData = {
  tenant_id: '',
  expertName: '',
  expertBio: '',
  expertPhoto: '',
  expertCredentials: [],
  productName: '',
  productDescription: '',
  productPrice: '',
  productInstallments: '12',
  productBonuses: [],
  productGuarantee: '7 dias',
  targetAudience: '',
  audiencePainPoints: [],
  audienceDesires: [],
  audienceObjections: [],
  mainPromise: '',
  mainBenefit: '',
  differentiation: '',
  voiceTone: [],
  wordsToUse: [],
  wordsToAvoid: [],
  frameworkPage: 'padrao',
  frameworkEmail: 'padrao',
  frameworkWhatsApp: 'padrao',
};

const VOICE_TONES = [
  { id: 'autoritario', label: 'Autoritário', description: 'Posiciona o expert como autoridade' },
  { id: 'amigavel', label: 'Amigável', description: 'Tom conversacional e próximo' },
  { id: 'urgente', label: 'Urgente', description: 'Cria senso de urgência' },
  { id: 'inspirador', label: 'Inspirador', description: 'Motiva e inspira ação' },
  { id: 'direto', label: 'Direto', description: 'Vai direto ao ponto' },
  { id: 'emocional', label: 'Emocional', description: 'Conecta com emoções' },
];

const FRAMEWORKS_PAGE = [
  { id: 'padrao', label: 'Padrão Launch Lab', description: 'Estrutura comprovada de 12 seções' },
  { id: 'vsl', label: 'VSL (Video Sales Letter)', description: 'Página focada em vídeo de vendas' },
  { id: 'texto', label: 'Página de Texto Longo', description: 'Copy extensa e persuasiva' },
  { id: 'webinar', label: 'Webinar', description: 'Página de inscrição para webinar' },
  { id: 'desafio', label: 'Desafio', description: 'Página de desafio de X dias' },
];

export function ExpertBriefing() {
  const { tenant } = useAuthStore();
  const [data, setData] = useState<BriefingData>(INITIAL_DATA);
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [savedBriefings, setSavedBriefings] = useState<any[]>([]);

  // Inicializa com tenant_id
  useEffect(() => {
    if (tenant?.id) {
      setData(prev => ({ ...prev, tenant_id: tenant.id }));
      // Aqui você carregaria os briefings salvos deste tenant
      loadSavedBriefings(tenant.id);
    }
  }, [tenant?.id]);

  const loadSavedBriefings = async (tenantId: string) => {
    // Simulação - em produção, buscaria do Supabase
    // const { data: briefings } = await supabase
    //   .from('briefings')
    //   .select('*')
    //   .eq('tenant_id', tenantId);
    console.log(`Carregando briefings do tenant: ${tenantId}`);
  };

  const totalSteps = 6;
  const progress = (currentStep / totalSteps) * 100;

  const updateField = (field: keyof BriefingData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const addArrayItem = (field: keyof BriefingData, item: string) => {
    if (!item.trim()) return;
    setData(prev => ({
      ...prev,
      [field]: [...(prev[field] as string[]), item.trim()]
    }));
  };

  const removeArrayItem = (field: keyof BriefingData, index: number) => {
    setData(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    // Salva o briefing no Supabase vinculado ao tenant
    // await supabase.from('briefings').insert({ ...data, tenant_id: tenant?.id });
    alert(`Briefing salvo para o cliente: ${tenant?.name}`);
  };

  const handleGenerate = async () => {
    if (!tenant?.id) {
      alert('Selecione um cliente primeiro');
      return;
    }

    setIsGenerating(true);
    // Simula geração usando os frameworks do tenant
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setGeneratedContent({
      page: `Página de vendas gerada para ${data.productName}`,
      emails: [
        `E-mail 1 - Aquecimento (${tenant?.name})`,
        `E-mail 2 - Contexto (${tenant?.name})`,
        `E-mail 3 - Solução (${tenant?.name})`,
      ],
      whatsapp: `Scripts WhatsApp para ${data.expertName}`,
      calendar: `Calendário personalizado - ${tenant?.name}`,
    });
    
    setIsGenerating(false);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold">Dados do Expert</h3>
              <p className="text-slate-500">Informações sobre quem está vendendo</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Nome Completo do Expert</Label>
                <Input 
                  placeholder="Ex: João Silva"
                  value={data.expertName}
                  onChange={(e) => updateField('expertName', e.target.value)}
                />
              </div>
              
              <div>
                <Label>Biografia/Bio do Expert</Label>
                <Textarea 
                  placeholder="Conte a história do expert, credenciais, resultados..."
                  value={data.expertBio}
                  onChange={(e) => updateField('expertBio', e.target.value)}
                  rows={4}
                />
              </div>
              
              <div>
                <Label>Foto do Expert</Label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Arraste uma foto ou clique para upload</p>
                </div>
              </div>
              
              <div>
                <Label>Credenciais/Certificações</Label>
                <div className="flex gap-2 mb-2">
                  <Input 
                    placeholder="Ex: MBA em Marketing"
                    id="credential-input"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addArrayItem('expertCredentials', (e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const input = document.getElementById('credential-input') as HTMLInputElement;
                      addArrayItem('expertCredentials', input.value);
                      input.value = '';
                    }}
                  >
                    Adicionar
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.expertCredentials.map((cred, i) => (
                    <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => removeArrayItem('expertCredentials', i)}>
                      {cred} ×
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold">Dados do Produto</h3>
              <p className="text-slate-500">O que está sendo vendido</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Nome do Produto</Label>
                <Input 
                  placeholder="Ex: Método XYZ Completo"
                  value={data.productName}
                  onChange={(e) => updateField('productName', e.target.value)}
                />
              </div>
              
              <div>
                <Label>Descrição do Produto</Label>
                <Textarea 
                  placeholder="Descreva o que o produto entrega, módulos, conteúdo..."
                  value={data.productDescription}
                  onChange={(e) => updateField('productDescription', e.target.value)}
                  rows={4}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Preço (R$)</Label>
                  <Input 
                    placeholder="1997"
                    value={data.productPrice}
                    onChange={(e) => updateField('productPrice', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Parcelas</Label>
                  <Input 
                    placeholder="12"
                    value={data.productInstallments}
                    onChange={(e) => updateField('productInstallments', e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <Label>Garantia</Label>
                <Input 
                  placeholder="Ex: 7 dias de garantia incondicional"
                  value={data.productGuarantee}
                  onChange={(e) => updateField('productGuarantee', e.target.value)}
                />
              </div>
              
              <div>
                <Label>Bônus Inclusos</Label>
                <div className="flex gap-2 mb-2">
                  <Input 
                    placeholder="Ex: E-book exclusivo"
                    id="bonus-input"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addArrayItem('productBonuses', (e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const input = document.getElementById('bonus-input') as HTMLInputElement;
                      addArrayItem('productBonuses', input.value);
                      input.value = '';
                    }}
                  >
                    Adicionar
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.productBonuses.map((bonus, i) => (
                    <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => removeArrayItem('productBonuses', i)}>
                      {bonus} ×
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold">Público-Alvo</h3>
              <p className="text-slate-500">Quem é o cliente ideal</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Descrição do Público-Alvo</Label>
                <Textarea 
                  placeholder="Descreva o perfil do cliente ideal: idade, profissão, renda, interesses..."
                  value={data.targetAudience}
                  onChange={(e) => updateField('targetAudience', e.target.value)}
                  rows={3}
                />
              </div>
              
              <div>
                <Label>Principais Dores</Label>
                <div className="flex gap-2 mb-2">
                  <Input 
                    placeholder="Ex: Não consegue aumentar vendas"
                    id="pain-input"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addArrayItem('audiencePainPoints', (e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const input = document.getElementById('pain-input') as HTMLInputElement;
                      addArrayItem('audiencePainPoints', input.value);
                      input.value = '';
                    }}
                  >
                    Adicionar
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.audiencePainPoints.map((pain, i) => (
                    <Badge key={i} variant="destructive" className="cursor-pointer" onClick={() => removeArrayItem('audiencePainPoints', i)}>
                      {pain} ×
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <Label>Principais Desejos</Label>
                <div className="flex gap-2 mb-2">
                  <Input 
                    placeholder="Ex: Quer ter liberdade financeira"
                    id="desire-input"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addArrayItem('audienceDesires', (e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const input = document.getElementById('desire-input') as HTMLInputElement;
                      addArrayItem('audienceDesires', input.value);
                      input.value = '';
                    }}
                  >
                    Adicionar
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.audienceDesires.map((desire, i) => (
                    <Badge key={i} variant="default" className="cursor-pointer bg-emerald-500" onClick={() => removeArrayItem('audienceDesires', i)}>
                      {desire} ×
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <Label>Objeções Comuns</Label>
                <div className="flex gap-2 mb-2">
                  <Input 
                    placeholder="Ex: 'É muito caro'"
                    id="objection-input"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addArrayItem('audienceObjections', (e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const input = document.getElementById('objection-input') as HTMLInputElement;
                      addArrayItem('audienceObjections', input.value);
                      input.value = '';
                    }}
                  >
                    Adicionar
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.audienceObjections.map((obj, i) => (
                    <Badge key={i} variant="outline" className="cursor-pointer" onClick={() => removeArrayItem('audienceObjections', i)}>
                      {obj} ×
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
        
      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold">Proposta de Valor</h3>
              <p className="text-slate-500">A promessa principal do produto</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Promessa Principal (Headline)</Label>
                <Textarea 
                  placeholder="Ex: Descubra como aumentar suas vendas em 300% em 90 dias..."
                  value={data.mainPromise}
                  onChange={(e) => updateField('mainPromise', e.target.value)}
                  rows={2}
                />
              </div>
              
              <div>
                <Label>Benefício Principal</Label>
                <Textarea 
                  placeholder="Qual é o resultado principal que o cliente vai obter?"
                  value={data.mainBenefit}
                  onChange={(e) => updateField('mainBenefit', e.target.value)}
                  rows={2}
                />
              </div>
              
              <div>
                <Label>Diferencial Competitivo</Label>
                <Textarea 
                  placeholder="Por que o cliente deve escolher você ao invés da concorrência?"
                  value={data.differentiation}
                  onChange={(e) => updateField('differentiation', e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          </div>
        );
        
      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold">Tom de Voz</h3>
              <p className="text-slate-500">Como a marca deve se comunicar</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Tom de Voz Principal</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {VOICE_TONES.map((tone) => (
                    <button
                      key={tone.id}
                      onClick={() => {
                        const newTones = data.voiceTone.includes(tone.id)
                          ? data.voiceTone.filter(t => t !== tone.id)
                          : [...data.voiceTone, tone.id];
                        updateField('voiceTone', newTones);
                      }}
                      className={cn(
                        'p-3 rounded-lg border-2 text-left transition-all',
                        data.voiceTone.includes(tone.id)
                          ? 'border-violet-500 bg-violet-50'
                          : 'border-slate-200 hover:border-violet-300'
                      )}
                    >
                      <span className="font-medium">{tone.label}</span>
                      <p className="text-xs text-slate-500">{tone.description}</p>
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <Label>Palavras/Frases para Usar</Label>
                <div className="flex gap-2 mb-2">
                  <Input 
                    placeholder="Ex: Resultado garantido"
                    id="word-use-input"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addArrayItem('wordsToUse', (e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const input = document.getElementById('word-use-input') as HTMLInputElement;
                      addArrayItem('wordsToUse', input.value);
                      input.value = '';
                    }}
                  >
                    Adicionar
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.wordsToUse.map((word, i) => (
                    <Badge key={i} className="bg-emerald-100 text-emerald-700 cursor-pointer" onClick={() => removeArrayItem('wordsToUse', i)}>
                      {word} ×
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <Label>Palavras/Frases para EVITAR</Label>
                <div className="flex gap-2 mb-2">
                  <Input 
                    placeholder="Ex: Compre agora (muito agressivo)"
                    id="word-avoid-input"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addArrayItem('wordsToAvoid', (e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const input = document.getElementById('word-avoid-input') as HTMLInputElement;
                      addArrayItem('wordsToAvoid', input.value);
                      input.value = '';
                    }}
                  >
                    Adicionar
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.wordsToAvoid.map((word, i) => (
                    <Badge key={i} variant="destructive" className="cursor-pointer" onClick={() => removeArrayItem('wordsToAvoid', i)}>
                      {word} ×
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
        
      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold">Frameworks</h3>
              <p className="text-slate-500">Escolha os frameworks para geração</p>
            </div>
            
            <div className="space-y-6">
              <div>
                <Label>Framework para Página de Vendas</Label>
                <div className="space-y-2 mt-2">
                  {FRAMEWORKS_PAGE.map((fw) => (
                    <button
                      key={fw.id}
                      onClick={() => updateField('frameworkPage', fw.id)}
                      className={cn(
                        'w-full p-3 rounded-lg border-2 text-left transition-all',
                        data.frameworkPage === fw.id
                          ? 'border-violet-500 bg-violet-50'
                          : 'border-slate-200 hover:border-violet-300'
                      )}
                    >
                      <span className="font-medium">{fw.label}</span>
                      <p className="text-xs text-slate-500">{fw.description}</p>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Frameworks Personalizados</p>
                    <p className="text-sm text-amber-700">
                      Você pode carregar seus próprios frameworks na aba "Frameworks & IAs". 
                      Cada cliente pode ter seus frameworks exclusivos.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header com identificação do cliente */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Briefing do Expert</h1>
          <p className="text-slate-500">Preencha as informações para gerar páginas e copies</p>
        </div>
        <div className="flex items-center gap-4">
          {tenant && (
            <div className="flex items-center gap-2 px-4 py-2 bg-violet-100 rounded-lg">
              <Building2 className="w-4 h-4 text-violet-600" />
              <span className="text-sm font-medium text-violet-700">{tenant.name}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Passo {currentStep} de {totalSteps}</span>
            <div className="w-32">
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        </div>
      </div>

      {!generatedContent ? (
        <>
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-6">
              {renderStep()}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between max-w-2xl mx-auto">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Anterior
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleSave}
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar Rascunho
              </Button>
              
              {currentStep < totalSteps ? (
                <Button
                  onClick={() => setCurrentStep(Math.min(totalSteps, currentStep + 1))}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  Próximo
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !tenant?.id}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isGenerating ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Gerar Conteúdo
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900">Conteúdo Gerado!</h2>
            <p className="text-slate-500">Revise e aprove os materiais gerados para {tenant?.name}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Página de Vendas</h3>
                    <p className="text-sm text-slate-500">HTML completo pronto</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full">Ver Página</Button>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Sequência de E-mails</h3>
                    <p className="text-sm text-slate-500">7 e-mails de nutrição</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full">Ver E-mails</Button>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Scripts WhatsApp</h3>
                    <p className="text-sm text-slate-500">Mensagens de recuperação</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full">Ver Scripts</Button>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Calendário de Ações</h3>
                    <p className="text-sm text-slate-500">O que fazer cada dia</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full">Ver Calendário</Button>
              </CardContent>
            </Card>
          </div>
          
          <div className="text-center">
            <Button variant="outline" onClick={() => setGeneratedContent(null)}>
              Voltar e Editar Briefing
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
