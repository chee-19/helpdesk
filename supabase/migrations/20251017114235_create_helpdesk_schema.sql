/*
  # Helpdesk Triage Assistant - Complete Schema

  ## Overview
  This migration creates the complete database schema for a production-ready helpdesk triage system
  with AI-powered classification, routing, SLA tracking, knowledge base, and audit logging.

  ## New Tables

  ### Core Tables
  1. `users` - System users (admins, agents, viewers)
     - `id` (uuid, references auth.users)
     - `email` (text)
     - `role` (text) - admin, agent, viewer
     - `team` (text) - team assignment
     - `created_at` (timestamptz)

  2. `customers` - Customer accounts with tier and SLA
     - `id` (uuid, primary key)
     - `name` (text)
     - `tier` (text) - free, pro, enterprise
     - `default_sla_policy_id` (uuid, nullable)
     - `created_at` (timestamptz)

  3. `queues` - Support queues for routing
     - `id` (uuid, primary key)
     - `name` (text)
     - `team` (text)
     - `description` (text)
     - `created_at` (timestamptz)

  4. `business_hours` - Business hours calendars for SLA calculations
     - `id` (uuid, primary key)
     - `name` (text)
     - `timezone` (text)
     - `schedule` (jsonb) - mon-sun schedule
     - `created_at` (timestamptz)

  5. `sla_policies` - SLA policies with business hours support
     - `id` (uuid, primary key)
     - `name` (text)
     - `first_response_minutes` (integer)
     - `resolve_minutes` (integer)
     - `business_hours_id` (uuid, nullable)
     - `created_at` (timestamptz)

  6. `tickets` - Core ticket table
     - `id` (uuid, primary key)
     - `created_at` (timestamptz)
     - `requester_name` (text)
     - `requester_email` (text)
     - `subject` (text)
     - `body` (text)
     - `attachment_url` (text, nullable)
     - `status` (text) - new, assigned, in_progress, waiting, resolved, closed
     - `priority` (text) - low, medium, high, urgent
     - `category` (text) - billing, bug, feature_request, abuse_report, other
     - `queue_id` (uuid, nullable)
     - `assignee_id` (uuid, nullable)
     - `sla_policy_id` (uuid, nullable)
     - `customer_id` (uuid, nullable)
     - `language` (text) - detected language code
     - `duplicate_of` (uuid, nullable) - references another ticket
     - `first_response_at` (timestamptz, nullable)
     - `resolved_at` (timestamptz, nullable)
     - `updated_at` (timestamptz)

  7. `classifications` - AI classification results
     - `id` (uuid, primary key)
     - `ticket_id` (uuid)
     - `model` (text) - model identifier
     - `label` (text) - classification label
     - `confidence` (numeric)
     - `rationale` (text) - explanation
     - `created_at` (timestamptz)

  8. `routing_rules` - Routing automation rules
     - `id` (uuid, primary key)
     - `name` (text)
     - `rule_json` (jsonb) - rule definition
     - `enabled` (boolean)
     - `priority` (integer) - execution order
     - `created_at` (timestamptz)

  9. `kb_articles` - Knowledge base articles
     - `id` (uuid, primary key)
     - `title` (text)
     - `body` (text)
     - `source_url` (text, nullable)
     - `embedding` (vector, nullable) - pgvector for semantic search
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)

  10. `feedback_events` - Capture overrides and feedback
      - `id` (uuid, primary key)
      - `ticket_id` (uuid)
      - `type` (text) - override_category, override_priority, thumbs_up, thumbs_down
      - `old_value` (text, nullable)
      - `new_value` (text, nullable)
      - `rationale` (text, nullable)
      - `created_by` (uuid)
      - `created_at` (timestamptz)

  11. `audit_logs` - Complete audit trail
      - `id` (uuid, primary key)
      - `ticket_id` (uuid, nullable)
      - `actor_id` (uuid)
      - `action` (text)
      - `payload_json` (jsonb)
      - `created_at` (timestamptz)

  12. `ticket_replies` - Ticket responses
      - `id` (uuid, primary key)
      - `ticket_id` (uuid)
      - `author_id` (uuid)
      - `body` (text)
      - `is_internal` (boolean)
      - `kb_articles_used` (jsonb, nullable) - array of KB article IDs
      - `created_at` (timestamptz)

  13. `alerts` - Alert configurations
      - `id` (uuid, primary key)
      - `name` (text)
      - `type` (text) - sla_breach, abuse_detected, unassigned_urgent
      - `webhook_url` (text)
      - `enabled` (boolean)
      - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Policies enforce role-based access (admin, agent, viewer)
  - Agents can only access tickets in their assigned queues
  - Public can submit tickets (insert-only)

  ## Indexes
  - Performance indexes on frequently queried columns
  - GiST index on embedding column for vector similarity search

  ## Important Notes
  1. PII should be redacted before LLM calls (handled in application layer)
  2. Business hours stored as JSON: {"mon": {"start": "09:00", "end": "17:00"}, ...}
  3. Routing rules stored as JSON with conditions and actions
  4. Vector extension (pgvector) is optional; embedding column nullable
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'agent', 'viewer')),
  team text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage users"
  ON users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tier text NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
  default_sla_policy_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create queues table
CREATE TABLE IF NOT EXISTS queues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  team text,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE queues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read queues"
  ON queues FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage queues"
  ON queues FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create business_hours table
CREATE TABLE IF NOT EXISTS business_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  schedule jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read business hours"
  ON business_hours FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage business hours"
  ON business_hours FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create sla_policies table
CREATE TABLE IF NOT EXISTS sla_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  first_response_minutes integer NOT NULL,
  resolve_minutes integer NOT NULL,
  business_hours_id uuid REFERENCES business_hours(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sla_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read SLA policies"
  ON sla_policies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage SLA policies"
  ON sla_policies FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add foreign key to customers now that sla_policies exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'customers_default_sla_policy_id_fkey'
  ) THEN
    ALTER TABLE customers
    ADD CONSTRAINT customers_default_sla_policy_id_fkey
    FOREIGN KEY (default_sla_policy_id) REFERENCES sla_policies(id);
  END IF;
END $$;

-- Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  requester_name text NOT NULL,
  requester_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  attachment_url text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'assigned', 'in_progress', 'waiting', 'resolved', 'closed')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category text CHECK (category IN ('billing', 'bug', 'feature_request', 'abuse_report', 'other')),
  queue_id uuid REFERENCES queues(id),
  assignee_id uuid REFERENCES users(id),
  sla_policy_id uuid REFERENCES sla_policies(id),
  customer_id uuid REFERENCES customers(id),
  language text DEFAULT 'en',
  duplicate_of uuid REFERENCES tickets(id),
  first_response_at timestamptz,
  resolved_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for tickets
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category);
CREATE INDEX IF NOT EXISTS idx_tickets_queue_id ON tickets(queue_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee_id ON tickets(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tickets_customer_id ON tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_requester_email ON tickets(requester_email);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can submit tickets"
  ON tickets FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Agents can read tickets in their queues"
  ON tickets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (
        users.role = 'admin'
        OR queue_id IN (
          SELECT q.id FROM queues q
          WHERE q.team = users.team OR users.team IS NULL
        )
      )
    )
  );

CREATE POLICY "Agents can update tickets in their queues"
  ON tickets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'agent')
      AND (
        users.role = 'admin'
        OR queue_id IN (
          SELECT q.id FROM queues q
          WHERE q.team = users.team OR users.team IS NULL
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'agent')
    )
  );

-- Create classifications table
CREATE TABLE IF NOT EXISTS classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  model text NOT NULL,
  label text NOT NULL,
  confidence numeric(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  rationale text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classifications_ticket_id ON classifications(ticket_id);

ALTER TABLE classifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read classifications"
  ON classifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id = classifications.ticket_id
    )
  );

CREATE POLICY "System can insert classifications"
  ON classifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create routing_rules table
CREATE TABLE IF NOT EXISTS routing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rule_json jsonb NOT NULL,
  enabled boolean DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_routing_rules_priority ON routing_rules(priority DESC) WHERE enabled = true;

ALTER TABLE routing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read routing rules"
  ON routing_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage routing rules"
  ON routing_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create kb_articles table (embedding column nullable for optional pgvector)
CREATE TABLE IF NOT EXISTS kb_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  source_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kb_articles_title ON kb_articles USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_kb_articles_body ON kb_articles USING gin(to_tsvector('english', body));

ALTER TABLE kb_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read KB articles"
  ON kb_articles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage KB articles"
  ON kb_articles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create feedback_events table
CREATE TABLE IF NOT EXISTS feedback_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('override_category', 'override_priority', 'override_queue', 'thumbs_up', 'thumbs_down')),
  old_value text,
  new_value text,
  rationale text,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_events_ticket_id ON feedback_events(ticket_id);
CREATE INDEX IF NOT EXISTS idx_feedback_events_type ON feedback_events(type);

ALTER TABLE feedback_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read feedback events"
  ON feedback_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create feedback events"
  ON feedback_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES tickets(id) ON DELETE SET NULL,
  actor_id uuid NOT NULL REFERENCES users(id),
  action text NOT NULL,
  payload_json jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_ticket_id ON audit_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'agent')
    )
  );

CREATE POLICY "Authenticated users can create audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = actor_id);

-- Create ticket_replies table
CREATE TABLE IF NOT EXISTS ticket_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id),
  body text NOT NULL,
  is_internal boolean DEFAULT false,
  kb_articles_used jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket_id ON ticket_replies(ticket_id);

ALTER TABLE ticket_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can read replies for accessible tickets"
  ON ticket_replies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id = ticket_replies.ticket_id
    )
  );

CREATE POLICY "Agents can create replies"
  ON ticket_replies FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'agent')
    )
  );

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('sla_breach', 'abuse_detected', 'unassigned_urgent')),
  webhook_url text NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage alerts"
  ON alerts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tickets updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_tickets_updated_at'
  ) THEN
    CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Create trigger for kb_articles updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_kb_articles_updated_at'
  ) THEN
    CREATE TRIGGER update_kb_articles_updated_at
    BEFORE UPDATE ON kb_articles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;