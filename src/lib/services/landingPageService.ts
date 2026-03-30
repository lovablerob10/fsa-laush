import { supabase, supabaseUrl } from '@/lib/supabase/client';
import { BriefingData, callGeminiWithFallback } from './briefingService';
import { listFrameworksForType, buildFrameworkInstruction, FrameworkData } from './frameworkService';

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

export async function listPageFrameworks(tenantId: string): Promise<FrameworkData[]> {
  return listFrameworksForType(tenantId, 'page');
}

// ── Section definitions ────────────────────────────────────────────────────

export interface PageSection {
  id: string;
  label: string;
  emoji: string;
  status: 'pending' | 'generating' | 'done' | 'error';
  html: string;
}

export const DEFAULT_SECTIONS: Omit<PageSection, 'status' | 'html'>[] = [
  { id: 'hero',         label: 'Hero + Formulário',      emoji: '🎯' },
  { id: 'trust',        label: 'Barra de Confiança',     emoji: '⭐' },
  { id: 'problem',      label: 'O Problema',             emoji: '😣' },
  { id: 'solution',     label: 'A Solução',              emoji: '💡' },
  { id: 'expert',       label: 'Sobre o Expert',         emoji: '🏆' },
  { id: 'offer',        label: 'O que você vai receber', emoji: '📦' },
  { id: 'bonuses',      label: 'Bônus Especiais',        emoji: '🎁' },
  { id: 'testimonials', label: 'Depoimentos',            emoji: '💬' },
  { id: 'pricing',      label: 'Oferta + Garantia',      emoji: '💰' },
  { id: 'faq',          label: 'FAQ (Objeções)',          emoji: '❓' },
  { id: 'footer',       label: 'Footer + CTA Final',     emoji: '🔻' },
];

// ── Shared context (small, used in every section prompt) ──────────────────

function buildSharedContext(b: BriefingData, colors: ReturnType<typeof buildColorSystem>, captureLeadUrl: string, tenantId: string, launchId: string | null, landingPageId: string): string {
  // Keep this minimal — it is repeated in EVERY section prompt
  return [
    `Expert:${b.expert_name||'Expert'} Produto:${b.product_name||'Produto'} Promessa:${(b.main_promise||'').slice(0,120)}`,
    `Público:${(b.target_audience||'').slice(0,80)} Tom:${b.voice_tones?.slice(0,2).join(',')||'Profissional'}`,
    `Preço:R$${b.product_price||'997'} ${b.product_installments||12}x Garantia:${b.product_guarantee||'7 dias'}`,
    `CORES: primary=${colors.primary} secondary=${colors.secondary} accent=${colors.accent} font=${b.brand_font||'Inter'}`,
    `FORM POST:${captureLeadUrl} body:{tenant_id:"${tenantId}",launch_id:"${launchId||''}",landing_page_id:"${landingPageId}",name,email,phone}`,
  ].join('\n');
}

// ── Section prompt builders ────────────────────────────────────────────────

function buildSectionPrompt(
  sectionId: string,
  b: BriefingData,
  colors: ReturnType<typeof buildColorSystem>,
  sharedCtx: string,
  frameworkHint: string,
  userNotes: string
): string {
  const font = b.brand_font || 'Inter';

  const base = `Você é o NOBRE, arquiteto de landing pages premium para o mercado digital brasileiro.

RETORNE APENAS o HTML da seção — um único elemento <section> ou <footer> completo.
SEM <!DOCTYPE>, SEM <html>, SEM <head>, SEM <body>, SEM markdown, SEM explicações.
O HTML será inserido dentro de uma página que já tem Tailwind CDN, GSAP, Google Fonts (${font}) e Iconify.

${sharedCtx}
${frameworkHint ? '\nFRAMEWORK DE REFERÊNCIA PARA ESTA SEÇÃO:\n' + frameworkHint : ''}
${userNotes ? '\nNOTAS DO USUÁRIO: ' + userNotes : ''}

PADRÃO VISUAL OBRIGATÓRIO:
- Fundo: black / #0a0a0a / stone-950 (dark premium)
- Cards: glassmorphism (bg-white/5 backdrop-blur-md border border-white/10)
- Bordas brilhantes: box-shadow 0 0 20px ${colors.primary}40
- Botões: background ${colors.primary}, hover escurecido, rounded-full, font-bold, pulse animation
- Texto: branco para títulos, slate-300 para corpo
- Padding de seção: py-20 md:py-28, container max-w-6xl mx-auto px-6

`;

  const sections: Record<string, string> = {
    hero: `${base}
SEÇÃO: HERO (dobra zero — acima do fold)
- Nav sticky minimalista com logo/nome do produto e botão CTA
- Headline PODEROSA baseada em: "${b.main_promise || b.product_name}" (máx 10 palavras, fonte grande, gradient text com as cores da marca)
- Subheadline: benefício em 2 frases curtas e diretas
- Foto do expert: ${b.expert_photo_url ? `<img src="${b.expert_photo_url}" ...>` : 'placeholder elegante com gradiente'} — estilize com borda brilhante, sombra e blend-mode
- Background: gradiente de ${colors.secondary} para black com partículas/noise sutil
- Formulário inline ou lateral (Nome, Email, WhatsApp + botão CTA pulsante)
- Animação GSAP: gsap.from(".hero-content", {y:60, opacity:0, duration:1, ease:"power3.out"})
- Função JS captureLeadSubmit(formEl): fetch POST ao endpoint acima, spinner, mensagem de sucesso`,

    trust: `${base}
SEÇÃO: BARRA DE CONFIANÇA (trust bar)
- Fundo levemente diferente (stone-900 ou slate-900) para contrastar com hero
- 4 métricas em destaque: crie números realistas para o nicho ("1.200+ alunos", "98% de satisfação", etc)
- Ícones Iconify para cada métrica
- Animação counter: gsap.to(".counter", {textContent: targetValue, duration:2, snap:{textContent:1}, scrollTrigger:{trigger:".trust-bar", start:"top 80%"}})
- Selos de segurança e garantia inline`,

    problem: `${base}
SEÇÃO: O PROBLEMA
- Headline de empatia e dor (ex: "Você já se sentiu assim?")
- Dores do público: ${b.audience_pain_points?.join(' | ') || 'frustração com falta de resultados'}
- Cada dor em card vermelho/escuro com ícone ❌
- Texto de transição levando à solução
- Animação fade-in staggered via ScrollTrigger`,

    solution: `${base}
SEÇÃO: A SOLUÇÃO
- Headline de transformação (contraste com a seção anterior)
- Diferencial: "${b.differentiation || ''}"
- Desejos do público: ${b.audience_desires?.join(' | ') || ''}
- Cards de transformação (antes/depois ou bullets de resultado)
- Visual verde/emerald para contraste com vermelho do problema
- CTA secundário ao final`,

    expert: `${base}
SEÇÃO: SOBRE O EXPERT — AUTORIDADE
- Foto grande: ${b.expert_photo_url || 'placeholder'}
- Nome em destaque: ${b.expert_name || 'Expert'}
- Bio: "${b.expert_bio || ''}"
- Credenciais listadas visualmente: ${b.expert_credentials?.join(' | ') || ''}
- Tom pessoal, conectivo, primeira pessoa
- Quote destacada com borda ${colors.primary}
- Layout: foto à esquerda, texto à direita (stack no mobile)`,

    offer: `${base}
SEÇÃO: O QUE VOCÊ VAI RECEBER
- Headline: "Tudo que você vai ter acesso"
- Crie 4-6 módulos/bônus/benefícios realistas para o produto "${b.product_name}"
- Cada item: card glassmorphism com número, ícone Iconify, título e 1 linha de descrição
- Badge de valor percebido em cada card (ex: "Valor: R$ 297")
- CTA ao final`,

    bonuses: `${base}
SEÇÃO: BÔNUS ESPECIAIS
- Headline: "E ainda tem mais…"
- Bônus do briefing: ${b.product_bonuses?.join(' | ') || 'crie 2-3 bônus relevantes para o nicho'}
- Cada bônus: card com badge "BÔNUS" na cor ${colors.accent}, descrição e valor
- Total de bônus somado em destaque
- Senso de urgência: "Disponível apenas nesta oferta"`,

    testimonials: `${base}
SEÇÃO: DEPOIMENTOS / PROVA SOCIAL
- Headline: "O que nossos alunos dizem"
- 3 depoimentos realistas e específicos para o nicho "${b.target_audience}"
- Cada depoimento: avatar com iniciais (círculo colorido), nome, cidade, estrelas ⭐⭐⭐⭐⭐, texto em aspas
- Layout grid 3 colunas (stack no mobile)
- Cards com borda ${colors.primary}/30`,

    pricing: `${base}
SEÇÃO: OFERTA + GARANTIA (CTA principal)
- Urgência: "Oferta por tempo limitado" ou vagas limitadas
- Preço riscado (inflado) e preço real em destaque enorme
- "${b.product_installments || 12}x de R$ ${b.product_price ? Math.round(b.product_price / (b.product_installments || 12)) : '97'}" em destaque
- Botão CTA enorme, pulsante, gradient ${colors.primary} → ${colors.accent}
- Ícone de escudo + garantia "${b.product_guarantee || '7 dias'} sem riscos"
- Formulário de captura novamente (quem não comprou ainda, deixa o lead)
- Countdown timer visual (decorativo)`,

    faq: `${base}
SEÇÃO: FAQ — QUEBRANDO OBJEÇÕES
- Headline: "Suas dúvidas respondidas"
- Accordion interativo para cada objeção
- Objeções do briefing: ${b.audience_objections?.join(' | ') || 'crie 4-5 objeções comuns para o nicho'}
- Para cada objeção: resposta empática que usa "${b.differentiation}" como argumento
- JS do accordion: toggleFaq(el) { el.nextElementSibling.classList.toggle("hidden") }
- CTA ao final do FAQ`,

    footer: `${base}
SEÇÃO: FOOTER + CTA FINAL
- CTA final de alta urgência: frase curta e poderosa
- Formulário de captura de lead completo (Nome, Email, WhatsApp + botão)
- Links: Política de Privacidade | Termos de Uso (hrefs vazios "#")
- Copyright: © ${new Date().getFullYear()} ${b.expert_name || b.product_name || 'Launch Lab'}. Todos os direitos reservados.
- Aviso de garantia e segurança
- Botão CTA flutuante fixo no canto inferior direito (mobile): link âncora para o formulário principal`,
  };

  return sections[sectionId] || `${base}\nGere uma seção HTML premium para: ${sectionId}`;
}

function stripMarkdown(html: string): string {
  return html
    .replace(/^```html\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

// ── Assemble full HTML page from sections ─────────────────────────────────

function assemblePage(sections: PageSection[], b: BriefingData, colors: ReturnType<typeof buildColorSystem>): string {
  const font = b.brand_font || 'Inter';
  const sectionHtml = sections.map(s => s.html).filter(Boolean).join('\n\n');

  return `<!DOCTYPE html>
<html lang="pt-BR" class="scroll-smooth">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${b.product_name || 'Landing Page'} — ${b.expert_name || ''}</title>
  <meta name="description" content="${b.main_promise || b.product_description || ''}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=${font.replace(/ /g,'+')}:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://code.iconify.design/3/3.1.0/iconify.min.js"></script>
  <style>
    :root {
      --brand-primary: ${colors.primary};
      --brand-secondary: ${colors.secondary};
      --brand-accent: ${colors.accent};
      --brand-font: '${font}', sans-serif;
    }
    * { font-family: var(--brand-font); box-sizing: border-box; }
    html { background: #0a0a0a; color: #f1f5f9; }
    .brand-glow { box-shadow: 0 0 30px ${colors.primary}40; }
    .brand-border { border-color: ${colors.primary}50; }
    .brand-gradient { background: linear-gradient(135deg, ${colors.primary}, ${colors.accent}); }
    .brand-text { background: linear-gradient(135deg, ${colors.primary}, ${colors.accent}); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    @keyframes pulse-cta { 0%,100%{box-shadow:0 0 0 0 ${colors.primary}60} 50%{box-shadow:0 0 0 16px transparent} }
    .cta-pulse { animation: pulse-cta 2s infinite; }
    .glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1); }
  </style>
</head>
<body class="bg-black antialiased">

${sectionHtml}

<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
<script>
  gsap.registerPlugin(ScrollTrigger);

  // Fade-in staggered for all sections
  gsap.utils.toArray("section").forEach(sec => {
    gsap.from(sec, { opacity: 0, y: 40, duration: 0.8, ease: "power2.out",
      scrollTrigger: { trigger: sec, start: "top 85%", toggleActions: "play none none none" }
    });
  });

  // Lead capture
  function captureLeadSubmit(formEl) {
    const name  = formEl.querySelector('[name="name"]')?.value?.trim();
    const email = formEl.querySelector('[name="email"]')?.value?.trim();
    const phone = formEl.querySelector('[name="phone"]')?.value?.trim();
    if (!name || !phone) { alert("Por favor preencha nome e WhatsApp."); return; }
    const btn = formEl.querySelector("button[type=submit]");
    if (btn) { btn.disabled = true; btn.textContent = "Enviando..."; }
    fetch("${supabaseUrl}/functions/v1/capture-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, source: "landing_page" })
    })
    .then(r => r.json())
    .then(() => {
      formEl.innerHTML = '<div style="text-align:center;padding:2rem"><div style="font-size:3rem">🎉</div><p style="color:#4ade80;font-weight:700;font-size:1.2rem;margin-top:1rem">Incrível! Você está na lista!</p><p style="color:#94a3b8;margin-top:.5rem">Em breve entraremos em contato.</p></div>';
    })
    .catch(() => {
      if (btn) { btn.disabled = false; btn.textContent = "Quero me inscrever"; }
      alert("Erro ao enviar. Tente novamente.");
    });
  }

  // FAQ accordion
  function toggleFaq(el) {
    const answer = el.nextElementSibling;
    if (answer) answer.classList.toggle("hidden");
    const icon = el.querySelector(".faq-icon");
    if (icon) icon.textContent = answer?.classList.contains("hidden") ? "+" : "−";
  }

  document.querySelectorAll("form").forEach(form => {
    form.addEventListener("submit", e => { e.preventDefault(); captureLeadSubmit(form); });
  });
</script>
</body>
</html>`;
}

// ── Public API — progressive section-by-section generation ────────────────

export type SectionProgressCallback = (sections: PageSection[]) => void;

export async function generateLandingPageHtml(
  briefing: BriefingData,
  tenantId: string,
  launchId: string | null,
  landingPageId: string,
  userNotes: string = '',
  selectedFrameworkId?: string,
  onProgress?: SectionProgressCallback
): Promise<string> {
  const colors = buildColorSystem(briefing);
  const captureLeadUrl = `${supabaseUrl}/functions/v1/capture-lead`;
  const sharedCtx = buildSharedContext(briefing, colors, captureLeadUrl, tenantId, launchId, landingPageId);

  // Framework hint (trimmed to avoid token blowup)
  const availableFrameworks = await listFrameworksForType(tenantId, 'page');
  let chosenFramework: FrameworkData | undefined;
  if (selectedFrameworkId) chosenFramework = availableFrameworks.find(f => f.id === selectedFrameworkId);
  if (!chosenFramework) chosenFramework = availableFrameworks.find(f => !f.is_global) || availableFrameworks[0];
  // Truncate framework content to 3000 chars to keep each prompt well under limit
  const frameworkHint = chosenFramework
    ? `${chosenFramework.name}:\n${chosenFramework.content.slice(0, 600)}`
    : '';

  // Initialize sections
  const sections: PageSection[] = DEFAULT_SECTIONS.map(s => ({
    ...s, status: 'pending', html: '',
  }));

  onProgress?.([...sections]);

  // Generate each section sequentially
  for (let i = 0; i < sections.length; i++) {
    sections[i] = { ...sections[i], status: 'generating' };
    onProgress?.([...sections]);

    try {
      const prompt = buildSectionPrompt(sections[i].id, briefing, colors, sharedCtx, frameworkHint, userNotes);
      const raw = await callGeminiWithFallback(prompt, {
        temperature: 0.3,
        maxOutputTokens: 8192,
        // No forceModel — use fallback chain (2.5-pro → 2.5-flash → 1.5-flash)
      });
      sections[i] = { ...sections[i], status: 'done', html: stripMarkdown(raw) };
    } catch (err: any) {
      sections[i] = { ...sections[i], status: 'error', html: `<!-- Erro na seção ${sections[i].id}: ${err.message} -->` };
    }

    onProgress?.([...sections]);
  }

  return assemblePage(sections, briefing, colors);
}
