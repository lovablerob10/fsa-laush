import { useState, useEffect } from 'react';
import {
    CheckCircle2, Circle, Trash2, Plus, Sparkles,
    X, ChevronDown, ChevronUp, Loader2, Calendar
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store';
import {
    fetchSubtasks, createSubtask, updateSubtask, deleteSubtask,
    updateTaskDueDate, generateSubtasksWithAI,
    type Subtask, type AISubtaskSuggestion
} from '@/lib/services/subtaskService';
import { isToday, isPast, parseISO } from 'date-fns';

interface Task {
    id: string;
    name: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed';
    priority: 'low' | 'medium' | 'high';
    due_date?: string | null;
}

interface TaskDetailPanelProps {
    task: Task | null;
    onClose: () => void;
    onStatusChange: (taskId: string, status: Task['status']) => void;
}

export function TaskDetailPanel({ task, onClose, onStatusChange }: TaskDetailPanelProps) {
    const { tenant, activeTenant } = useAuthStore() as any;
    const tenantId = (activeTenant?.id || tenant?.id) as string;

    const [subtasks, setSubtasks] = useState<Subtask[]>([]);
    const [loadingSubtasks, setLoadingSubtasks] = useState(false);
    const [aiRequest, setAiRequest] = useState('');
    const [aiSuggestions, setAiSuggestions] = useState<AISubtaskSuggestion[]>([]);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');
    const [showAiPanel, setShowAiPanel] = useState(false);
    const [dueDate, setDueDate] = useState<string>('');
    const [savingDate, setSavingDate] = useState(false);
    const [newSubtaskName, setNewSubtaskName] = useState('');
    const [addingSubtask, setAddingSubtask] = useState(false);

    useEffect(() => {
        if (task?.id) {
            loadSubtasks();
            setDueDate(task.due_date ? task.due_date.split('T')[0] : '');
            setAiSuggestions([]);
            setAiRequest('');
            setShowAiPanel(false);
        }
    }, [task?.id]);

    async function loadSubtasks() {
        if (!task) return;
        setLoadingSubtasks(true);
        const data = await fetchSubtasks(task.id);
        setSubtasks(data);
        setLoadingSubtasks(false);
    }

    async function handleToggleSubtask(sub: Subtask) {
        const newStatus = sub.status === 'completed' ? 'pending' : 'completed';
        setSubtasks(prev => prev.map(s => s.id === sub.id ? { ...s, status: newStatus } : s));
        await updateSubtask(sub.id, { status: newStatus });
    }

    async function handleDeleteSubtask(id: string) {
        setSubtasks(prev => prev.filter(s => s.id !== id));
        await deleteSubtask(id);
    }

    async function handleAddSubtask() {
        if (!newSubtaskName.trim() || !task || !tenantId) return;
        setAddingSubtask(true);
        const created = await createSubtask({
            task_id: task.id,
            tenant_id: tenantId,
            name: newSubtaskName.trim(),
            status: 'pending',
            order_index: subtasks.length,
        });
        if (created) setSubtasks(prev => [...prev, created]);
        setNewSubtaskName('');
        setAddingSubtask(false);
    }

    async function handleSaveDueDate(value: string) {
        if (!task) return;
        setDueDate(value);
        setSavingDate(true);
        await updateTaskDueDate(task.id, value || null);
        setSavingDate(false);
    }

    async function handleGenerateAI() {
        if (!aiRequest.trim() || !task) return;
        setAiLoading(true);
        setAiError('');
        try {
            const suggestions = await generateSubtasksWithAI(task.name, task.description, aiRequest);
            setAiSuggestions(suggestions);
        } catch (err: any) {
            setAiError(err.message || 'Erro ao gerar subtarefas');
        } finally {
            setAiLoading(false);
        }
    }

    async function handleSaveAISuggestions() {
        if (!task || !tenantId || aiSuggestions.length === 0) return;
        const newSubs: Subtask[] = [];
        for (let i = 0; i < aiSuggestions.length; i++) {
            const sug = aiSuggestions[i];
            const created = await createSubtask({
                task_id: task.id,
                tenant_id: tenantId,
                name: sug.name,
                description: sug.description,
                status: 'pending',
                order_index: subtasks.length + i,
            });
            if (created) newSubs.push(created);
        }
        setSubtasks(prev => [...prev, ...newSubs]);
        setAiSuggestions([]);
        setAiRequest('');
        setShowAiPanel(false);
    }

    const getDueDateBadge = () => {
        if (!dueDate) return null;
        const d = parseISO(dueDate);
        if (isPast(d) && !isToday(d)) return <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">🔴 Vencida</span>;
        if (isToday(d)) return <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">🟡 Vence hoje</span>;
        return <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">🟢 Em dia</span>;
    };

    const getPriorityColor = (p: string) =>
        p === 'high' ? 'bg-red-100 text-red-700' : p === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700';

    if (!task) return null;

    const completedSubs = subtasks.filter(s => s.status === 'completed').length;

    return (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
            <div className="relative bg-white w-full max-w-lg h-full shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-violet-50 to-white flex-shrink-0">
                    <div className="flex-1 min-w-0 pr-4">
                        <h2 className="text-base font-bold text-slate-900 truncate">{task.name}</h2>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge className={getPriorityColor(task.priority)}>
                                {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                            </Badge>
                            {getDueDateBadge()}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex-shrink-0">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {task.description && (
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Descrição</p>
                            <p className="text-sm text-slate-700 leading-relaxed">{task.description}</p>
                        </div>
                    )}

                    {/* Status */}
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Status</p>
                        <div className="flex gap-2">
                            {(['pending', 'in_progress', 'completed'] as const).map(s => (
                                <button
                                    key={s}
                                    onClick={() => onStatusChange(task.id, s)}
                                    className={cn(
                                        'flex-1 py-2 px-2 rounded-xl text-xs font-semibold border transition-all',
                                        task.status === s
                                            ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-violet-300 hover:text-violet-600'
                                    )}
                                >
                                    {s === 'pending' ? '⏳ Pendente' : s === 'in_progress' ? '🔄 Andamento' : '✅ Concluída'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Due Date */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Data de Vencimento
                            </p>
                            {savingDate && <Loader2 className="w-3 h-3 animate-spin text-violet-500" />}
                        </div>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={e => handleSaveDueDate(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-700"
                        />
                    </div>

                    {/* Subtasks */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                Subtarefas {subtasks.length > 0 && <span className="text-violet-500 ml-1">{completedSubs}/{subtasks.length}</span>}
                            </p>
                        </div>

                        {subtasks.length > 0 && (
                            <div className="h-1.5 bg-slate-100 rounded-full mb-3 overflow-hidden">
                                <div
                                    className="h-full bg-violet-500 rounded-full transition-all duration-500"
                                    style={{ width: `${(completedSubs / subtasks.length) * 100}%` }}
                                />
                            </div>
                        )}

                        {loadingSubtasks ? (
                            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /></div>
                        ) : (
                            <div className="space-y-2">
                                {subtasks.map(sub => (
                                    <div key={sub.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 group transition-colors">
                                        <button onClick={() => handleToggleSubtask(sub)} className="mt-0.5 flex-shrink-0 hover:scale-110 transition-transform">
                                            {sub.status === 'completed'
                                                ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                : <Circle className="w-4 h-4 text-slate-300" />
                                            }
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <p className={cn('text-sm font-medium', sub.status === 'completed' && 'line-through text-slate-400')}>{sub.name}</p>
                                            {sub.description && <p className="text-xs text-slate-500 mt-0.5">{sub.description}</p>}
                                        </div>
                                        <button
                                            onClick={() => handleDeleteSubtask(sub.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all flex-shrink-0"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Quick add */}
                        <div className="flex gap-2 mt-3">
                            <input
                                value={newSubtaskName}
                                onChange={e => setNewSubtaskName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddSubtask()}
                                placeholder="+ Adicionar subtarefa..."
                                className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-slate-300"
                            />
                            <button
                                onClick={handleAddSubtask}
                                disabled={!newSubtaskName.trim() || addingSubtask}
                                className="p-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white transition-colors"
                            >
                                {addingSubtask ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* AI Subtask Generator */}
                    <div className="border border-violet-100 rounded-2xl overflow-hidden">
                        <button
                            onClick={() => setShowAiPanel(!showAiPanel)}
                            className="flex items-center justify-between w-full px-4 py-3 bg-gradient-to-r from-violet-50 to-purple-50 hover:from-violet-100 hover:to-purple-100 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-violet-600 flex items-center justify-center">
                                    <Sparkles className="w-3.5 h-3.5 text-white" />
                                </div>
                                <span className="text-sm font-semibold text-violet-700">IA de Subtarefas</span>
                                <span className="text-xs text-violet-400 hidden sm:block">Descreva e a IA organiza</span>
                            </div>
                            {showAiPanel ? <ChevronUp className="w-4 h-4 text-violet-400" /> : <ChevronDown className="w-4 h-4 text-violet-400" />}
                        </button>

                        {showAiPanel && (
                            <div className="p-4 space-y-3 bg-white">
                                <textarea
                                    rows={3}
                                    value={aiRequest}
                                    onChange={e => setAiRequest(e.target.value)}
                                    placeholder="Ex: 'Preciso fazer 3 posts para o Instagram, uma sequência de emails de aquecimento e configurar o pixel de rastreamento...'"
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none placeholder-slate-300"
                                />
                                <button
                                    onClick={handleGenerateAI}
                                    disabled={!aiRequest.trim() || aiLoading}
                                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
                                >
                                    {aiLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analisando...</> : <><Sparkles className="w-4 h-4" /> Gerar Subtarefas</>}
                                </button>

                                {aiError && <p className="text-xs text-red-500 text-center">{aiError}</p>}

                                {aiSuggestions.length > 0 && (
                                    <div className="space-y-2 mt-2">
                                        <p className="text-xs font-semibold text-slate-500 uppercase">Sugestões — revise e confirme:</p>
                                        {aiSuggestions.map((sug, idx) => (
                                            <div key={idx} className="flex items-start gap-2 p-3 rounded-xl bg-violet-50 border border-violet-100">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-800">{sug.name}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5">{sug.description}</p>
                                                    <Badge className={cn('mt-1 text-xs',
                                                        sug.priority === 'high' ? 'bg-red-100 text-red-700' :
                                                            sug.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                                                                'bg-slate-100 text-slate-600'
                                                    )}>
                                                        {sug.priority === 'high' ? 'Alta' : sug.priority === 'medium' ? 'Média' : 'Baixa'}
                                                    </Badge>
                                                </div>
                                                <button
                                                    onClick={() => setAiSuggestions(prev => prev.filter((_, i) => i !== idx))}
                                                    className="p-1 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={handleSaveAISuggestions}
                                            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
                                        >
                                            <CheckCircle2 className="w-4 h-4" /> Salvar todas ({aiSuggestions.length})
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-slate-50 flex-shrink-0">
                    <button
                        onClick={() => { onStatusChange(task.id, task.status === 'completed' ? 'pending' : 'completed'); onClose(); }}
                        className={cn(
                            'w-full py-3 rounded-xl font-semibold text-sm transition-colors',
                            task.status === 'completed'
                                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        )}
                    >
                        {task.status === 'completed' ? '↩ Reabrir Tarefa' : '✓ Marcar como Concluída'}
                    </button>
                </div>
            </div>
        </div>
    );
}
