import { useState } from 'react';
import { 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Instagram, 
  Mail, 
  MessageCircle, 
  Video,
  FileText,
  TrendingUp,
  Users,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Copy,
  Check,
  Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface DayAction {
  day: number;
  week: number;
  phase: string;
  actions: Action[];
}

interface Action {
  id: string;
  type: 'instagram' | 'email' | 'whatsapp' | 'live' | 'story' | 'reel' | 'copy' | 'ads';
  title: string;
  description: string;
  objective: string;
  tips: string[];
  completed: boolean;
}

const ACTION_TYPES = {
  instagram: { icon: Instagram, label: 'Post Instagram', color: 'bg-pink-100 text-pink-600' },
  story: { icon: Instagram, label: 'Story', color: 'bg-pink-100 text-pink-600' },
  reel: { icon: Video, label: 'Reel', color: 'bg-purple-100 text-purple-600' },
  email: { icon: Mail, label: 'E-mail', color: 'bg-blue-100 text-blue-600' },
  whatsapp: { icon: MessageCircle, label: 'WhatsApp', color: 'bg-emerald-100 text-emerald-600' },
  live: { icon: Video, label: 'Live', color: 'bg-red-100 text-red-600' },
  copy: { icon: FileText, label: 'Copy', color: 'bg-violet-100 text-violet-600' },
  ads: { icon: TrendingUp, label: 'Anúncio', color: 'bg-amber-100 text-amber-600' },
};

const MOCK_CALENDAR: DayAction[] = [
  // SEMANA 1 - PLANEJAMENTO
  {
    day: 1,
    week: 1,
    phase: 'Planejamento',
    actions: [
      {
        id: '1-1',
        type: 'copy',
        title: 'Definir Promessa Principal',
        description: 'Criar a headline principal do lançamento',
        objective: 'Ter clareza da promessa que será comunicada',
        tips: ['Use o briefing preenchido', 'Foque no resultado principal', 'Teste 3 variações'],
        completed: false,
      },
      {
        id: '1-2',
        type: 'instagram',
        title: 'Post de Aquecimento #1',
        description: 'Conteúdo educativo relacionado à dor do público',
        objective: 'Começar a gerar engajamento e autoridade',
        tips: ['Não vender ainda', 'Entregar valor real', 'Usar storytelling'],
        completed: false,
      },
    ],
  },
  {
    day: 2,
    week: 1,
    phase: 'Planejamento',
    actions: [
      {
        id: '2-1',
        type: 'copy',
        title: 'Estruturar Página de Vendas',
        description: 'Criar outline da página com todas as seções',
        objective: 'Ter o esqueleto da página pronto',
        tips: ['Siga o framework escolhido', 'Incluir todas as objeções', 'Prever CTAs'],
        completed: false,
      },
      {
        id: '2-2',
        type: 'story',
        title: 'Stories de Bastidores',
        description: 'Mostrar preparação do produto/lançamento',
        objective: 'Humanizar e criar conexão',
        tips: ['Mostre seu dia a dia', 'Compartilhe desafios', 'Seja autêntico'],
        completed: false,
      },
    ],
  },
  {
    day: 3,
    week: 1,
    phase: 'Planejamento',
    actions: [
      {
        id: '3-1',
        type: 'email',
        title: 'E-mail de Aquecimento #1',
        description: 'Primeiro e-mail da sequência de nutrição',
        objective: 'Começar a aquecer a lista',
        tips: ['Assunto chamativo', 'Conteúdo valioso', 'CTA sutil'],
        completed: false,
      },
      {
        id: '3-2',
        type: 'instagram',
        title: 'Post de Autoridade',
        description: 'Conteúdo que posiciona você como expert',
        objective: 'Fortalecer credibilidade',
        tips: ['Compartilhe resultados', 'Mostre sua metodologia', 'Use prova social'],
        completed: false,
      },
    ],
  },
  // SEMANA 2 - ANTECIPAÇÃO
  {
    day: 8,
    week: 2,
    phase: 'Antecipação',
    actions: [
      {
        id: '8-1',
        type: 'whatsapp',
        title: 'Mensagem de Aquecimento',
        description: 'Primeiro contato no WhatsApp sobre o lançamento',
        objective: 'Aquecer contatos no WhatsApp',
        tips: ['Personalize a mensagem', 'Não seja spam', 'Ofereça valor primeiro'],
        completed: false,
      },
      {
        id: '8-2',
        type: 'reel',
        title: 'Reel de Transformação',
        description: 'Mostrar antes/depois de alunos/clientes',
        objective: 'Gerar desejo e prova social',
        tips: ['Use cases reais', 'Inclua depoimentos', 'CTA no final'],
        completed: false,
      },
    ],
  },
  {
    day: 10,
    week: 2,
    phase: 'Antecipação',
    actions: [
      {
        id: '10-1',
        type: 'live',
        title: 'Live de Aquecimento',
        description: 'Live gratuita entregando valor e apresentando o método',
        objective: 'Gerar leads qualificados',
        tips: ['Entregue conteúdo de verdade', 'Faça oferta no final', 'Tenha CTA claro'],
        completed: false,
      },
    ],
  },
  // SEMANA 4 - ABERTURA
  {
    day: 22,
    week: 4,
    phase: 'Abertura de Carrinho',
    actions: [
      {
        id: '22-1',
        type: 'email',
        title: 'E-mail de Abertura',
        description: 'E-mail anunciando que o carrinho está aberto',
        objective: 'Gerar vendas imediatas',
        tips: ['Urgência real', 'Bonus por tempo limitado', 'CTA claro'],
        completed: false,
      },
      {
        id: '22-2',
        type: 'whatsapp',
        title: 'Disparo de Abertura',
        description: 'Mensagem para lista de interessados',
        objective: 'Converter leads em vendas',
        tips: ['Personalize com nome', 'Link direto', 'Urgência'],
        completed: false,
      },
      {
        id: '22-3',
        type: 'instagram',
        title: 'Post de Abertura',
        description: 'Post oficial anunciando que está aberto',
        objective: 'Alcance orgânico + stories',
        tips: ['Link na bio', 'Stories em sequência', 'Responder comentários rápido'],
        completed: false,
      },
      {
        id: '22-4',
        type: 'live',
        title: 'Live de Lançamento',
        description: 'Live oficial de abertura do carrinho',
        objective: 'Vender em massa',
        tips: ['Energia alta', 'Bonus ao vivo', 'Contagem regressiva'],
        completed: false,
      },
    ],
  },
];

export function ActionCalendar() {
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [completedActions, setCompletedActions] = useState<string[]>([]);
  const [showCopied, setShowCopied] = useState(false);

  const toggleAction = (actionId: string) => {
    setCompletedActions(prev => 
      prev.includes(actionId) 
        ? prev.filter(id => id !== actionId)
        : [...prev, actionId]
    );
  };

  const copyAction = (action: Action) => {
    const text = `
**${action.title}**

${action.description}

🎯 Objetivo: ${action.objective}

💡 Dicas:
${action.tips.map(t => `• ${t}`).join('\n')}
    `.trim();
    
    navigator.clipboard.writeText(text);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const weekDays = MOCK_CALENDAR.filter(d => d.week === selectedWeek);
  const totalActions = MOCK_CALENDAR.reduce((acc, day) => acc + day.actions.length, 0);
  const completedCount = completedActions.length;
  const progress = (completedCount / totalActions) * 100;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calendário de Ações</h1>
          <p className="text-slate-500">O que fazer em cada dia do lançamento</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-slate-500">Progresso</p>
            <p className="font-semibold">{completedCount}/{totalActions} ações</p>
          </div>
          <div className="w-32">
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      {/* Week Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedWeek(Math.max(1, selectedWeek - 1))}
          disabled={selectedWeek === 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        {[1, 2, 3, 4, 5, 6, 7].map(week => (
          <Button
            key={week}
            variant={selectedWeek === week ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedWeek(week)}
            className={cn(
              selectedWeek === week && 'bg-violet-600 hover:bg-violet-700'
            )}
          >
            Semana {week}
          </Button>
        ))}
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedWeek(Math.min(7, selectedWeek + 1))}
          disabled={selectedWeek === 7}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Phase Badge */}
      {weekDays.length > 0 && (
        <div className="flex items-center gap-2">
          <Badge className="bg-violet-100 text-violet-700">
            {weekDays[0].phase}
          </Badge>
          <span className="text-sm text-slate-500">
            Dia {weekDays[0].day} a {weekDays[weekDays.length - 1]?.day || weekDays[0].day}
          </span>
        </div>
      )}

      {/* Days Grid */}
      <div className="space-y-4">
        {weekDays.map((day) => (
          <Card key={day.day}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Dia {day.day}</CardTitle>
                    <p className="text-sm text-slate-500">{day.actions.length} ações</p>
                  </div>
                </div>
                <Badge variant="outline">
                  {day.actions.filter(a => completedActions.includes(a.id)).length}/{day.actions.length} concluídas
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {day.actions.map((action) => {
                const typeConfig = ACTION_TYPES[action.type];
                const Icon = typeConfig.icon;
                const isCompleted = completedActions.includes(action.id);
                
                return (
                  <div
                    key={action.id}
                    className={cn(
                      'p-4 rounded-lg border-2 transition-all',
                      isCompleted 
                        ? 'border-emerald-200 bg-emerald-50' 
                        : 'border-slate-200 hover:border-violet-300'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleAction(action.id)}
                        className="mt-1"
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-300" />
                        )}
                      </button>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={typeConfig.color}>
                            <Icon className="w-3 h-3 mr-1" />
                            {typeConfig.label}
                          </Badge>
                        </div>
                        
                        <h4 className={cn(
                          'font-semibold',
                          isCompleted && 'line-through text-slate-400'
                        )}>
                          {action.title}
                        </h4>
                        
                        <p className="text-sm text-slate-600 mt-1">
                          {action.description}
                        </p>
                        
                        <div className="mt-3 space-y-2">
                          <div className="flex items-start gap-2">
                            <Target className="w-4 h-4 text-violet-500 mt-0.5" />
                            <p className="text-sm text-slate-500">
                              <span className="font-medium">Objetivo:</span> {action.objective}
                            </p>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-amber-500 mt-0.5" />
                            <div className="text-sm text-slate-500">
                              <span className="font-medium">Dicas:</span>
                              <ul className="mt-1 space-y-1">
                                {action.tips.map((tip, i) => (
                                  <li key={i} className="flex items-start gap-1">
                                    <span className="text-violet-500">•</span>
                                    {tip}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyAction(action)}
                      >
                        {showCopied ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      {weekDays.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Nenhuma ação programada para esta semana</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
