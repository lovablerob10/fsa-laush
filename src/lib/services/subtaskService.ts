import { supabase } from '@/lib/supabase/client';
import { callGeminiWithFallback } from './briefingService';
import type { BriefingData } from './briefingService';

// =============================================
// Subtask Types
// =============================================

export interface Subtask {
    id: string;
    task_id: string;
    tenant_id: string;
    name: string;
    description?: string;
    status: 'pending' | 'in_progress' | 'completed';
    order_index: number;
    due_date?: string | null;
    created_at?: string;
}

// =============================================
// UUID Validation
// =============================================
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(id: string): boolean { return UUID_REGEX.test(id); }

// =============================================
// CRUD
// =============================================

export async function fetchSubtasks(taskId: string): Promise<Subtask[]> {
    if (!isValidUUID(taskId)) return []; // mock task — skip
    const { data, error } = await (supabase.from('subtasks') as any)
        .select('*')
        .eq('task_id', taskId)
        .order('order_index', { ascending: true });
    if (error) {
        console.error('Erro ao buscar subtarefas:', error.message);
        return [];
    }
    return data || [];
}

export async function createSubtask(subtask: Omit<Subtask, 'id' | 'created_at'>): Promise<Subtask | null> {
    if (!isValidUUID(subtask.task_id)) return null; // mock task — skip
    const { data, error } = await (supabase.from('subtasks') as any)
        .insert(subtask)
        .select()
        .single();
    if (error) {
        console.error('Erro ao criar subtarefa:', error.message);
        return null;
    }
    return data;
}

export async function updateSubtask(id: string, updates: Partial<Subtask>): Promise<boolean> {
    const { error } = await (supabase.from('subtasks') as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
    if (error) {
        console.error('Erro ao atualizar subtarefa:', error.message);
        return false;
    }
    return true;
}

export async function deleteSubtask(id: string): Promise<boolean> {
    const { error } = await (supabase.from('subtasks') as any)
        .delete()
        .eq('id', id);
    if (error) {
        console.error('Erro ao deletar subtarefa:', error.message);
        return false;
    }
    return true;
}

export async function updateTaskDueDate(taskId: string, dueDate: string | null): Promise<boolean> {
    if (!isValidUUID(taskId)) return false; // mock task — skip
    // tasks.due_date is type 'date' so send YYYY-MM-DD only (not a full ISO timestamp)
    const formattedDate = dueDate ? dueDate.substring(0, 10) : null;
    const { error } = await (supabase.from('tasks') as any)
        .update({ due_date: formattedDate })
        .eq('id', taskId);
    if (error) {
        console.error('Erro ao atualizar due_date:', error.message, '| taskId:', taskId, '| date:', formattedDate);
        return false;
    }
    return true;
}

// =============================================
// AI Subtask Generator
// =============================================

export interface AISubtaskSuggestion {
    name: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
}

export async function generateSubtasksWithAI(
    taskName: string,
    taskDescription: string,
    userRequest: string,
    briefing?: Partial<BriefingData>
): Promise<AISubtaskSuggestion[]> {
    const context = briefing
        ? `Expert: ${briefing.expert_name || ''} | Produto: ${briefing.product_name || ''} | Público: ${briefing.target_audience || ''}`
        : '';

    const prompt = `Você é um especialista em gestão de lançamentos digitais no mercado brasileiro.

TAREFA PRINCIPAL:
- Nome: ${taskName}
- Descrição: ${taskDescription}

SOLICITAÇÃO DO USUÁRIO (em linguagem livre):
"${userRequest}"

${context ? `CONTEXTO DO LANÇAMENTO:\n${context}` : ''}

Sua missão: transformar a solicitação acima em subtarefas CONCRETAS, ACIONÁVEIS e SEQUENCIAIS para executar essa tarefa.

REGRAS CRÍTICAS:
1. Gere entre 3 e 7 subtarefas
2. Cada subtarefa deve ser específica (diz EXATAMENTE o que fazer)
3. Ordene por sequência lógica de execução
4. Nomes curtos (max 60 chars), descrições práticas (1 frase)
5. Prioridade: "high" = vital para o resultado, "medium" = importante, "low" = bônus
6. Retorne APENAS JSON válido, sem markdown

Formato:
[
  {"name": "Nome da subtarefa", "description": "Como executar em uma frase", "priority": "high"},
  ...
]`;

    try {
        const raw = await callGeminiWithFallback(prompt, { temperature: 0.7, maxOutputTokens: 2048 });
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) return parsed as AISubtaskSuggestion[];
        return [];
    } catch (err) {
        console.error('Erro ao gerar subtarefas com IA:', err);
        throw new Error('Não foi possível gerar subtarefas. Tente novamente.');
    }
}
