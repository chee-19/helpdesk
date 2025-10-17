export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'admin' | 'agent' | 'viewer';
export type CustomerTier = 'free' | 'pro' | 'enterprise';
export type TicketStatus = 'new' | 'assigned' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketCategory = 'billing' | 'bug' | 'feature_request' | 'abuse_report' | 'other';
export type FeedbackType = 'override_category' | 'override_priority' | 'override_queue' | 'thumbs_up' | 'thumbs_down';
export type AlertType = 'sla_breach' | 'abuse_detected' | 'unassigned_urgent';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          role: UserRole;
          team: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: UserRole;
          team?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: UserRole;
          team?: string | null;
          created_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          name: string;
          tier: CustomerTier;
          default_sla_policy_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          tier?: CustomerTier;
          default_sla_policy_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          tier?: CustomerTier;
          default_sla_policy_id?: string | null;
          created_at?: string;
        };
      };
      queues: {
        Row: {
          id: string;
          name: string;
          team: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          team?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          team?: string | null;
          description?: string | null;
          created_at?: string;
        };
      };
      business_hours: {
        Row: {
          id: string;
          name: string;
          timezone: string;
          schedule: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          timezone?: string;
          schedule?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          timezone?: string;
          schedule?: Json;
          created_at?: string;
        };
      };
      sla_policies: {
        Row: {
          id: string;
          name: string;
          first_response_minutes: number;
          resolve_minutes: number;
          business_hours_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          first_response_minutes: number;
          resolve_minutes: number;
          business_hours_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          first_response_minutes?: number;
          resolve_minutes?: number;
          business_hours_id?: string | null;
          created_at?: string;
        };
      };
      tickets: {
        Row: {
          id: string;
          created_at: string;
          requester_name: string;
          requester_email: string;
          subject: string;
          body: string;
          attachment_url: string | null;
          status: TicketStatus;
          priority: TicketPriority;
          category: TicketCategory | null;
          queue_id: string | null;
          assignee_id: string | null;
          sla_policy_id: string | null;
          customer_id: string | null;
          language: string;
          duplicate_of: string | null;
          first_response_at: string | null;
          resolved_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          requester_name: string;
          requester_email: string;
          subject: string;
          body: string;
          attachment_url?: string | null;
          status?: TicketStatus;
          priority?: TicketPriority;
          category?: TicketCategory | null;
          queue_id?: string | null;
          assignee_id?: string | null;
          sla_policy_id?: string | null;
          customer_id?: string | null;
          language?: string;
          duplicate_of?: string | null;
          first_response_at?: string | null;
          resolved_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          requester_name?: string;
          requester_email?: string;
          subject?: string;
          body?: string;
          attachment_url?: string | null;
          status?: TicketStatus;
          priority?: TicketPriority;
          category?: TicketCategory | null;
          queue_id?: string | null;
          assignee_id?: string | null;
          sla_policy_id?: string | null;
          customer_id?: string | null;
          language?: string;
          duplicate_of?: string | null;
          first_response_at?: string | null;
          resolved_at?: string | null;
          updated_at?: string;
        };
      };
      classifications: {
        Row: {
          id: string;
          ticket_id: string;
          model: string;
          label: string;
          confidence: number;
          rationale: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          model: string;
          label: string;
          confidence: number;
          rationale?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string;
          model?: string;
          label?: string;
          confidence?: number;
          rationale?: string | null;
          created_at?: string;
        };
      };
      routing_rules: {
        Row: {
          id: string;
          name: string;
          rule_json: Json;
          enabled: boolean;
          priority: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          rule_json: Json;
          enabled?: boolean;
          priority?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          rule_json?: Json;
          enabled?: boolean;
          priority?: number;
          created_at?: string;
        };
      };
      kb_articles: {
        Row: {
          id: string;
          title: string;
          body: string;
          source_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          body: string;
          source_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          body?: string;
          source_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      feedback_events: {
        Row: {
          id: string;
          ticket_id: string;
          type: FeedbackType;
          old_value: string | null;
          new_value: string | null;
          rationale: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          type: FeedbackType;
          old_value?: string | null;
          new_value?: string | null;
          rationale?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string;
          type?: FeedbackType;
          old_value?: string | null;
          new_value?: string | null;
          rationale?: string | null;
          created_by?: string;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          ticket_id: string | null;
          actor_id: string;
          action: string;
          payload_json: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id?: string | null;
          actor_id: string;
          action: string;
          payload_json?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string | null;
          actor_id?: string;
          action?: string;
          payload_json?: Json | null;
          created_at?: string;
        };
      };
      ticket_replies: {
        Row: {
          id: string;
          ticket_id: string;
          author_id: string;
          body: string;
          is_internal: boolean;
          kb_articles_used: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          author_id: string;
          body: string;
          is_internal?: boolean;
          kb_articles_used?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string;
          author_id?: string;
          body?: string;
          is_internal?: boolean;
          kb_articles_used?: Json | null;
          created_at?: string;
        };
      };
      alerts: {
        Row: {
          id: string;
          name: string;
          type: AlertType;
          webhook_url: string;
          enabled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: AlertType;
          webhook_url: string;
          enabled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: AlertType;
          webhook_url?: string;
          enabled?: boolean;
          created_at?: string;
        };
      };
    };
  };
}
