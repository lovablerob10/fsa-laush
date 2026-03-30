import { supabase, supabaseUrl } from '@/lib/supabase/client';
import { BriefingData, callGeminiWithFallback } from './briefingService';

// =============================================
// Types
// =============================================

export interface LandingPage {
  id: string;
  tenant_id: string;
  launch_id: string | null;
  name: string;
  html_content: string;
  status: 'draft' | 'published';
  subdomain: string | null;
  custom_domain: string | null;
  version: number;
  leads_count: number;
  views_count: number;
  generation_params: Record<string, unknown>;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================
// CRUD
// =============================================

export async function listLandingPages(tenantId: string, launchId?: string): Promise<LandingPage[]> {
  let query = (supabase as any)
    .from('landing_pages')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (launchId) query = query.eq('launch_id', launchId);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as LandingPage[];
}

export async function saveLandingPage(
  page: Omit<Partial<LandingPage>, 'tenant_id' | 'html_content'> & { tenant_id: string; html_content: string }
): Promise<LandingPage> {
  if (page.id) {
    const { data, error } = await (supabase as any)
      .from('landing_pages')
      .update({ ...page, updated_at: new Date().toISOString() })
      .eq('id', page.id)
      .select()
      .single();
    if (error) throw error;
    return data as LandingPage;
  }
  const { data, error } = await (supabase as any)
    .from('landing_pages')
    .insert(page)
    .select()
    .single();
  if (error) throw error;
  return data as LandingPage;
}

export async function publishLandingPage(id: string): Promise<LandingPage> {
  const { data, error } = await (supabase as any)
    .from('landing_pages')
    .update({ status: 'published', published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as LandingPage;
}

export async function unpublishLandingPage(id: string): Promise<LandingPage> {
  const { data, error } = await (supabase as any)
    .from('landing_pages')
    .update({ status: 'draft', published_at: null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as LandingPage;
}

export async function deleteLandingPage(id: string): Promise<void> {
  const { error } = await (supabase as any).from('landing_pages').delete().eq('id', id);
  if (error) throw error;
}

export async function updateLandingPageHtml(id: string, html: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('landing_pages')
    .update({ html_content: html, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export function getLandingPagePublicUrl(id: string): string {
  return `${supabaseUrl}/functions/v1/serve-landing-page?id=${id}`;
}

// =============================================
// Lead list for a specific landing page
// =============================================

export async function getLandingPageLeads(tenantId: string, landingPageId: string) {
  const { data, error } = await (supabase as any)
    .from('leads')
    .select('id, name, email, phone, created_at, stage, status')
    .eq('tenant_id', tenantId)
    .contains('custom_fields', { landing_page_id: landingPageId })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// =============================================
// HTML Generation — Nobre Elite Framework
// =============================================

function buildColorSystem(b: BriefingData): { css: string; primary: string; secondary: string; accent: string } {
  const primary = b.brand_primary_color || '#7C3AED';
  const secondary = b.brand_secondary_color || '#1E1B4B';
  const accent = b.brand_accent_color || '#EC4899';

  const css = `
    :root {
      --brand-primary: ${primary};
      --brand-secondary: ${secondary};
      --brand-accent: ${accent};
      --brand-font: '${b.brand_font || 'Inter'}', sans-serif;
    }
  `.trim();

  return { css, primary, secondary, accent };
}

export async function generateLandingPageHtml(
  briefing: BriefingData,
  tenantId: string,
  launchId: string | null,
  landingPageId: string,
  userNotes: string = ''
): Promise<string> {
  const colors = buildColorSystem(briefing);
  const captureLeadUrl = `${supabaseUrl}/functions/v1/capture-lead`;
  const font = briefing.brand_font || 'Inter';

  const painPoints = briefing.audience_pain_points?.map(p => `<li>❌ ${p}</li>`).join('\n') || '<li>❌ Falta de resultados concretos</li>';
  const desires = briefing.audience_desires?.map(d => `<li>✅ ${d}</li>`).join('\n') || '';
  const objections = briefing.audience_objections?.map((o, i) => `
    <div class="faq-item">
      <button class="faq-question" onclick="toggleFaq(this)">
        <span>${o}</span><span class="faq-icon">+</span>
      </button>
      <div class="faq-answer" style="display:none">
        <p>${briefing.differentiation || 'Nossa metodologia é comprovada e garantida.'}</p>
      </div>
    </div>
  `).join('\n') || '';
  const bonuses = briefing.product_bonuses?.map(b => `
    <div class="bonus-card">
      <span class="bonus-badge">BÔNUS</span>
      <p>${b}</p>
    </div>
  `).join('\n') || '';
  const credentials = briefing.expert_credentials?.map(c => `<li>🏆 ${c}</li>`).join('\n') || '';

  const prompt = `Você é o NOBRE, arquiteto de landing pages de altíssima conversão para o mercado digital brasileiro.

MISSÃO: Gerar código HTML COMPLETO e PRONTO PARA PRODUÇÃO. Retorne APENAS o HTML — sem markdown, sem \`\`\`, apenas o documento começando em <!DOCTYPE html>.

═══════════════════════════════════════════
IDENTIDADE DA MARCA
═══════════════════════════════════════════
Expert: ${briefing.expert_name || 'Expert'}
Produto: ${briefing.product_name || 'Produto Digital'}
Descrição: ${briefing.product_description || ''}
Promessa central: ${briefing.main_promise || ''}
Benefício principal: ${briefing.main_benefit || ''}
Diferencial: ${briefing.differentiation || ''}
Preço: R$ ${briefing.product_price || '997'}
Parcelas: até ${briefing.product_installments || 12}x
Garantia: ${briefing.product_guarantee || '7 dias'}
Bônus: ${briefing.product_bonuses?.join(' | ') || ''}
Público-alvo: ${briefing.target_audience || ''}
Dores do público: ${briefing.audience_pain_points?.join(' | ') || ''}
Desejos do público: ${briefing.audience_desires?.join(' | ') || ''}
Objeções: ${briefing.audience_objections?.join(' | ') || ''}
Tom de voz: ${briefing.voice_tones?.join(', ') || 'Profissional e empático'}
Bio do expert: ${briefing.expert_bio || ''}
Credenciais: ${briefing.expert_credentials?.join(', ') || ''}
Foto do expert: ${briefing.expert_photo_url || ''}

═══════════════════════════════════════════
SISTEMA DE CORES DA MARCA — OBRIGATÓRIO
═══════════════════════════════════════════
Cor primária: ${colors.primary}
Cor secundária: ${colors.secondary}
Cor de destaque: ${colors.accent}
Fonte: ${font}

REGRA ABSOLUTA DE CORES: Use EXATAMENTE estas cores em toda a página. Botões, gradientes, destaques e bordas brilhantes DEVEM usar estas cores. Nunca substitua por paleta genérica.

${colors.css}

═══════════════════════════════════════════
ENDPOINT DE CAPTURA — INJETAR NO JAVASCRIPT
═══════════════════════════════════════════
URL: ${captureLeadUrl}
tenant_id: "${tenantId}"
launch_id: "${launchId || ''}"
landing_page_id: "${landingPageId}"

═══════════════════════════════════════════
ESTRUTURA OBRIGATÓRIA DA PÁGINA (10 seções)
═══════════════════════════════════════════

### SEÇÃO 1 — HERO (dobra zero — acima do fold)
- Headline impactante baseada na promessa central do briefing (máx 10 palavras)
- Subheadline explicando o benefício em 1-2 frases
- Foto do expert em destaque (usar URL acima se disponível)
- Formulário de captura com campos: Nome, Email, WhatsApp + botão CTA pulsante
- Background: gradiente escuro usando cores da marca
- GSAP entrance animation: hero fades in + slide up

### SEÇÃO 2 — BARRA DE CONFIANÇA (trust bar)
- Números impactantes: alunos, resultados, anos de experiência (use dados do briefing ou crie)
- Selos de garantia e segurança
- Animação counter via GSAP ScrollTrigger

### SEÇÃO 3 — O PROBLEMA
- Headline de dor: "Você já se sentiu assim?"
- Lista visual das dores do público (do briefing)
- Visual dark com elementos de tensão
${painPoints}

### SEÇÃO 4 — A SOLUÇÃO
- Apresentação do produto como solução das dores
- Highlights do benefício principal e diferencial
- Visual de transformação (antes/depois)
${desires}

### SEÇÃO 5 — SOBRE O EXPERT
- Foto grande + bio completa do briefing
- Credenciais listadas de forma visual
- Tom pessoal e conectivo
${credentials}

### SEÇÃO 6 — O QUE VOCÊ VAI RECEBER
- Módulos/conteúdos do produto em cards glassmorphism
- Cada card com ícone, título e breve descrição
- Badge de valor percebido em cada item

### SEÇÃO 7 — BÔNUS ESPECIAIS
- Cards de bônus com badge "BÔNUS" em destaque (${colors.accent})
${bonuses}

### SEÇÃO 8 — DEPOIMENTOS / PROVA SOCIAL
- 3 depoimentos fictícios mas realistas e específicos para o nicho do expert
- Fotos de avatar (usar placeholder com iniciais)
- Estrelas de avaliação

### SEÇÃO 9 — OFERTA E GARANTIA
- Preço com riscado (valor original inflado) e preço atual destacado
- Parcelamento em destaque
- Botão CTA enorme e pulsante
- Garantia visual com ícone de escudo
- Urgência (vagas limitadas ou tempo)

### SEÇÃO 10 — FAQ (Objeções)
- Accordion interativo com as objeções do briefing
${objections}

### FOOTER
- Segundo formulário de captura
- Links de política de privacidade e termos
- Copyright

═══════════════════════════════════════════
REQUISITOS TÉCNICOS INEGOCIÁVEIS
═══════════════════════════════════════════
1. CDNs no <head>: Tailwind (script CDN), Google Fonts (${font}), Iconify
2. CDNs no final do <body>: GSAP + ScrollTrigger
3. Design DARK PREMIUM: fundo preto/stone-950, glassmorphism nos cards (backdrop-blur), bordas brilhantes com box-shadow na cor primária
4. FORMULÁRIO FUNCIONAL: Ao submeter, chame a função captureLeadSubmit() via JS. Mostre loading spinner, depois mensagem de sucesso.
5. Animações GSAP obrigatórias: parallax no hero, fade-in staggered nas seções, counter animado na barra de confiança
6. MOBILE-FIRST: Totalmente responsivo. Menu hamburguer no mobile.
7. CTA FLUTUANTE: Botão fixo no canto inferior direito no mobile
8. Todo CSS inline ou em <style> interno — arquivo único

═══════════════════════════════════════════
JAVASCRIPT PARA CAPTURA DE LEAD
═══════════════════════════════════════════
Crie a função captureLeadSubmit(formEl) que:
1. Lê os valores do formulário (name, email, phone)
2. Valida campos obrigatórios
3. Faz fetch POST para: ${captureLeadUrl}
4. Body: { tenant_id: "${tenantId}", launch_id: "${launchId || ''}", landing_page_id: "${landingPageId}", name, email, phone, source: "landing_page" }
5. Header: Content-Type: application/json
6. Enquanto processa: mostra spinner + desabilita botão
7. Sucesso: esconde formulário, mostra div de agradecimento com confetti emoji
8. Erro: mostra mensagem amigável
Todos os botões de CTA e formulários da página devem chamar captureLeadSubmit(this.closest('form'))

${userNotes ? `═══════════════════════════════════════════\nNOTAS ADICIONAIS DO USUÁRIO\n═══════════════════════════════════════════\n${userNotes}` : ''}

Inicie o código HTML agora. Apenas <!DOCTYPE html> até </html>. Sem mais nenhum texto.`;

  const html = await callGeminiWithFallback(prompt, {
    temperature: 0.25,
    maxOutputTokens: 65536,
    forceModel: 'gemini-2.5-pro',
  });

  // Strip any accidental markdown fences
  return html
    .replace(/^```html\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}
