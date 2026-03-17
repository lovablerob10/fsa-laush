import { supabase } from '@/lib/supabase/client';

// =============================================
// Framework Service — Resolução Multi-Framework
// =============================================

export interface FrameworkData {
  id: string;
  tenant_id: string | null;
  name: string;
  type: 'page' | 'email' | 'whatsapp' | 'script' | 'general';
  content: string;
  description?: string;
  variables?: string[];
  is_global: boolean;
  created_at: string;
}

export interface ResolvedFrameworks {
  /** Framework principal do tipo específico (ex: 'page') */
  primary: FrameworkData | null;
  /** Frameworks contextuais (tipo 'general') que complementam */
  contextual: FrameworkData[];
  /** Todos os frameworks resolvidos (primary + contextual) */
  all: FrameworkData[];
}

// Mapeamento de contentType (briefing) → framework type
const CONTENT_TYPE_TO_FRAMEWORK: Record<string, string> = {
  page: 'page',
  email_sequence: 'email',
  whatsapp: 'whatsapp',
  campaign: 'general',
  // ActionAIPanel types
  instagram: 'general',
  story: 'general',
  reel: 'general',
  live: 'general',
  copy: 'general',
  ads: 'general',
};

/**
 * Resolve TODOS os frameworks relevantes para um tipo de conteúdo.
 * Busca: tipo específico + tipo 'general' (contextuais).
 * Prioridade: tenant > global dentro de cada grupo.
 */
export async function resolveAllFrameworks(
  tenantId: string,
  contentType: string
): Promise<ResolvedFrameworks> {
  const fwType = CONTENT_TYPE_TO_FRAMEWORK[contentType] || contentType;

  try {
    // Busca tanto o tipo específico quanto 'general' numa só query
    const typesFilter = fwType === 'general'
      ? `type.eq.general`
      : `type.eq.${fwType},type.eq.general`;

    const { data, error } = await supabase
      .from('frameworks')
      .select('*')
      .or(`tenant_id.eq.${tenantId},is_global.eq.true`)
      .or(typesFilter)
      .order('is_global', { ascending: true }); // tenant first

    if (error) throw error;
    if (!data || data.length === 0) return { primary: null, contextual: [], all: [] };

    const allFw = data as FrameworkData[];

    // Separar por tipo
    const specificFws = allFw.filter(f => f.type === fwType && fwType !== 'general');
    const generalFws = allFw.filter(f => f.type === 'general');

    // Primary: framework do tipo específico (tenant > global)
    const primaryTenant = specificFws.find(f => f.tenant_id === tenantId && !f.is_global);
    const primaryGlobal = specificFws.find(f => f.is_global);
    const primary = primaryTenant || primaryGlobal || null;

    // Contextual: frameworks 'general' (tenant first, then global)
    const contextualTenant = generalFws.filter(f => f.tenant_id === tenantId && !f.is_global);
    const contextualGlobal = generalFws.filter(f => f.is_global);
    const contextual = [...contextualTenant, ...contextualGlobal];

    const all = [primary, ...contextual].filter(Boolean) as FrameworkData[];

    return { primary, contextual, all };
  } catch (err: any) {
    console.warn('[Framework] Erro ao resolver:', err.message);
    return { primary: null, contextual: [], all: [] };
  }
}

/**
 * Resolve o framework ideal (compatibilidade com código existente).
 * Agora puxa tipo específico + general como fallback.
 */
export async function resolveFramework(
  tenantId: string,
  contentType: string
): Promise<FrameworkData | null> {
  const resolved = await resolveAllFrameworks(tenantId, contentType);
  return resolved.primary || resolved.contextual[0] || null;
}

/**
 * Resolve um framework específico por ID
 */
export async function getFrameworkById(id: string): Promise<FrameworkData | null> {
  try {
    const { data, error } = await supabase
      .from('frameworks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as FrameworkData;
  } catch (err: any) {
    console.warn('[Framework] Erro ao buscar por ID:', err.message);
    return null;
  }
}

/**
 * Lista todos os frameworks disponíveis para um tipo de conteúdo.
 * Retorna tipo específico + general, útil para o seletor no Step 6.
 */
export async function listFrameworksForType(
  tenantId: string,
  contentType: string
): Promise<FrameworkData[]> {
  const fwType = CONTENT_TYPE_TO_FRAMEWORK[contentType] || contentType;

  try {
    const typesFilter = fwType === 'general'
      ? `type.eq.general`
      : `type.eq.${fwType},type.eq.general`;

    const { data, error } = await supabase
      .from('frameworks')
      .select('*')
      .or(`tenant_id.eq.${tenantId},is_global.eq.true`)
      .or(typesFilter)
      .order('is_global', { ascending: true });

    if (error) throw error;
    return (data || []) as FrameworkData[];
  } catch (err: any) {
    console.warn('[Framework] Erro ao listar:', err.message);
    return [];
  }
}

/**
 * Monta a instrução de framework para injetar no prompt.
 * Aceita um único framework ou array de frameworks.
 */
export function buildFrameworkInstruction(frameworks: FrameworkData | FrameworkData[]): string {
  const fwList = Array.isArray(frameworks) ? frameworks : [frameworks];
  if (fwList.length === 0) return '';

  const sections = fwList.map((fw, i) => {
    const role = fwList.length === 1
      ? 'FRAMEWORK DE REFERÊNCIA'
      : i === 0
        ? 'FRAMEWORK PRINCIPAL (siga esta estrutura)'
        : `FRAMEWORK CONTEXTUAL #${i} (use como referência complementar)`;

    const scope = fw.is_global
      ? '(Padrão da agência)'
      : '(Personalizado do cliente — prioridade sobre o padrão)';

    return `${role}: "${fw.name}" ${scope}
---
${fw.content}
---`;
  });

  return `${sections.join('\n\n')}

REGRAS ABSOLUTAS:
1. Se houver FRAMEWORK PRINCIPAL, siga sua ESTRUTURA rigorosamente. Adapte o conteúdo do briefing para encaixar nesta estrutura.
2. Use os FRAMEWORKS CONTEXTUAIS como referência para tom, técnicas e estratégia — mas NÃO misture estruturas.
3. NÃO invente seções que não existem nos frameworks. NÃO omita seções do framework principal.
4. Se frameworks contextuais tiverem headlines, CTAs ou técnicas relevantes, INCORPORE dentro da estrutura principal.`.trim();
}
