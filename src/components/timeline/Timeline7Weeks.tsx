import { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  ChevronRight,
  Calendar,
  Target,
  Users,
  TrendingUp,
  MessageSquare,
  Mail,
  Video,
  Gift
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLaunchesStore, useAuthStore } from '@/store';
import { supabase } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Phase {
  id: string;
  name: string;
  week_start: number;
  week_end: number;
  status: 'pending' | 'in_progress' | 'completed';
  color: string;
  icon: React.ElementType;
  description: string;
  tasks: Task[];
}

interface Task {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assignee?: string;
  due_date?: string;
}

const PHASES_CONFIG = [
  {
    id: 'planning',
    name: 'Planejamento',
    week_start: 1,
    week_end: 1,
    color: 'bg-blue-500',
    icon: Target,
    description: 'Definição de estratégia, calendário e preparação de materiais',
  },
  {
    id: 'anticipation',
    name: 'Antecipação',
    week_start: 2,
    week_end: 3,
    color: 'bg-violet-500',
    icon: Users,
    description: 'Aquecimento do público, geração de leads e construção de lista',
  },
  {
    id: 'sales',
    name: 'Vendas',
    week_start: 4,
    week_end: 5,
    color: 'bg-emerald-500',
    icon: TrendingUp,
    description: 'Abertura de carrinho, lives de vendas e fechamento',
  },
  {
    id: 'immersion',
    name: 'Imersão',
    week_start: 6,
    week_end: 6,
    color: 'bg-amber-500',
    icon: Video,
    description: 'Entrega do produto, onboarding e primeiras aulas',
  },
  {
    id: 'upsell',
    name: 'Upsell',
    week_start: 7,
    week_end: 7,
    color: 'bg-rose-500',
    icon: Gift,
    description: 'Ofertas especiais, produtos complementares e retenção',
  },
];

const MOCK_TASKS: Record<string, Task[]> = {
  planning: [
    { id: '1', name: 'Definir estratégia de lançamento', description: 'Alinhar objetivos e metas', status: 'completed', priority: 'high' },
    { id: '2', name: 'Criar calendário de conteúdo', description: 'Planejar posts e e-mails', status: 'completed', priority: 'high' },
    { id: '3', name: 'Preparar copy da página de vendas', description: 'Textos persuasivos e otimizados', status: 'in_progress', priority: 'high' },
    { id: '4', name: 'Configurar pixel e tracking', description: 'Facebook Pixel, Google Analytics', status: 'pending', priority: 'medium' },
  ],
  anticipation: [
    { id: '5', name: 'Criar lead magnet', description: 'E-book, vídeo ou checklist', status: 'pending', priority: 'high' },
    { id: '6', name: 'Configurar página de captura', description: 'Formulário otimizado para conversão', status: 'pending', priority: 'high' },
    { id: '7', name: 'Iniciar campanhas de tráfego', description: 'Anúncios pagos no Meta', status: 'pending', priority: 'high' },
    { id: '8', name: 'Sequência de nutrição', description: 'E-mails automáticos de aquecimento', status: 'pending', priority: 'medium' },
    { id: '9', name: 'Conteúdo de valor', description: 'Posts, stories e reels educativos', status: 'pending', priority: 'medium' },
  ],
  sales: [
    { id: '10', name: 'Abrir carrinho', description: 'Disponibilizar link de compra', status: 'pending', priority: 'high' },
    { id: '11', name: 'Live de lançamento', description: 'Apresentação do produto', status: 'pending', priority: 'high' },
    { id: '12', name: 'Ativação de afiliados', description: 'Comissões e materiais', status: 'pending', priority: 'medium' },
    { id: '13', name: 'Recuperação de carrinho', description: 'Automação de abandono', status: 'pending', priority: 'high' },
    { id: '14', name: 'Live de encerramento', description: 'Última chance de comprar', status: 'pending', priority: 'high' },
  ],
  immersion: [
    { id: '15', name: 'Onboarding dos alunos', description: 'Boas-vindas e acesso', status: 'pending', priority: 'high' },
    { id: '16', name: 'Primeira aula ao vivo', description: 'Kickoff do programa', status: 'pending', priority: 'high' },
    { id: '17', name: 'Grupo de comunidade', description: 'WhatsApp ou Discord', status: 'pending', priority: 'medium' },
    { id: '18', name: 'Suporte e atendimento', description: 'Tirar dúvidas dos alunos', status: 'pending', priority: 'medium' },
  ],
  upsell: [
    { id: '19', name: 'Oferta de upsell', description: 'Produto complementar', status: 'pending', priority: 'high' },
    { id: '20', name: 'Programa de indicação', description: 'Recompensar alunos', status: 'pending', priority: 'medium' },
    { id: '21', name: 'Pesquisa de satisfação', description: 'NPS e feedback', status: 'pending', priority: 'low' },
  ],
};

export function Timeline7Weeks() {
  const { selectedLaunch, setLaunches, selectLaunch } = useLaunchesStore();
  const { tenant } = useAuthStore();
  const [phases, setPhases] = useState<Phase[]>([]);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [selectedPhase, setSelectedPhase] = useState<string>('planning');

  useEffect(() => {
    loadLaunchData();
  }, [tenant]);

  async function loadLaunchData() {
    try {
      // Busca lançamentos do tenant
      const { data: launchesData } = await supabase
        .from('launches')
        .select('*, launch_phases(*, tasks(*))')
        .eq('tenant_id', tenant?.id)
        .order('created_at', { ascending: false });

      if (launchesData && launchesData.length > 0) {
        setLaunches(launchesData as any);
        selectLaunch(launchesData[0] as any);
        
        // Calcula semana atual
        const launch = launchesData[0] as any;
        const startDate = new Date(launch.start_date);
        const now = new Date();
        const diffWeeks = Math.floor((now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        setCurrentWeek(Math.min(Math.max(diffWeeks + 1, 1), 7));

        // Monta fases com tasks
        const phasesWithTasks: Phase[] = PHASES_CONFIG.map(phase => ({
          ...phase,
          status: (launch.current_week >= phase.week_start 
            ? launch.current_week > phase.week_end ? 'completed' : 'in_progress'
            : 'pending') as 'pending' | 'in_progress' | 'completed',
          tasks: MOCK_TASKS[phase.id] || [],
        }));
        
        setPhases(phasesWithTasks);
      } else {
        // Cria fases mockadas para demonstração
        const mockPhases: Phase[] = PHASES_CONFIG.map(phase => ({
          ...phase,
          status: (currentWeek >= phase.week_start 
            ? currentWeek > phase.week_end ? 'completed' : 'in_progress'
            : 'pending') as 'pending' | 'in_progress' | 'completed',
          tasks: MOCK_TASKS[phase.id] || [],
        }));
        setPhases(mockPhases);
      }
    } catch (error) {
      console.error('Erro ao carregar lançamento:', error);
    }
  }

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-amber-500" />;
      default:
        return <Circle className="w-5 h-5 text-slate-300" />;
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'medium':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Timeline de Lançamento</h1>
          <p className="text-slate-500">
            {selectedLaunch?.name || 'Novo Lançamento'} - Semana {currentWeek} de 7
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            {format(new Date(), 'dd/MM/yyyy')}
          </Button>
          <Button size="sm" className="bg-violet-600 hover:bg-violet-700">
            Nova Tarefa
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-600">Progresso do Lançamento</span>
            <span className="text-sm font-bold text-violet-600">
              {Math.round((currentWeek / 7) * 100)}%
            </span>
          </div>
          <div className="relative">
            <Progress value={(currentWeek / 7) * 100} className="h-3" />
            <div className="flex justify-between mt-2">
              {Array.from({ length: 7 }, (_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold -mt-5",
                    i + 1 <= currentWeek 
                      ? 'bg-violet-600 text-white' 
                      : 'bg-slate-200 text-slate-500'
                  )}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {phases.map((phase) => {
          const Icon = phase.icon;
          const isActive = selectedPhase === phase.id;
          const isCurrentPhase = currentWeek >= phase.week_start && currentWeek <= phase.week_end;
          
          return (
            <button
              key={phase.id}
              onClick={() => setSelectedPhase(phase.id)}
              className={cn(
                'relative p-4 rounded-xl border-2 transition-all text-left',
                isActive 
                  ? 'border-violet-500 bg-violet-50' 
                  : 'border-slate-200 hover:border-violet-300',
                isCurrentPhase && 'ring-2 ring-violet-500 ring-offset-2'
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center mb-3',
                phase.color.replace('bg-', 'bg-opacity-20 bg-')
              )}>
                <Icon className={cn('w-5 h-5', phase.color.replace('bg-', 'text-'))} />
              </div>
              
              <h3 className="font-semibold text-slate-900">{phase.name}</h3>
              <p className="text-xs text-slate-500 mt-1">
                Semana {phase.week_start}{phase.week_end !== phase.week_start && `-${phase.week_end}`}
              </p>
              
              <div className="mt-3">
                {phase.status === 'completed' ? (
                  <Badge className="bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Concluído
                  </Badge>
                ) : phase.status === 'in_progress' ? (
                  <Badge className="bg-violet-100 text-violet-700">
                    <Clock className="w-3 h-3 mr-1" />
                    Em andamento
                  </Badge>
                ) : (
                  <Badge variant="secondary">Pendente</Badge>
                )}
              </div>

              {isCurrentPhase && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-violet-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Phase Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                {phases.find(p => p.id === selectedPhase)?.name}
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                {phases.find(p => p.id === selectedPhase)?.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">
                {phases.find(p => p.id === selectedPhase)?.tasks.filter(t => t.status === 'completed').length} / {phases.find(p => p.id === selectedPhase)?.tasks.length} tarefas
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {phases.find(p => p.id === selectedPhase)?.tasks.map((task) => (
              <div 
                key={task.id}
                className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <button className="flex-shrink-0">
                  {getStatusIcon(task.status)}
                </button>
                
                <div className="flex-1">
                  <h4 className={cn(
                    'font-medium',
                    task.status === 'completed' && 'line-through text-slate-400'
                  )}>
                    {task.name}
                  </h4>
                  <p className="text-sm text-slate-500">{task.description}</p>
                </div>

                <Badge className={getPriorityColor(task.priority)}>
                  {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                </Badge>

                {task.assignee && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <div className="w-6 h-6 bg-violet-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-violet-600">
                        {task.assignee.charAt(0)}
                      </span>
                    </div>
                    {task.assignee}
                  </div>
                )}

                <Button variant="ghost" size="sm">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Meta de Receita</p>
                <p className="text-lg font-bold">R$ 2M</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Leads na Lista</p>
                <p className="text-lg font-bold">3,456</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Taxa de Abertura</p>
                <p className="text-lg font-bold">68%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">E-mails Enviados</p>
                <p className="text-lg font-bold">12,345</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
