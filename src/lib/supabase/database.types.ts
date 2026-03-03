export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          settings: Json
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          settings?: Json
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          settings?: Json
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          name: string
          avatar_url: string | null
          tenant_id: string
          role: 'admin' | 'expert' | 'manager' | 'sales'
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          avatar_url?: string | null
          tenant_id: string
          role?: 'admin' | 'expert' | 'manager' | 'sales'
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          avatar_url?: string | null
          tenant_id?: string
          role?: 'admin' | 'expert' | 'manager' | 'sales'
          created_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          tenant_id: string
          name: string
          type: 'pdf' | 'doc' | 'docx' | 'txt'
          content: string
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          type: 'pdf' | 'doc' | 'docx' | 'txt'
          content: string
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          type?: 'pdf' | 'doc' | 'docx' | 'txt'
          content?: string
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      document_chunks: {
        Row: {
          id: string
          document_id: string
          content: string
          embedding: string
          metadata: Json
        }
        Insert: {
          id?: string
          document_id: string
          content: string
          embedding: string
          metadata?: Json
        }
        Update: {
          id?: string
          document_id?: string
          content?: string
          embedding?: string
          metadata?: Json
        }
      }
      leads: {
        Row: {
          id: string
          tenant_id: string
          name: string
          email: string | null
          phone: string
          whatsapp_id: string | null
          source: 'organic' | 'paid' | 'referral' | 'webhook'
          status: 'active' | 'inactive' | 'converted' | 'lost'
          stage: 'lead' | 'qualified' | 'opportunity' | 'proposal' | 'customer' | 'upsell'
          tags: string[]
          score: number
          custom_fields: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          email?: string | null
          phone: string
          whatsapp_id?: string | null
          source?: 'organic' | 'paid' | 'referral' | 'webhook'
          status?: 'active' | 'inactive' | 'converted' | 'lost'
          stage?: 'lead' | 'qualified' | 'opportunity' | 'proposal' | 'customer' | 'upsell'
          tags?: string[]
          score?: number
          custom_fields?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          email?: string | null
          phone?: string
          whatsapp_id?: string | null
          source?: 'organic' | 'paid' | 'referral' | 'webhook'
          status?: 'active' | 'inactive' | 'converted' | 'lost'
          stage?: 'lead' | 'qualified' | 'opportunity' | 'proposal' | 'customer' | 'upsell'
          tags?: string[]
          score?: number
          custom_fields?: Json
          created_at?: string
          updated_at?: string
        }
      }
      interactions: {
        Row: {
          id: string
          lead_id: string
          type: 'whatsapp' | 'email' | 'call' | 'note' | 'automation'
          direction: 'inbound' | 'outbound'
          content: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          type: 'whatsapp' | 'email' | 'call' | 'note' | 'automation'
          direction: 'inbound' | 'outbound'
          content: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          type?: 'whatsapp' | 'email' | 'call' | 'note' | 'automation'
          direction?: 'inbound' | 'outbound'
          content?: string
          metadata?: Json | null
          created_at?: string
        }
      }
      tags: {
        Row: {
          id: string
          tenant_id: string
          name: string
          color: string
          category: 'behavior' | 'source' | 'stage' | 'custom'
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          color: string
          category: 'behavior' | 'source' | 'stage' | 'custom'
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          color?: string
          category?: 'behavior' | 'source' | 'stage' | 'custom'
          created_at?: string
        }
      }
      whatsapp_instances: {
        Row: {
          id: string
          tenant_id: string
          name: string
          number: string
          status: 'disconnected' | 'connecting' | 'connected' | 'error'
          qr_code: string | null
          session: string | null
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          number: string
          status?: 'disconnected' | 'connecting' | 'connected' | 'error'
          qr_code?: string | null
          session?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          number?: string
          status?: 'disconnected' | 'connecting' | 'connected' | 'error'
          qr_code?: string | null
          session?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      whatsapp_groups: {
        Row: {
          id: string
          tenant_id: string
          instance_id: string
          group_id: string
          name: string
          description: string | null
          participants_count: number
          max_participants: number
          is_full: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          instance_id: string
          group_id: string
          name: string
          description?: string | null
          participants_count?: number
          max_participants?: number
          is_full?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          instance_id?: string
          group_id?: string
          name?: string
          description?: string | null
          participants_count?: number
          max_participants?: number
          is_full?: boolean
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          tenant_id: string
          lead_id: string | null
          instance_id: string | null
          phone: string
          content: string
          type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'template'
          direction: 'inbound' | 'outbound'
          status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
          external_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          lead_id?: string | null
          instance_id?: string | null
          phone: string
          content: string
          type?: 'text' | 'image' | 'video' | 'audio' | 'document' | 'template'
          direction: 'inbound' | 'outbound'
          status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
          external_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          lead_id?: string | null
          instance_id?: string | null
          phone?: string
          content?: string
          type?: 'text' | 'image' | 'video' | 'audio' | 'document' | 'template'
          direction?: 'inbound' | 'outbound'
          status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
          external_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
      message_templates: {
        Row: {
          id: string
          tenant_id: string
          name: string
          category: 'marketing' | 'transactional' | 'recovery'
          language: string
          header: Json | null
          body: string
          footer: string | null
          buttons: Json | null
          variables: string[]
          is_approved: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          category: 'marketing' | 'transactional' | 'recovery'
          language?: string
          header?: Json | null
          body: string
          footer?: string | null
          buttons?: Json | null
          variables?: string[]
          is_approved?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          category?: 'marketing' | 'transactional' | 'recovery'
          language?: string
          header?: Json | null
          body?: string
          footer?: string | null
          buttons?: Json | null
          variables?: string[]
          is_approved?: boolean
          created_at?: string
        }
      }
      launches: {
        Row: {
          id: string
          tenant_id: string
          name: string
          product_name: string
          start_date: string
          end_date: string
          status: 'planning' | 'active' | 'paused' | 'completed'
          current_week: number
          goals: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          product_name: string
          start_date: string
          end_date: string
          status?: 'planning' | 'active' | 'paused' | 'completed'
          current_week?: number
          goals?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          product_name?: string
          start_date?: string
          end_date?: string
          status?: 'planning' | 'active' | 'paused' | 'completed'
          current_week?: number
          goals?: Json
          created_at?: string
          updated_at?: string
        }
      }
      launch_phases: {
        Row: {
          id: string
          launch_id: string
          name: string
          week_start: number
          week_end: number
          status: 'pending' | 'in_progress' | 'completed'
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          launch_id: string
          name: string
          week_start: number
          week_end: number
          status?: 'pending' | 'in_progress' | 'completed'
          color?: string
          created_at?: string
        }
        Update: {
          id?: string
          launch_id?: string
          name?: string
          week_start?: number
          week_end?: number
          status?: 'pending' | 'in_progress' | 'completed'
          color?: string
          created_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          phase_id: string
          name: string
          description: string | null
          assignee: string | null
          status: 'pending' | 'in_progress' | 'completed'
          due_date: string | null
          priority: 'low' | 'medium' | 'high'
          created_at: string
        }
        Insert: {
          id?: string
          phase_id: string
          name: string
          description?: string | null
          assignee?: string | null
          status?: 'pending' | 'in_progress' | 'completed'
          due_date?: string | null
          priority?: 'low' | 'medium' | 'high'
          created_at?: string
        }
        Update: {
          id?: string
          phase_id?: string
          name?: string
          description?: string | null
          assignee?: string | null
          status?: 'pending' | 'in_progress' | 'completed'
          due_date?: string | null
          priority?: 'low' | 'medium' | 'high'
          created_at?: string
        }
      }
      abandoned_carts: {
        Row: {
          id: string
          tenant_id: string
          lead_id: string
          product_id: string
          product_name: string
          product_value: number
          checkout_url: string | null
          status: 'detected' | 'contacted' | 'recovered' | 'lost'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          lead_id: string
          product_id: string
          product_name: string
          product_value: number
          checkout_url?: string | null
          status?: 'detected' | 'contacted' | 'recovered' | 'lost'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          lead_id?: string
          product_id?: string
          product_name?: string
          product_value?: number
          checkout_url?: string | null
          status?: 'detected' | 'contacted' | 'recovered' | 'lost'
          created_at?: string
          updated_at?: string
        }
      }
      recovery_attempts: {
        Row: {
          id: string
          cart_id: string
          type: 'whatsapp' | 'email'
          content: string
          sent_at: string
          opened_at: string | null
          converted_at: string | null
        }
        Insert: {
          id?: string
          cart_id: string
          type: 'whatsapp' | 'email'
          content: string
          sent_at?: string
          opened_at?: string | null
          converted_at?: string | null
        }
        Update: {
          id?: string
          cart_id?: string
          type?: 'whatsapp' | 'email'
          content?: string
          sent_at?: string
          opened_at?: string | null
          converted_at?: string | null
        }
      }
      webhook_events: {
        Row: {
          id: string
          tenant_id: string
          source: 'kiwify' | 'hotmart'
          event_type: string
          payload: Json
          processed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          source: 'kiwify' | 'hotmart'
          event_type: string
          payload: Json
          processed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          source?: 'kiwify' | 'hotmart'
          event_type?: string
          payload?: Json
          processed?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_document_chunks: {
        Args: {
          query_embedding: string
          match_threshold: number
          match_count: number
          tenant_filter: string
        }
        Returns: {
          id: string
          document_id: string
          content: string
          similarity: number
        }[]
      }
      get_dashboard_metrics: {
        Args: {
          tenant_id: string
          start_date: string
          end_date: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
