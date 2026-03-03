// Tipos principais do Launch Lab Pro

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  tenant_id: string;
  role: 'admin' | 'expert' | 'manager' | 'sales';
  created_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  settings: TenantSettings;
  created_at: string;
}

export interface TenantSettings {
  openai_api_key?: string;
  uazapi_token?: string;
  uazapi_instance?: string;
  meta_app_id?: string;
  meta_app_secret?: string;
  meta_phone_number_id?: string;
  kiwify_webhook_secret?: string;
  hotmart_webhook_secret?: string;
}

// RAG - Documentos e Conhecimento
export interface Document {
  id: string;
  tenant_id: string;
  name: string;
  type: 'pdf' | 'doc' | 'docx' | 'txt';
  content: string;
  chunks: DocumentChunk[];
  metadata: DocumentMetadata;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  content: string;
  embedding: number[];
  metadata: {
    page?: number;
    section?: string;
  };
}

export interface DocumentMetadata {
  author?: string;
  pages?: number;
  word_count?: number;
  description?: string;
}

// CRM - Leads e Interações
export interface Lead {
  id: string;
  tenant_id: string;
  name: string;
  email?: string;
  phone: string;
  whatsapp_id?: string;
  source: 'organic' | 'paid' | 'referral' | 'webhook';
  status: LeadStatus;
  stage: FunnelStage;
  tags: string[];
  score: number;
  interactions: Interaction[];
  custom_fields: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type LeadStatus = 'active' | 'inactive' | 'converted' | 'lost';
export type FunnelStage = 'lead' | 'qualified' | 'opportunity' | 'proposal' | 'customer' | 'upsell';

export interface Interaction {
  id: string;
  lead_id: string;
  type: 'whatsapp' | 'email' | 'call' | 'note' | 'automation';
  direction: 'inbound' | 'outbound';
  content: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Tag {
  id: string;
  tenant_id: string;
  name: string;
  color: string;
  category: 'behavior' | 'source' | 'stage' | 'custom';
  created_at: string;
}

// WhatsApp e Mensageria
export interface WhatsAppInstance {
  id: string;
  tenant_id: string;
  name: string;
  number: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  qr_code?: string;
  session?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppGroup {
  id: string;
  tenant_id: string;
  instance_id: string;
  group_id: string;
  name: string;
  description?: string;
  participants_count: number;
  max_participants: number;
  is_full: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  tenant_id: string;
  lead_id?: string;
  instance_id?: string;
  phone: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'template';
  direction: 'inbound' | 'outbound';
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  external_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface MessageTemplate {
  id: string;
  tenant_id: string;
  name: string;
  category: 'marketing' | 'transactional' | 'recovery';
  language: string;
  header?: {
    type: 'text' | 'image' | 'video' | 'document';
    content: string;
  };
  body: string;
  footer?: string;
  buttons?: TemplateButton[];
  variables: string[];
  is_approved: boolean;
  created_at: string;
}

export interface TemplateButton {
  type: 'quick_reply' | 'url' | 'phone';
  text: string;
  value?: string;
}

// Timeline de Lançamento
export interface Launch {
  id: string;
  tenant_id: string;
  name: string;
  product_name: string;
  start_date: string;
  end_date: string;
  status: 'planning' | 'active' | 'paused' | 'completed';
  current_week: number;
  phases: LaunchPhase[];
  goals: LaunchGoals;
  created_at: string;
  updated_at: string;
}

export interface LaunchPhase {
  id: string;
  launch_id: string;
  name: string;
  week_start: number;
  week_end: number;
  status: 'pending' | 'in_progress' | 'completed';
  tasks: Task[];
  color: string;
}

export interface Task {
  id: string;
  phase_id: string;
  name: string;
  description?: string;
  assignee?: string;
  status: 'pending' | 'in_progress' | 'completed';
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
}

export interface LaunchGoals {
  revenue_target: number;
  leads_target: number;
  conversion_target: number;
  cpl_target: number;
}

// Métricas e Dashboard
export interface DashboardMetrics {
  revenue: {
    current: number;
    target: number;
    previous_period: number;
  };
  leads: {
    total: number;
    new: number;
    qualified: number;
  };
  conversion: {
    rate: number;
    funnel: FunnelMetrics;
  };
  cpl: number;
  roi: number;
  recovery: {
    sent: number;
    recovered: number;
    revenue: number;
  };
}

export interface FunnelMetrics {
  lead: number;
  qualified: number;
  opportunity: number;
  proposal: number;
  customer: number;
}

// Carrinho Abandonado
export interface AbandonedCart {
  id: string;
  tenant_id: string;
  lead_id: string;
  product_id: string;
  product_name: string;
  product_value: number;
  checkout_url?: string;
  status: 'detected' | 'contacted' | 'recovered' | 'lost';
  recovery_attempts: RecoveryAttempt[];
  created_at: string;
  updated_at: string;
}

export interface RecoveryAttempt {
  id: string;
  cart_id: string;
  type: 'whatsapp' | 'email';
  content: string;
  sent_at: string;
  opened_at?: string;
  converted_at?: string;
}

// Webhooks
export interface WebhookEvent {
  id: string;
  tenant_id: string;
  source: 'kiwify' | 'hotmart';
  event_type: string;
  payload: Record<string, any>;
  processed: boolean;
  created_at: string;
}

// IA e RAG
export interface AIResponse {
  content: string;
  sources: string[];
  confidence: number;
  tokens_used: number;
}

export interface SearchResult {
  chunk: DocumentChunk;
  similarity: number;
}
