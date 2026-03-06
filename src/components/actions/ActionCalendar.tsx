import { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  CheckCircle2,
  Circle,
  Instagram,
  Mail,
  MessageCircle,
  Video,
  FileText,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Copy,
  Check,
  Target,
  Loader2,
  AlertCircle,
  RefreshCw,
  Wand2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store';
import { ActionAIPanel } from './ActionAIPanel';

// ── Types ───────────────────────────────────────────────────────────────────
type ActionType = 'instagram' | 'email' | 'whatsapp' | 'live' | 'story' | 'reel' | 'copy' | 'ads';

interface Action {
  id: string;
  type: ActionType;
  title: string;
  description: string;
  objective: string;
  tips: string[];
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  phase: string;
  week: number;
  day: number;
}

interface DayGroup {
  day: number;
  week: number;
  phase: string;
  phaseColor: string;
  actions: Action[];
}

// ── Action type config ───────────────────────────────────────────────────────
const ACTION_TYPES: Record<ActionType, { icon: React.ElementType; label: string; color: string }> = {
  instagram: { icon: Instagram, label: 'Post Instagram', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' },
  story: { icon: Instagram, label: 'Story', color: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-300' },
  reel: { icon: Video, label: 'Reel', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  email: { icon: Mail, label: 'E-mail', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  whatsapp: { icon: MessageCircle, label: 'WhatsApp', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  live: { icon: Video, label: 'Live', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  copy: { icon: FileText, label: 'Copy', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  ads: { icon: TrendingUp, label: 'Anúncio', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
};

// ── Phase metadata ───────────────────────────────────────────────────────────
const PHASE_META: Record<string, { color: string; badgeColor: string; weekStart: number; weekEnd: number }> = {
  'Planejamento': { color: 'text-blue-500', badgeColor: 'bg-blue-100 text-blue-700', weekStart: 1, weekEnd: 1 },
  'Antecipação': { color: 'text-violet-500', badgeColor: 'bg-violet-100 text-violet-700', weekStart: 2, weekEnd: 3 },
  'Abertura de Carrinho': { color: 'text-emerald-500', badgeColor: 'bg-emerald-100 text-emerald-700', weekStart: 4, weekEnd: 4 },
  'Vendas': { color: 'text-emerald-500', badgeColor: 'bg-emerald-100 text-emerald-700', weekStart: 4, weekEnd: 5 },
  'Imersão': { color: 'text-amber-500', badgeColor: 'bg-amber-100 text-amber-700', weekStart: 6, weekEnd: 6 },
  'Upsell': { color: 'text-rose-500', badgeColor: 'bg-rose-100 text-rose-700', weekStart: 7, weekEnd: 7 },
};

// ── Infer action type from task name/description ─────────────────────────────
function inferActionType(name: string, description: string = ''): ActionType {
  const text = `${name} ${description}`.toLowerCase();
  if (/reel|reels/.test(text)) return 'reel';
  if (/story|stories|bastidor/.test(text)) return 'story';
  if (/instagram|post ig|feed|insta/.test(text)) return 'instagram';
  if (/e-?mail|email|sequência|nutrição|lista/.test(text)) return 'email';
  if (/whatsapp|wpp|zap|disparo|mensagem/.test(text)) return 'whatsapp';
  if (/live|ao vivo|transmissão/.test(text)) return 'live';
  if (/anúncio|ads|tráfego|campanha|criativo|pixel/.test(text)) return 'ads';
  if (/copy|headline|página|sales page|texto|script/.test(text)) return 'copy';
  // Priority fallback by phase name
  if (/planejamento|estratégia|definir|estruturar/.test(text)) return 'copy';
  if (/aquecimento|engajamento|conteúdo|educativo/.test(text)) return 'instagram';
  return 'copy';
}

// ── Build tips from task data ─────────────────────────────────────────────────
function buildTips(task: any, phaseName: string): string[] {
  const tips: string[] = [];
  if (task.priority === 'high') tips.push('Alta prioridade — não deixe para depois');
  if (task.due_date) tips.push(`Vencimento: ${new Date(task.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}`);
  // Phase-specific tips
  const phaseKey = phaseName.toLowerCase();
  if (phaseKey.includes('planej')) tips.push('Consulte o briefing preenchido');
  if (phaseKey.includes('antec')) tips.push('Foque em gerar valor antes de vender');
  if (phaseKey.includes('venda') || phaseKey.includes('abertura')) tips.push('Use urgência real — prazo e bônus limitados');
  if (phaseKey.includes('imers')) tips.push('Foque na experiência do aluno');
  if (phaseKey.includes('upsell')) tips.push('Ofereça produto complementar com desconto especial');
  if (tips.length === 0) tips.push('Execute com qualidade e consistência');
  return tips;
}

// ── Assign week/day from phase weeks + task index ────────────────────────────
function assignWeekDay(phaseWeekStart: number, phaseWeekEnd: number, taskIndex: number): { week: number; day: number } {
  const totalWeeks = phaseWeekEnd - phaseWeekStart + 1;
  const daysPerWeek = 5; // Mon–Fri
  const totalDays = totalWeeks * daysPerWeek;
  const dayOffset = taskIndex % totalDays;
  const weekOffset = Math.floor(dayOffset / daysPerWeek);
  const dayInWeek = (dayOffset % daysPerWeek) + 1;
  const week = phaseWeekStart + weekOffset;
  // Convert "day in week" to absolute day  
  const day = (week - 1) * 7 + dayInWeek;
  return { week, day };
}

export function ActionCalendar() {
  const { activeTenant, activeLaunch } = useAuthStore() as any;

  const [selectedWeek, setSelectedWeek] = useState(1);
  const [allActions, setAllActions] = useState<Action[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCopied, setShowCopied] = useState(false);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [hasBriefing, setHasBriefing] = useState(false);

  // ── Fetch real tasks from Supabase ──────────────────────────────────────────
  const loadCalendar = useCallback(async () => {
    if (!activeTenant?.id) return;
    setLoading(true);
    setError('');

    try {
      // 1. Use activeLaunch from store if available; else get most recent launch for tenant
      let launchId: string | null = activeLaunch?.id || null;

      if (!launchId) {
        const { data: launches } = await (supabase.from('launches') as any)
          .select('id')
          .eq('tenant_id', activeTenant.id)
          .order('created_at', { ascending: false })
          .limit(1);
        launchId = launches?.[0]?.id || null;
      }

      // 2. Get phases
      let phases: any[] = [];
      let tasks: any[] = [];

      if (launchId) {
        const { data: ph } = await (supabase.from('launch_phases') as any)
          .select('id, name, week_start, week_end, status, color')
          .eq('launch_id', launchId)
          .eq('tenant_id', activeTenant.id)
          .order('week_start', { ascending: true });
        phases = ph || [];

        const phaseIds = phases.map(p => p.id);
        const { data: t } = await (supabase.from('tasks') as any)
          .select('id, phase_id, name, description, status, priority, due_date')
          .in('phase_id', phaseIds)
          .eq('tenant_id', activeTenant.id)
          .order('created_at', { ascending: true });
        tasks = t || [];
      }

      // 3. Also get tenant tasks without launch (direct tenant tasks)
      const { data: directTasks } = await (supabase.from('tasks') as any)
      .select('id, phase_id, name, description, status, priority, due_date,launch_phases(name,week_start,week_end,color)')
      .eq('tenant_id', activeTenant.id)
      .order('created_at', { ascending: true })
      .limit(100);

    // 4. Check if briefing exists
    const { data: briefing } = await (supabase.from('briefings') as any)
      .select('id, expert_name')
      .eq('tenant_id', activeTenant.id)
      .single();
    setHasBriefing(!!(briefing?.expert_name));

    // 5. Build actions from real data
    const mapped: Action[] = [];
    const completedSet = new Set<string>();

    // Use directTasks which has phase info joined
    const allTasks = directTasks || tasks;

    // Group tasks by phase
    const tasksByPhase: Record<string, any[]> = {};
    for (const task of allTasks) {
      const phase = task.launch_phases;
      const phaseName = phase?.name || phases.find(p => p.id === task.phase_id)?.name || 'Planejamento';
      if (!tasksByPhase[phaseName]) tasksByPhase[phaseName] = [];
      tasksByPhase[phaseName].push({ ...task, phaseName, phase });
    }

    // Convert each task to an Action
    let actionIdx = 0;
    for (const [phaseName, phaseTasks] of Object.entries(tasksByPhase)) {
      const phaseMeta = PHASE_META[phaseName] || PHASE_META['Planejamento'];
      const phaseWeekStart = (phaseTasks[0]?.phase?.week_start || phaseTasks[0]?.launch_phases?.week_start) ?? phaseMeta.weekStart;
      const phaseWeekEnd = (phaseTasks[0]?.phase?.week_end || phaseTasks[0]?.launch_phases?.week_end) ?? phaseMeta.weekEnd;

      for (let i = 0; i < phaseTasks.length; i++) {
        const task = phaseTasks[i];
        const type = inferActionType(task.name, task.description);
        const { week, day } = assignWeekDay(phaseWeekStart, phaseWeekEnd, i);
        const tips = buildTips(task, phaseName);

        const action: Action = {
          id: task.id,
          type,
          title: task.name,
          description: task.description || `Executar: ${task.name}`,
          objective: `${phaseName} — ${task.priority === 'high' ? 'Alta prioridade' : task.priority === 'medium' ? 'Prioridade média' : 'Baixa prioridade'}`,
          tips,
          completed: task.status === 'completed',
          priority: task.priority || 'medium',
          due_date: task.due_date,
          phase: phaseName,
          week,
          day,
        };

        mapped.push(action);
        if (task.status === 'completed') completedSet.add(task.id);
        actionIdx++;
      }
    }

    setAllActions(mapped);
    setCompletedIds(completedSet);

    // Auto-select the current week if activeLaunch has current_week
    if (activeLaunch?.current_week) {
      setSelectedWeek(activeLaunch.current_week);
    }

  } catch (e: any) {
    setError(e.message || 'Erro ao carregar calendário');
  } finally {
    setLoading(false);
  }
}, [activeTenant?.id, activeLaunch?.id]);

useEffect(() => { loadCalendar(); }, [loadCalendar]);

// ── Toggle task completion (persisted) ──────────────────────────────────────
async function toggleAction(actionId: string) {
  const isCompleted = completedIds.has(actionId);
  const newStatus = isCompleted ? 'pending' : 'completed';

  // Optimistic update
  setCompletedIds(prev => {
    const next = new Set(prev);
    isCompleted ? next.delete(actionId) : next.add(actionId);
    return next;
  });

  // Persist to DB (only if valid UUID)
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (UUID_REGEX.test(actionId)) {
    await (supabase.from('tasks') as any)
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', actionId);
  }
}

function copyAction(action: Action) {
  const text = `**${action.title}**\n\n${action.description}\n\n🎯 Objetivo: ${action.objective}\n\n💡 Dicas:\n${action.tips.map(t => `• ${t}`).join('\n')}`.trim();
  navigator.clipboard.writeText(text);
  setShowCopied(true);
  setTimeout(() => setShowCopied(false), 2000);
}

// ── Derived data ─────────────────────────────────────────────────────────────
const weekActions = allActions.filter(a => a.week === selectedWeek);

// Group by day
const dayGroups: DayGroup[] = [];
const dayMap: Record<number, DayGroup> = {};
for (const action of weekActions) {
  if (!dayMap[action.day]) {
    const phaseMeta = PHASE_META[action.phase];
    dayMap[action.day] = {
      day: action.day,
      week: action.week,
      phase: action.phase,
      phaseColor: phaseMeta?.badgeColor || 'bg-violet-100 text-violet-700',
      actions: [],
    };
    dayGroups.push(dayMap[action.day]);
  }
  dayMap[action.day].actions.push(action);
}
dayGroups.sort((a, b) => a.day - b.day);

const totalActions = allActions.length;
const completedCount = allActions.filter(a => completedIds.has(a.id)).length;
const progress = totalActions > 0 ? (completedCount / totalActions) * 100 : 0;

// Available weeks
const availableWeeks = [...new Set(allActions.map(a => a.week))].sort((a, b) => a - b);
const allWeeks = availableWeeks.length > 0 ? availableWeeks : [1, 2, 3, 4, 5, 6, 7];

// Phase name for current week
const currentPhase = weekActions[0]?.phase || '';

// ── Render ────────────────────────────────────────────────────────────────────
return (
  <div className="p-6 space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Calendário de Ações</h1>
        <p className="text-muted-foreground text-sm">
          {totalActions > 0
            ? `${totalActions} ações do lançamento ${hasBriefing ? '• Briefing carregado ✓' : ''}`
            : 'O que fazer em cada dia do lançamento'}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Progresso</p>
          <p className="font-semibold text-sm">{completedCount}/{totalActions} ações</p>
        </div>
        <div className="w-32">
          <Progress value={progress} className="h-2" />
        </div>
        <Button variant="ghost" size="sm" onClick={loadCalendar} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </Button>
      </div>
    </div>

    {/* Week Selector */}
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      <Button
        variant="outline" size="sm"
        onClick={() => setSelectedWeek(w => Math.max(allWeeks[0] ?? 1, w - 1))}
        disabled={selectedWeek <= (allWeeks[0] ?? 1)}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      {allWeeks.map(week => (
        <Button
          key={week}
          variant={selectedWeek === week ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedWeek(week)}
          className={cn(selectedWeek === week && 'bg-violet-600 hover:bg-violet-700')}
        >
          Semana {week}
        </Button>
      ))}

      <Button
        variant="outline" size="sm"
        onClick={() => setSelectedWeek(w => Math.min(allWeeks[allWeeks.length - 1] ?? 7, w + 1))}
        disabled={selectedWeek >= (allWeeks[allWeeks.length - 1] ?? 7)}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>

    {/* Phase badge */}
    {currentPhase && (
      <div className="flex items-center gap-2">
        <Badge className={PHASE_META[currentPhase]?.badgeColor || 'bg-violet-100 text-violet-700'}>
          {currentPhase}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {weekActions.length} ações nesta semana
        </span>
      </div>
    )}

    {/* Loading */}
    {loading && (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-violet-400 animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Carregando ações do lançamento...</p>
        </div>
      </div>
    )}

    {/* Error */}
    {error && !loading && (
      <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
      </div>
    )}

    {/* Days Grid */}
    {!loading && !error && (
      <div className="space-y-4">
        {dayGroups.map((dayGroup) => (
          <Card key={dayGroup.day}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Dia {dayGroup.day}</CardTitle>
                    <p className="text-sm text-muted-foreground">{dayGroup.actions.length} ações</p>
                  </div>
                </div>
                <Badge variant="outline">
                  {dayGroup.actions.filter(a => completedIds.has(a.id)).length}/{dayGroup.actions.length} concluídas
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {dayGroup.actions.map((action) => {
                const typeConfig = ACTION_TYPES[action.type];
                const Icon = typeConfig?.icon || FileText;
                const isCompleted = completedIds.has(action.id);

                return (
                  <div
                    key={action.id}
                    className={cn(
                      'p-4 rounded-xl border-2 transition-all',
                      isCompleted
                        ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/10'
                        : 'border-border hover:border-violet-300 dark:hover:border-violet-700'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Completion toggle */}
                      <button onClick={() => toggleAction(action.id)} className="mt-1 flex-shrink-0">
                        {isCompleted
                          ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          : <Circle className="w-5 h-5 text-muted-foreground/40" />
                        }
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={cn('inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full', typeConfig?.color)}>
                            <Icon className="w-3 h-3" />
                            {typeConfig?.label}
                          </span>
                          {action.priority === 'high' && (
                            <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-full font-medium">alta prioridade</span>
                          )}
                        </div>

                        <h4 className={cn('font-semibold text-sm leading-snug', isCompleted && 'line-through text-muted-foreground')}>
                          {action.title}
                        </h4>

                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                          {action.description}
                        </p>

                        <div className="mt-3 space-y-1.5">
                          <div className="flex items-start gap-2">
                            <Target className="w-3.5 h-3.5 text-violet-500 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">Objetivo:</span> {action.objective}
                            </p>
                          </div>
                          {action.tips.length > 0 && (
                            <div className="flex items-start gap-2">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                              <ul className="text-xs text-muted-foreground space-y-0.5">
                                {action.tips.map((tip, i) => (
                                  <li key={i} className="flex items-start gap-1">
                                    <span className="text-violet-500">•</span>
                                    {tip}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-col gap-1.5 items-end flex-shrink-0">
                        <Button
                          size="sm"
                          onClick={() => setSelectedAction(action)}
                          className="flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs px-3 py-1.5 h-auto shadow-md shadow-violet-500/20"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Gerar com IA
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => copyAction(action)}
                          className="text-muted-foreground hover:text-foreground h-auto py-1 text-xs"
                        >
                          {showCopied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}

        {/* Empty state for selected week */}
        {dayGroups.length === 0 && !loading && (
          <Card>
            <CardContent className="p-12 text-center">
              <Wand2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="font-semibold text-foreground mb-2">Nenhuma ação para a Semana {selectedWeek}</p>
              {allActions.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    As ações do calendário vêm das tarefas da sua Timeline de 7 Semanas.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Complete o Onboarding Expert e a IA irá gerar automaticamente seu plano completo de lançamento.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Selecione outra semana para ver as ações programadas.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    )}

    {/* AI Content Panel */}
    {selectedAction && (
      <ActionAIPanel
        action={selectedAction}
        onClose={() => setSelectedAction(null)}
      />
    )}
  </div>
);
}
