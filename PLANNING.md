# Helpdesk Triage Assistant - Planning & Architecture

## Executive Summary

The Helpdesk Triage Assistant is a production-ready AI-powered support ticket management system that automatically classifies, routes, and helps agents respond to customer inquiries with intelligent automation, comprehensive SLA tracking, and explainable AI.

## Architecture Overview

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React Context (Auth) + Local State
- **Routing**: Custom lightweight router with history API
- **Real-time Updates**: Supabase real-time subscriptions

### Backend Architecture
- **Database**: Supabase PostgreSQL with Row Level Security
- **Authentication**: Supabase Auth with email/password
- **Storage**: Supabase Storage for ticket attachments
- **Edge Functions**: Supabase Edge Functions (Deno runtime)
- **AI Integration**: OpenAI GPT-4o-mini via Edge Functions

### Security Model
- Role-based access control (Admin, Agent, Viewer)
- Row Level Security on all tables
- Agents restricted to assigned queue tickets
- Public ticket submission with rate limiting consideration
- Audit logging for all actions
- PII redaction before LLM calls (application layer)

## Data Model

### Core Entities

#### Tickets
Primary entity tracking support requests with:
- Requester information
- Status tracking (new → assigned → in_progress → resolved → closed)
- Priority levels (low, medium, high, urgent)
- AI-assigned categories
- SLA timestamps
- Queue and assignee relationships

#### Classifications
AI model outputs with:
- Category prediction
- Confidence scores (0-1)
- Rationale/explanation
- Model identifier for tracking

#### Routing Rules
JSON-based rule engine with:
- Conditions (field, operator, value)
- Actions (assign_queue, assign_user, set_priority)
- Priority ordering
- Enable/disable toggle

#### SLA Policies
Business hours-aware SLA tracking:
- First response time target
- Resolution time target
- Business hours calendar reference
- Customer tier association

#### Knowledge Base
Support articles for AI-augmented replies:
- Title and body content
- Source URL reference
- Full-text search indexes
- Optional vector embeddings (future enhancement)

#### Audit Logs
Complete action tracking:
- Actor identification
- Action type
- Related ticket
- JSON payload
- Timestamp

### Relationships

```
customers -> sla_policies (default_sla_policy_id)
tickets -> customers (customer_id)
tickets -> queues (queue_id)
tickets -> users (assignee_id)
tickets -> sla_policies (sla_policy_id)
tickets -> tickets (duplicate_of, self-reference)
classifications -> tickets (ticket_id)
ticket_replies -> tickets (ticket_id)
ticket_replies -> users (author_id)
feedback_events -> tickets (ticket_id)
feedback_events -> users (created_by)
audit_logs -> tickets (ticket_id)
audit_logs -> users (actor_id)
```

## AI Integration

### Classification Pipeline
1. User submits ticket
2. Edge function `classify-ticket` invoked
3. GPT-4o-mini analyzes subject + body
4. Returns: category, priority, confidence, rationale, language, abuse flag
5. Results stored in `classifications` table
6. Ticket updated with classification

### Draft Reply Pipeline
1. Agent requests AI draft
2. Optional KB article retrieval (keyword/semantic search)
3. Edge function `draft-reply` with context
4. GPT-4o-mini generates empathetic, solution-oriented reply
5. Agent can edit before sending
6. KB articles used tracked for analytics

### Translation Pipeline
1. Detect ticket language during classification
2. Agent can request translation
3. Edge function `translate-text` for bidirectional translation
4. Preserve tone and context
5. Support multilingual customer communication

### Explainable AI
- All predictions include confidence scores
- Rationale provided for classifications
- Override controls with feedback capture
- Feedback loop for continuous improvement

## Routing Engine

### Rule Structure
```json
{
  "conditions": [
    {
      "field": "category",
      "operator": "equals",
      "value": "billing"
    }
  ],
  "actions": [
    {
      "type": "assign_queue",
      "value": "queue-uuid"
    }
  ],
  "matchAll": true
}
```

### Evaluation Logic
1. Load enabled rules sorted by priority (descending)
2. For each rule:
   - Evaluate conditions (matchAll=AND, otherwise OR)
   - If match, apply actions
   - Continue to next rule (rules are additive, not exclusive)
3. Return routing result with matched rules

### Supported Operators
- `equals`: Exact match
- `contains`: Substring match (case-insensitive)
- `in`: Value in array
- `greaterThan`: Numeric comparison
- `lessThan`: Numeric comparison

### Supported Actions
- `assign_queue`: Set ticket queue
- `assign_user`: Set ticket assignee
- `set_priority`: Override priority

## SLA Calculations

### Business Hours Support
```json
{
  "mon": {"start": "09:00", "end": "17:00"},
  "tue": {"start": "09:00", "end": "17:00"}
}
```

### SLA Status Tracking
- First response due timestamp
- Resolution due timestamp
- Minutes until breach
- Breach flags
- Business hours consideration

### Breach Predictions
- Warning at 60 minutes before breach
- Banner notification in UI
- Alert webhook triggers (Slack/Teams)
- Email notifications (optional)

## Duplicate Detection

### Algorithm
1. Query recent tickets (24-hour window by default)
2. Same requester email
3. Calculate string similarity on subjects
4. Threshold: 60% similarity (Jaccard index)
5. Warn user before submission
6. Option to submit anyway or view existing

### Similarity Calculation
- Split subject into words (>2 chars)
- Jaccard similarity: intersection / union
- Configurable threshold

## Pages & User Flows

### Public Flow: Ticket Submission
```
/submit
  → Form: name, email, subject, body, attachment
  → Duplicate check
  → Submit → Create ticket
  → Async: AI classification
  → Success message
```

### Agent Flow: Inbox & Response
```
/login → /inbox
  → Filter tickets (status, priority, category)
  → Click ticket → /ticket/:id
    → View details, timeline, classification
    → AI draft reply (optional)
    → Edit & send reply
    → First response → Update SLA
    → Mark resolved
```

### Admin Flow: Configuration
```
/admin
  → Routing rules tab
    → Create/edit rules
    → Enable/disable
  → Rule simulator
    → Input: category, priority, etc.
    → Output: matched rules, routing result
  → Queues management
  → SLA policies
  → KB articles
```

### Metrics Flow: Analytics
```
/metrics
  → Dashboard cards:
    - Total tickets
    - Avg first response time
    - Avg resolution time
    - SLA hit rate
  → Charts:
    - Tickets by category
    - Tickets by priority
  → Time range filters (future)
```

## Implementation Details

### Authentication Flow
1. AuthProvider wraps app
2. Subscribe to auth state changes
3. Load user profile from `users` table
4. Persist session
5. Protected routes check profile existence
6. Role-based access for admin features

### Real-time Updates
- Supabase Realtime channels
- Subscribe to `tickets` table changes
- Auto-refresh inbox on INSERT/UPDATE
- Optimistic UI updates

### File Upload
1. User selects file in form
2. Upload to Supabase Storage bucket
3. Get public URL
4. Store URL in ticket.attachment_url
5. Display/download in ticket view

### Error Handling
- Try-catch in all async operations
- User-friendly error messages
- Toast notifications (via state)
- Fallback UI for failed states
- Retry mechanisms where appropriate

## Performance Considerations

### Database Indexes
- `tickets(created_at DESC)` for chronological queries
- `tickets(status)`, `tickets(priority)`, `tickets(category)` for filtering
- `tickets(queue_id)`, `tickets(assignee_id)` for access control
- `tickets(requester_email)` for duplicate detection
- Full-text search on KB articles

### Query Optimization
- Use `.maybeSingle()` for 0-or-1 results
- Limit large result sets
- Select only needed columns
- Use RLS for automatic filtering
- Consider pagination for large datasets

### Edge Function Optimization
- Minimal dependencies
- Deno runtime benefits
- CDN edge deployment
- Caching where applicable
- Async processing for non-blocking

## Testing Strategy

### Manual Testing Checklist
- [ ] Submit ticket as public user
- [ ] Duplicate detection triggers
- [ ] AI classification completes
- [ ] Login as agent
- [ ] View inbox with filters
- [ ] Open ticket details
- [ ] Generate AI draft reply
- [ ] Send reply → first_response_at updates
- [ ] Mark ticket resolved
- [ ] Login as admin
- [ ] Configure routing rule
- [ ] Test rule simulator
- [ ] Check metrics dashboard
- [ ] Verify audit logs

### Automated Testing (Future)
- Unit tests for routing engine
- Integration tests for API calls
- E2E tests for critical flows
- RLS policy tests
- Performance benchmarks

## Deployment Checklist

### Pre-deployment
- [ ] Run `npm run build` successfully
- [ ] Verify all Edge Functions deployed
- [ ] Test database migrations
- [ ] Seed initial data (queues, SLA policies)
- [ ] Create admin user
- [ ] Configure routing rules
- [ ] Add KB articles
- [ ] Set up storage bucket
- [ ] Test AI integration

### Post-deployment
- [ ] Verify public ticket submission works
- [ ] Test agent login and workflow
- [ ] Confirm AI classification functioning
- [ ] Check metrics dashboard
- [ ] Monitor error logs
- [ ] Test SLA calculations
- [ ] Verify RLS policies

## Future Enhancements

### Phase 2 Features
- Email ingestion via SendGrid/Postmark webhook
- Slack/Teams integration for alerts
- CSAT surveys after resolution
- Advanced analytics and reports
- Customer portal for ticket tracking
- Mobile app (React Native)

### Phase 3 Features
- Vector embeddings (pgvector) for semantic KB search
- Multi-language UI
- Automated ticket merging
- Escalation workflows
- Custom fields per ticket type
- Webhook integrations (Zapier, n8n)
- API for third-party integrations

### AI Improvements
- Fine-tuned classification model
- Sentiment analysis
- Priority prediction
- Auto-resolution for common issues
- Suggested KB articles in real-time
- Agent assist (real-time suggestions)

## Monitoring & Observability

### Metrics to Track
- Ticket volume (daily, weekly, monthly)
- Classification accuracy (via overrides)
- First response time (TTFR)
- Time to resolution (TTR)
- SLA breach rate
- Agent response rate
- Customer satisfaction (CSAT)
- KB article usage

### Alerting
- SLA breach warnings
- Abuse detection alerts
- High-priority unassigned tickets
- System errors
- API rate limits

## Conclusion

This helpdesk triage system provides a solid foundation for AI-powered support ticket management with:
- Comprehensive automation
- Explainable AI decisions
- Flexible routing engine
- Business hours-aware SLA tracking
- Role-based security
- Complete audit trails
- Extensible architecture

The system is production-ready and can be extended with additional features as needed.
