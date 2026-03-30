import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env');
}

export { supabaseUrl };

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Helper para operações com RLS e multi-tenancy
export const withTenant = (tenantId: string) => ({
  headers: {
    'x-tenant-id': tenantId,
  },
});

// Função para obter o tenant atual do usuário logado
export async function getCurrentTenant(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single();
    
  return (data as any)?.tenant_id || null;
}

// Hook para verificar permissões
export function hasRole(user: any, roles: string[]): boolean {
  return roles.includes(user?.role);
}
