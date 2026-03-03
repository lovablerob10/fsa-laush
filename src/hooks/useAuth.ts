import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store';

export function useAuth() {
    const { setUser, setTenant, logout } = useAuthStore();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Pega sessão atual
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                loadUserProfile(session.user.id);
            } else {
                setLoading(false);
            }
        });

        // Listener tempo real de auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (session?.user) {
                    await loadUserProfile(session.user.id);
                } else {
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
            // Busca perfil do usuário + tenant
            const { data: userProfile, error } = await supabase
                .from('users')
                .select('*, tenants(*)')
                .eq('id', authUserId)
                .single();

            if (error || !userProfile) {
                // Usuário autenticado mas sem perfil ainda — raro, mas trata
                console.warn('Usuário sem perfil em public.users:', authUserId);
                logout();
                return;
            }

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
                id: (userProfile as any).tenants.id,
                name: (userProfile as any).tenants.name,
                slug: (userProfile as any).tenants.slug,
                settings: (userProfile as any).tenants.settings,
                created_at: (userProfile as any).tenants.created_at,
            });
        } catch (err) {
            console.error('Erro ao carregar perfil:', err);
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
