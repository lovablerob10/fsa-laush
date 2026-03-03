import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store';

export function useAuth() {
    const { setUser, setTenant, logout } = useAuthStore();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Pega sessão atual ao montar
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                loadUserProfile(session.user.id);
            } else {
                setLoading(false);
            }
        });

        // Listener tempo real de auth state
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_IN' && session?.user) {
                    await loadUserProfile(session.user.id);
                } else if (event === 'SIGNED_OUT') {
                    logout();
                    setLoading(false);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    async function loadUserProfile(authUserId: string) {
        setLoading(true);
        try {
            const { data: userProfile, error } = await supabase
                .from('users')
                .select('id, name, email, role, avatar_url, tenant_id, created_at, tenants(id, name, slug, settings, created_at)')
                .eq('id', authUserId)
                .single();

            if (error || !userProfile) {
                console.warn('Perfil não encontrado para:', authUserId, error?.message);
                // Limpa sessão Supabase para não ficar em loop
                await supabase.auth.signOut();
                logout();
                return;
            }

            const tenant = (userProfile as any).tenants;

            setUser({
                id: userProfile.id,
                email: userProfile.email,
                name: userProfile.name,
                avatar_url: userProfile.avatar_url,
                tenant_id: userProfile.tenant_id,
                role: userProfile.role,
                created_at: userProfile.created_at,
            });

            setTenant({
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug,
                settings: tenant.settings,
                created_at: tenant.created_at,
            });
        } catch (err) {
            console.error('Erro ao carregar perfil:', err);
            await supabase.auth.signOut();
            logout();
        } finally {
            setLoading(false);
        }
    }

    async function signIn(email: string, password: string) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    }

    async function signOut() {
        await supabase.auth.signOut();
        logout();
    }

    return { loading, signIn, signOut };
}
