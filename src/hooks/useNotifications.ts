import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store';

export interface TaskNotification {
    id: string;
    name: string;
    description?: string;
    due_date: string;
    status: string;
    priority: string;
    phase_name?: string;
    overdue: boolean; // true = vencida, false = vence hoje
}

export function useNotifications() {
    const { tenant, activeTenant } = useAuthStore() as any;
    const [notifications, setNotifications] = useState<TaskNotification[]>([]);
    const [hasPlayed, setHasPlayed] = useState(false);

    const tenantId = activeTenant?.id || tenant?.id;

    const playAlert = useCallback(() => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, ctx.currentTime);
            gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.5);
        } catch {
            // Ignore audio errors (no user interaction yet)
        }
    }, []);

    const loadNotifications = useCallback(async () => {
        if (!tenantId) return;

        // tasks.due_date is of type 'date', so compare with YYYY-MM-DD string
        const today = new Date();
        const todayStr = today.toISOString().substring(0, 10); // e.g. "2026-03-05"

        try {
            // Fetch tasks where due_date <= today and not completed
            const { data, error } = await (supabase.from('tasks') as any)
                .select(`
                    id, name, description, due_date, status, priority,
                    launch_phases (name)
                `)
                .eq('tenant_id', tenantId)
                .neq('status', 'completed')
                .not('due_date', 'is', null)
                .lte('due_date', todayStr);

            if (error) {
                console.error('useNotifications — erro ao buscar tarefas:', error.message);
                return;
            }

            const items: TaskNotification[] = (data || []).map((t: any) => ({
                id: t.id,
                name: t.name,
                description: t.description,
                due_date: t.due_date,
                status: t.status,
                priority: t.priority,
                phase_name: t.launch_phases?.name,
                // overdue = due_date is strictly before today
                overdue: t.due_date < todayStr,
            }));

            setNotifications(items);

            // Play sound if new notifications appeared and haven't played yet today
            if (items.length > 0 && !hasPlayed) {
                playAlert();
                setHasPlayed(true);
            }
        } catch (err) {
            console.error('useNotifications — erro inesperado:', err);
        }
    }, [tenantId, hasPlayed, playAlert]);

    useEffect(() => {
        loadNotifications();
        // Re-check every 5 minutes
        const interval = setInterval(loadNotifications, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [loadNotifications]);

    // Reset played flag at midnight
    useEffect(() => {
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        const msToMidnight = midnight.getTime() - now.getTime();
        const timeout = setTimeout(() => setHasPlayed(false), msToMidnight);
        return () => clearTimeout(timeout);
    }, []);

    return {
        notifications,
        count: notifications.length,
        overdueCount: notifications.filter(n => n.overdue).length,
        todayCount: notifications.filter(n => !n.overdue).length,
        reload: loadNotifications,
    };
}
