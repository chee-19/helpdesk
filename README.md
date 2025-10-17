# Helpdesk Triage Assistant

A modern AI-powered helpdesk triage system that automatically classifies, routes, and prioritizes support tickets using AI with comprehensive SLA tracking, multilingual support, and explainable AI features.

## Features

### Core Functionality
- **AI-Powered Classification**: Automatically categorizes tickets (Billing, Bug, Feature Request, Abuse Report, Other)
- **Smart Routing**: Rule-based routing engine with priority system
- **Duplicate Detection**: Warns when similar tickets exist from the same requester
- **AI-Assisted Replies**: Generate draft responses with KB retrieval support
- **Multilingual Support**: Detects language and translates tickets/replies
- **SLA Tracking**: Business hours-aware SLA calculations with breach predictions
- **Abuse Detection**: Automatic flagging of abusive content

### Agent Features
- **Inbox View**: Filter by status, priority, category with real-time updates
- **Ticket Details**: Full timeline, AI insights, and reply composer
- **AI Draft Replies**: Generate contextual responses with confidence scores
- **Override Controls**: Manual classification/routing with feedback capture

### Admin Features
- **Routing Rules Manager**: Configure automatic ticket routing
- **Rule Simulator**: Test routing logic before applying
- **Queue Management**: Organize teams and queues
- **SLA Policies**: Configure response and resolution SLAs with business hours
- **Knowledge Base**: Manage articles for AI-powered reply assistance

### Analytics
- **Metrics Dashboard**: Track TTFR, resolution time, SLA hit rate
- **Category & Priority Breakdown**: Visual insights into ticket distribution
- **Audit Logging**: Complete trail of all actions and decisions

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **AI**: OpenAI GPT-4o-mini for classification, reply drafts, translation
- **Icons**: Lucide React

## Setup Instructions

### 1. Environment Variables

The `.env` file contains:
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key
- `OPENAI_API_KEY`: Set in Supabase Edge Functions secrets (auto-configured)

### 2. Database Setup

The database schema is automatically created with:
- All tables with RLS policies
- Indexes for performance
- Audit logging
- Business hours support for SLA calculations

### 3. Initial Data (Admin Setup)

You'll need to create:

1. **Admin User**: Sign up via the app, then run this SQL in Supabase:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
   ```

2. **Sample Queues**:
   ```sql
   INSERT INTO queues (name, team, description) VALUES
   ('Billing', 'billing', 'Payment and invoice issues'),
   ('Technical Support', 'tech', 'Bug reports and technical issues'),
   ('Product', 'product', 'Feature requests and product feedback');
   ```

3. **Sample SLA Policy**:
   ```sql
   INSERT INTO sla_policies (name, first_response_minutes, resolve_minutes) VALUES
   ('Standard', 60, 1440);
   ```

4. **Sample Routing Rules**:
   ```sql
   INSERT INTO routing_rules (name, priority, enabled, rule_json) VALUES
   ('Route Billing to Billing Queue', 100, true,
    '{"conditions": [{"field": "category", "operator": "equals", "value": "billing"}],
      "actions": [{"type": "assign_queue", "value": "BILLING_QUEUE_ID_HERE"}],
      "matchAll": true}'),
   ('Urgent Tickets High Priority', 90, true,
    '{"conditions": [{"field": "priority", "operator": "equals", "value": "urgent"}],
      "actions": [{"type": "set_priority", "value": "urgent"}],
      "matchAll": true}');
   ```

### 4. Storage Bucket

Create a storage bucket named `ticket-attachments` in Supabase:
1. Go to Storage in Supabase Dashboard
2. Create new bucket: `ticket-attachments`
3. Set public access policies as needed

### 5. Edge Functions

Three edge functions are deployed automatically:
- `classify-ticket`: AI classification and abuse detection
- `draft-reply`: Generate AI-powered reply drafts with KB support
- `translate-text`: Multilingual translation support

## Usage

### Public Ticket Submission
- Access `/submit` without authentication
- Duplicate detection warns about similar recent tickets
- Auto-classification happens asynchronously

### Agent Workflow
1. Login at `/login`
2. View inbox at `/inbox` with filters
3. Click ticket to see details, AI classification, and rationale
4. Use "AI Draft" to generate reply suggestions
5. Override AI decisions with feedback capture

### Admin Tasks
1. Access `/admin` (admin role required)
2. Configure routing rules
3. Use Rule Simulator to test routing logic
4. Manage queues and teams
5. View and configure SLA policies

### Metrics
- View `/metrics` for performance insights
- Track TTFR, resolution times, SLA compliance
- Analyze ticket distribution by category and priority

## Architecture

### Database Schema
- `tickets`: Core ticket data
- `classifications`: AI classification results with confidence
- `routing_rules`: Configurable routing logic
- `queues`: Support queue organization
- `sla_policies`: SLA configurations with business hours
- `kb_articles`: Knowledge base for reply assistance
- `audit_logs`: Complete audit trail
- `feedback_events`: Capture overrides for model improvement

### Security (RLS)
- Agents can only access tickets in their queues
- Admins have full access
- Public can submit tickets (insert-only)
- All actions logged for audit

### AI Integration
- Classification confidence scores and rationale
- Override tracking for continuous improvement
- KB-augmented reply generation
- Multilingual support via translation

## Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run preview
```

## Future Enhancements (TODOs)

- [ ] Email ingestion via webhook
- [ ] Slack/Teams alert integrations
- [ ] CSAT survey after resolution
- [ ] Vector embeddings for KB semantic search (pgvector)
- [ ] Advanced analytics and reporting
- [ ] Mobile-responsive design improvements
- [ ] Webhook for n8n integration
- [ ] Automated ticket merging for duplicates
- [ ] Customer portal for ticket tracking

## License

MIT
