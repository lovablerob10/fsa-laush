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
  Gift,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useLaunchesStore, useAuthStore, useUIStore } from '@/store';
import { supabase } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { TaskDetailPanel } from './TaskDetailPanel';

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
  const { tenant, activeTenant } = useAuthStore() as any;
  const { pendingOpenTaskId, setPendingOpenTaskId } = useUIStore() as any;
  const [phases, setPhases] = useState<Phase[]>([]);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [selectedPhase, setSelectedPhase] = useState<string>('planning');
  const [hasData, setHasData] = useState<boolean | null>(null); // null = loading

  useEffect(() => {
    loadLaunchData();
  }, [activeTenant, tenant]);

  // Auto-open task when coming from notification bell
  useEffect(() => {
    if (!pendingOpenTaskId || phases.length === 0) return;
    for (const phase of phases) {
      const task = phase.tasks.find(t => t.id === pendingOpenTaskId);
      if (task) {
        setSelectedTask(task);
        setSelectedPhase(phase.id);
        setPendingOpenTaskId(null); // clear immediately so it doesn't re-trigger
        break;
      }
    }
  }, [pendingOpenTaskId, phases]);

  async function loadLaunchData() {
    const tenantId = (activeTenant as any)?.id || (tenant as any)?.id;
    if (!tenantId) return;
    try {
      setHasData(null);
      // Busca lançamentos do tenant com fases e tasks
      const { data: launchesData } = await supabase
        .from('launches')
        .select('*, launch_phases(*, tasks(*))')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (launchesData && launchesData.length > 0) {
        setLaunches(launchesData as any);
        selectLaunch(launchesData[0] as any);

        const launch = launchesData[0] as any;
        const startDate = new Date(launch.start_date);
        const now = new Date();
        const diffWeeks = Math.floor((now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        setCurrentWeek(Math.min(Math.max(diffWeeks + 1, 1), 7));
        // Store start date for editing
        setLaunchStartDate(launch.start_date ? launch.start_date.split('T')[0] : '');

        // Map launch_phases (from DB) to Phase[] using PHASES_CONFIG structure
        const dbPhases = (launch.launch_phases || []) as any[];

        if (dbPhases.length > 0) {
          // Use real DB data — match by phase_type first, then by week_number
          const tenantId = (activeTenant as any)?.id || (tenant as any)?.id;
          const phasesWithTasks: Phase[] = await Promise.all(PHASES_CONFIG.map(async (cfg, idx) => {
            // Try matching: (1) phase_type, (2) week_number, (3) index order
            const dbPhase = dbPhases.find((p: any) => p.phase_type === cfg.id)
              || dbPhases.find((p: any) => p.week_number === cfg.week_start)
              || dbPhases[idx];
            const currentWk = launch.current_week || 1;
            const status = dbPhase
              ? (currentWk > cfg.week_end ? 'completed' : currentWk >= cfg.week_start ? 'in_progress' : 'pending') as Phase['status']
              : 'pending' as Phase['status'];

            let tasks: Task[] = (dbPhase?.tasks || []).map((t: any) => ({
              id: t.id,
              name: t.name,
              description: t.description || '',
              status: t.status || 'pending',
              priority: t.priority || 'medium',
              assignee: t.assignee,
              due_date: t.due_date,
            }));

            // If phase exists in DB but has no tasks, seed with defaults
            if (dbPhase && tasks.length === 0 && MOCK_TASKS[cfg.id]) {
              const mockTasks = MOCK_TASKS[cfg.id];
              for (const mt of mockTasks) {
                try {
                  const { data: inserted } = await (supabase.from('tasks') as any)
                    .insert({
                      phase_id: dbPhase.id,
                      tenant_id: tenantId,
                      name: mt.name,
                      description: mt.description,
                      priority: mt.priority,
                      status: 'pending',
                    })
                    .select()
                    .single();
                  if (inserted) {
                    tasks.push({
                      id: inserted.id,
                      name: inserted.name,
                      description: inserted.description || '',
                      status: inserted.status || 'pending',
                      priority: inserted.priority || 'medium',
                      due_date: inserted.due_date,
                    });
                  }
                } catch (err) {
                  console.error('Erro ao semear tarefa:', err);
                }
              }
            }

            return { ...cfg, status, tasks, description: dbPhase?.name || cfg.description };
          }));
          setPhases(phasesWithTasks);
          setHasData(true);
        } else {
          // Launch exists but phases not yet created (use mock)
          const mockPhases: Phase[] = PHASES_CONFIG.map(phase => ({
            ...phase,
            status: (currentWeek >= phase.week_start
              ? currentWeek > phase.week_end ? 'completed' : 'in_progress'
              : 'pending') as 'pending' | 'in_progress' | 'completed',
            tasks: MOCK_TASKS[phase.id] || [],
          }));
          setPhases(mockPhases);
          setHasData(false);
        }
      } else {
        // No launch data at all
        setHasData(false);
        const mockPhases: Phase[] = PHASES_CONFIG.map(phase => ({
          ...phase,
          status: 'pending' as const,
          tasks: MOCK_TASKS[phase.id] || [],
        }));
        setPhases(mockPhases);
      }
    } catch (error) {
      console.error('Erro ao carregar lançamento:', error);
      setHasData(false);
    }
  }
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [savingTask, setSavingTask] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [launchStartDate, setLaunchStartDate] = useState<string>(''); // 'YYYY-MM-DD'
  const [savingDate, setSavingDate] = useState(false);

  async function toggleTaskStatus(task: Task, explicitStatus?: Task['status']) {
    const newStatus = explicitStatus ?? (task.status === 'completed' ? 'pending' : 'completed');
    // Optimistic UI update
    setPhases(prev => prev.map(phase => ({
      ...phase,
      tasks: phase.tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t)
    })));
    if (selectedTask?.id === task.id) setSelectedTask(prev => prev ? { ...prev, status: newStatus } : null);
    // Persist to DB
    try {
      await (supabase.from('tasks') as any).update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', task.id);
    } catch (err) {
      console.error('Erro ao atualizar task:', err);
    }
  }

  function handleWeekClick(week: number) {
    setCurrentWeek(week);
    const phase = phases.find(p => week >= p.week_start && week <= p.week_end);
    if (phase) setSelectedPhase(phase.id);
  }

  async function updateStartDate(newDate: string) {
    if (!newDate || !selectedLaunch) return;
    setSavingDate(true);
    try {
      await (supabase.from('launches') as any)
        .update({ start_date: newDate })
        .eq('id', (selectedLaunch as any).id);
      setLaunchStartDate(newDate);
      // Recalculate current week
      const startDate = new Date(newDate);
      const now = new Date();
      const diffWeeks = Math.floor((now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      setCurrentWeek(Math.min(Math.max(diffWeeks + 1, 1), 7));
      setShowDatePicker(false);
    } catch (err) {
      console.error('Erro ao salvar data:', err);
    } finally {
      setSavingDate(false);
    }
  }

  async function handleAddTask() {
    if (!newTaskName.trim()) return;
    const currentPhase = phases.find(p => p.id === selectedPhase);
    if (!currentPhase) return;
    setSavingTask(true);
    try {
      const tenantId = (activeTenant as any)?.id || (tenant as any)?.id;
      // Find phase_id from DB (we need launch_phases id)
      const { data: phaseData } = await (supabase.from('launch_phases') as any)
        .select('id')
        .eq('name', currentPhase.description)
        .limit(1)
        .single();
      const phaseDbId = phaseData?.id;

      const newTask: Task = {
        id: Math.random().toString(36).substr(2, 9),
        name: newTaskName,
        description: newTaskDesc,
        status: 'pending',
        priority: newTaskPriority,
      };

      if (phaseDbId && tenantId) {
        const { data: inserted } = await (supabase.from('tasks') as any)
          .insert({ phase_id: phaseDbId, tenant_id: tenantId, name: newTaskName, description: newTaskDesc, priority: newTaskPriority, status: 'pending' })
          .select().single();
        if (inserted) newTask.id = inserted.id;
      }

      setPhases(prev => prev.map(p =>
        p.id === selectedPhase ? { ...p, tasks: [...p.tasks, newTask] } : p
      ));
      setNewTaskName('');
      setNewTaskDesc('');
      setNewTaskPriority('medium');
      setShowNewTaskModal(false);
    } catch (err) {
      console.error('Erro ao adicionar task:', err);
    } finally {
      setSavingTask(false);
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
    <div className="p-6 space-y-6 relative">
      {/* Task Detail Panel */}
      <TaskDetailPanel
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onStatusChange={(taskId, newStatus) => {
          setPhases(prev => prev.map(phase => ({
            ...phase,
            tasks: phase.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
          })));
          if (selectedTask?.id === taskId) setSelectedTask(prev => prev ? { ...prev, status: newStatus } : null);
          supabase.from('tasks' as any).update({ status: newStatus }).eq('id', taskId).then(() => { });
        }}
      />

      {/* Nova Tarefa Modal */}
      {showNewTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowNewTaskModal(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-900 mb-4">Nova Tarefa</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Nome da tarefa *</label>
                <input
                  autoFocus
                  value={newTaskName}
                  onChange={e => setNewTaskName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                  placeholder="Ex: Criar página de captura"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Descrição</label>
                <textarea
                  rows={3}
                  value={newTaskDesc}
                  onChange={e => setNewTaskDesc(e.target.value)}
                  placeholder="Descreva os detalhes da tarefa..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Prioridade</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setNewTaskPriority(p)}
                      className={cn(
                        'flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-colors',
                        newTaskPriority === p ? 'bg-violet-600 text-white border-violet-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-violet-300'
                      )}
                    >
                      {p === 'low' ? 'Baixa' : p === 'medium' ? 'Média' : 'Alta'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setShowNewTaskModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50"
                >Cancelar</button>
                <button
                  onClick={handleAddTask}
                  disabled={!newTaskName.trim() || savingTask}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
                >{savingTask ? 'Salvando...' : 'Adicionar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Timeline de Lançamento</h1>
          <p className="text-slate-500">
            {selectedLaunch?.name || 'Novo Lançamento'} - Semana {currentWeek} de 7
          </p>
        </div>
        <div className="flex items-center gap-3">
          {showDatePicker ? (
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-md">
              <Calendar className="w-4 h-4 text-violet-500 shrink-0" />
              <input
                type="date"
                autoFocus
                value={launchStartDate}
                onChange={e => setLaunchStartDate(e.target.value)}
                className="text-sm text-slate-800 border-none outline-none bg-transparent"
              />
              <button
                onClick={() => updateStartDate(launchStartDate)}
                disabled={savingDate}
                className="text-xs bg-violet-600 hover:bg-violet-700 text-white px-2.5 py-1 rounded-lg font-medium disabled:opacity-50"
              >
                {savingDate ? '...' : 'Salvar'}
              </button>
              <button onClick={() => setShowDatePicker(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setShowDatePicker(true)} title="Clique para definir a data de início do lançamento">
              <Calendar className="w-4 h-4 mr-2" />
              {launchStartDate ? format(new Date(launchStartDate + 'T12:00:00'), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy')}
            </Button>
          )}
          <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => setShowNewTaskModal(true)}>
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
                <button
                  key={i}
                  onClick={() => handleWeekClick(i + 1)}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold -mt-5 transition-transform hover:scale-110",
                    i + 1 <= currentWeek
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-200 text-slate-500 hover:bg-violet-200'
                  )}
                >
                  {i + 1}
                </button>
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
                <button
                  className="flex-shrink-0 hover:scale-110 transition-transform"
                  onClick={() => toggleTaskStatus(task)}
                  title={task.status === 'completed' ? 'Reabrir tarefa' : 'Marcar como concluída'}
                >
                  {getStatusIcon(task.status)}
                </button>

                <div className="flex-1 cursor-pointer" onClick={() => setSelectedTask(task)}>
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

                <Button variant="ghost" size="sm" onClick={() => setSelectedTask(task)}>
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
