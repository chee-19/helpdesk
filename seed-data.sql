-- Seed Data for Helpdesk Triage Assistant
-- Run these queries in Supabase SQL Editor after creating your first admin user

-- 1. Sample Queues
INSERT INTO queues (name, team, description) VALUES
('Billing Support', 'billing', 'Payment, invoicing, and subscription issues'),
('Technical Support', 'tech', 'Bug reports, errors, and technical problems'),
('Product Team', 'product', 'Feature requests and product feedback'),
('Security Team', 'security', 'Abuse reports and security concerns'),
('General Support', null, 'General inquiries and other issues')
ON CONFLICT DO NOTHING;

-- 2. Business Hours (Standard 9-5 Mon-Fri)
INSERT INTO business_hours (name, timezone, schedule) VALUES
('Business Hours', 'America/New_York', '{
  "mon": {"start": "09:00", "end": "17:00"},
  "tue": {"start": "09:00", "end": "17:00"},
  "wed": {"start": "09:00", "end": "17:00"},
  "thu": {"start": "09:00", "end": "17:00"},
  "fri": {"start": "09:00", "end": "17:00"}
}'),
('24/7 Support', 'UTC', '{
  "mon": {"start": "00:00", "end": "23:59"},
  "tue": {"start": "00:00", "end": "23:59"},
  "wed": {"start": "00:00", "end": "23:59"},
  "thu": {"start": "00:00", "end": "23:59"},
  "fri": {"start": "00:00", "end": "23:59"},
  "sat": {"start": "00:00", "end": "23:59"},
  "sun": {"start": "00:00", "end": "23:59"}
}')
ON CONFLICT DO NOTHING;

-- 3. SLA Policies
INSERT INTO sla_policies (name, first_response_minutes, resolve_minutes, business_hours_id)
SELECT
  'Standard SLA',
  60,
  1440,
  id
FROM business_hours
WHERE name = 'Business Hours'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO sla_policies (name, first_response_minutes, resolve_minutes, business_hours_id)
SELECT
  'Premium SLA',
  15,
  480,
  id
FROM business_hours
WHERE name = '24/7 Support'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO sla_policies (name, first_response_minutes, resolve_minutes, business_hours_id)
SELECT
  'Enterprise SLA',
  5,
  240,
  id
FROM business_hours
WHERE name = '24/7 Support'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 4. Sample Customers
INSERT INTO customers (name, tier, default_sla_policy_id)
SELECT 'Acme Corp', 'enterprise', id FROM sla_policies WHERE name = 'Enterprise SLA' LIMIT 1
UNION ALL
SELECT 'TechStart Inc', 'pro', id FROM sla_policies WHERE name = 'Premium SLA' LIMIT 1
UNION ALL
SELECT 'Small Business LLC', 'free', id FROM sla_policies WHERE name = 'Standard SLA' LIMIT 1
ON CONFLICT DO NOTHING;

-- 5. Routing Rules
-- NOTE: Replace QUEUE_ID placeholders with actual queue IDs from your queues table

-- Rule: Route billing issues to Billing Support
INSERT INTO routing_rules (name, priority, enabled, rule_json)
SELECT
  'Billing → Billing Support',
  100,
  true,
  jsonb_build_object(
    'conditions', jsonb_build_array(
      jsonb_build_object(
        'field', 'category',
        'operator', 'equals',
        'value', 'billing'
      )
    ),
    'actions', jsonb_build_array(
      jsonb_build_object(
        'type', 'assign_queue',
        'value', id::text
      )
    ),
    'matchAll', true
  )
FROM queues WHERE name = 'Billing Support'
ON CONFLICT DO NOTHING;

-- Rule: Route bugs to Technical Support
INSERT INTO routing_rules (name, priority, enabled, rule_json)
SELECT
  'Bugs → Technical Support',
  95,
  true,
  jsonb_build_object(
    'conditions', jsonb_build_array(
      jsonb_build_object(
        'field', 'category',
        'operator', 'equals',
        'value', 'bug'
      )
    ),
    'actions', jsonb_build_array(
      jsonb_build_object(
        'type', 'assign_queue',
        'value', id::text
      )
    ),
    'matchAll', true
  )
FROM queues WHERE name = 'Technical Support'
ON CONFLICT DO NOTHING;

-- Rule: Route feature requests to Product Team
INSERT INTO routing_rules (name, priority, enabled, rule_json)
SELECT
  'Features → Product Team',
  90,
  true,
  jsonb_build_object(
    'conditions', jsonb_build_array(
      jsonb_build_object(
        'field', 'category',
        'operator', 'equals',
        'value', 'feature_request'
      )
    ),
    'actions', jsonb_build_array(
      jsonb_build_object(
        'type', 'assign_queue',
        'value', id::text
      )
    ),
    'matchAll', true
  )
FROM queues WHERE name = 'Product Team'
ON CONFLICT DO NOTHING;

-- Rule: Route abuse reports to Security Team with urgent priority
INSERT INTO routing_rules (name, priority, enabled, rule_json)
SELECT
  'Abuse → Security (Urgent)',
  110,
  true,
  jsonb_build_object(
    'conditions', jsonb_build_array(
      jsonb_build_object(
        'field', 'category',
        'operator', 'equals',
        'value', 'abuse_report'
      )
    ),
    'actions', jsonb_build_array(
      jsonb_build_object(
        'type', 'assign_queue',
        'value', id::text
      ),
      jsonb_build_object(
        'type', 'set_priority',
        'value', 'urgent'
      )
    ),
    'matchAll', true
  )
FROM queues WHERE name = 'Security Team'
ON CONFLICT DO NOTHING;

-- Rule: Urgent priority tickets get high priority
INSERT INTO routing_rules (name, priority, enabled, rule_json)
VALUES (
  'Urgent Priority Override',
  105,
  true,
  '{
    "conditions": [{"field": "priority", "operator": "equals", "value": "urgent"}],
    "actions": [{"type": "set_priority", "value": "urgent"}],
    "matchAll": true
  }'
)
ON CONFLICT DO NOTHING;

-- 6. Sample KB Articles
INSERT INTO kb_articles (title, body, source_url) VALUES
(
  'How to Reset Your Password',
  'To reset your password:
1. Go to the login page
2. Click "Forgot Password"
3. Enter your email address
4. Check your email for the reset link
5. Follow the link and create a new password

Your new password must be at least 8 characters long and contain a mix of letters, numbers, and symbols.',
  'https://help.example.com/reset-password'
),
(
  'Billing Cycle and Payment Methods',
  'Your billing cycle starts on the day you subscribe. We support the following payment methods:
- Credit cards (Visa, Mastercard, Amex)
- Debit cards
- PayPal
- Bank transfer (enterprise only)

Invoices are sent via email on the first day of each billing cycle. You can view and download past invoices from your account settings.',
  'https://help.example.com/billing'
),
(
  'How to Report a Bug',
  'When reporting a bug, please include:
1. Steps to reproduce the issue
2. Expected behavior
3. Actual behavior
4. Screenshots or error messages
5. Browser and OS information
6. Time the issue occurred

This helps us investigate and resolve the issue faster.',
  'https://help.example.com/report-bug'
),
(
  'Feature Request Guidelines',
  'We love hearing your ideas! When submitting a feature request:
1. Search existing requests to avoid duplicates
2. Describe the problem you are trying to solve
3. Explain your proposed solution
4. Share use cases and expected benefits

Popular requests are prioritized in our product roadmap.',
  'https://help.example.com/feature-requests'
)
ON CONFLICT DO NOTHING;

-- 7. Make first user an admin (REPLACE email address)
-- UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';

SELECT 'Seed data inserted successfully!' as status;
