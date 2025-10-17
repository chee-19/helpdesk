# Quick Start Guide

## 1. Initial Setup (5 minutes)

### Step 1: Verify Environment
Your `.env` file should already contain:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Step 2: Seed Database
1. Open Supabase SQL Editor
2. Copy contents of `seed-data.sql`
3. Execute the SQL
4. This creates queues, SLA policies, routing rules, and KB articles

### Step 3: Create Admin User
1. Start the dev server (already running)
2. Visit the app
3. You'll be redirected to `/login`
4. Click on "Submit" link to visit `/submit` (public page)
5. Go back to `/login`
6. Use Supabase Dashboard → Authentication → Add User
7. Create a user with email/password
8. In SQL Editor, run:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
   ```

## 2. First Login (2 minutes)

1. Visit `/login`
2. Sign in with your credentials
3. You'll be redirected to `/inbox`

## 3. Test the System (10 minutes)

### Test Public Submission
1. Open a new incognito window
2. Visit `/submit`
3. Fill out the form:
   - Name: "Test User"
   - Email: "test@example.com"
   - Subject: "Cannot access my account"
   - Description: "I forgot my password and the reset link isn't working"
4. Submit
5. AI will classify it automatically (check after ~5 seconds)

### View in Inbox
1. In your logged-in window, refresh `/inbox`
2. You should see the new ticket
3. Note the AI-assigned category and priority

### Test AI Draft Reply
1. Click on the ticket
2. Click "AI Draft" button
3. The system will generate a suggested response
4. Edit if needed and click "Send Reply"
5. First response timestamp will be recorded

### Test Admin Features
1. Visit `/admin`
2. View routing rules
3. Try the Rule Simulator:
   - Category: "bug"
   - Priority: "high"
   - Click "Run Simulation"
   - See which queue it would route to

### Check Metrics
1. Visit `/metrics`
2. View dashboard with ticket statistics
3. See category and priority breakdowns

## 4. Configure Routing (5 minutes)

Routing rules are already seeded, but you can customize them:

1. Go to `/admin`
2. Review existing rules
3. Rules are evaluated in priority order (highest first)
4. Each rule has conditions and actions

### Example: Custom Rule
To add a new rule via SQL:

```sql
INSERT INTO routing_rules (name, priority, enabled, rule_json)
SELECT
  'High Priority → Escalation Queue',
  95,
  true,
  jsonb_build_object(
    'conditions', jsonb_build_array(
      jsonb_build_object(
        'field', 'priority',
        'operator', 'equals',
        'value', 'high'
      )
    ),
    'actions', jsonb_build_array(
      jsonb_build_object(
        'type', 'assign_queue',
        'value', (SELECT id FROM queues WHERE name = 'Technical Support')
      )
    ),
    'matchAll', true
  );
```

## 5. Common Tasks

### Add a New Agent
```sql
-- After they sign up:
UPDATE users SET role = 'agent', team = 'tech' WHERE email = 'agent@example.com';
```

### Create a Queue
```sql
INSERT INTO queues (name, team, description)
VALUES ('VIP Support', 'vip', 'High-value customer support');
```

### Add KB Article
```sql
INSERT INTO kb_articles (title, body)
VALUES (
  'How to Update Payment Method',
  'To update your payment method:
1. Log into your account
2. Go to Settings → Billing
3. Click "Update Payment Method"
4. Enter new card details
5. Click Save'
);
```

### Check Recent Activity
```sql
SELECT * FROM audit_logs
ORDER BY created_at DESC
LIMIT 20;
```

### View AI Classifications
```sql
SELECT
  t.subject,
  c.label,
  c.confidence,
  c.rationale
FROM tickets t
JOIN classifications c ON t.id = c.ticket_id
ORDER BY t.created_at DESC
LIMIT 10;
```

## 6. Testing AI Features

### Test Different Categories
Submit tickets with these subjects to test classification:

1. **Billing**: "Why was I charged twice this month?"
2. **Bug**: "The app crashes when I click submit"
3. **Feature Request**: "Please add dark mode to the dashboard"
4. **Abuse**: "This service is terrible and you're all scammers"

### Test Multilingual Support
1. Submit ticket in Spanish: "No puedo iniciar sesión"
2. System should detect language as "es"
3. AI draft reply will respond in Spanish

### Test Duplicate Detection
1. Submit a ticket: "Password reset not working"
2. Immediately submit another: "Password reset still not working"
3. System should warn about potential duplicate

## 7. Troubleshooting

### Tickets Not Showing in Inbox
- Check RLS policies
- Verify user role and team
- Check queue assignments

### AI Classification Not Working
- Verify Edge Functions are deployed
- Check Supabase logs
- Ensure OPENAI_API_KEY is configured (auto-configured)

### Storage Upload Failing
- Verify `ticket-attachments` bucket exists
- Check bucket policies
- Ensure public access if needed

### Can't Access Admin Panel
- Verify user role is 'admin':
  ```sql
  SELECT email, role FROM users WHERE email = 'your-email@example.com';
  ```

## 8. Next Steps

1. **Configure Real Alerts**
   - Set up Slack webhook for SLA breaches
   - Add alert configurations in `alerts` table

2. **Import Real KB Articles**
   - Export from existing docs
   - Import via SQL or build importer

3. **Customize Routing Rules**
   - Based on your team structure
   - Test with rule simulator

4. **Set Up Customer Records**
   - Import customer list
   - Assign SLA policies by tier

5. **Train Your Team**
   - Share login credentials
   - Walk through agent workflow
   - Demonstrate AI features

## 9. Production Checklist

Before going live:

- [ ] All agents have accounts with correct roles
- [ ] Queues match your team structure
- [ ] Routing rules tested and enabled
- [ ] SLA policies configured
- [ ] KB articles imported
- [ ] Storage bucket configured
- [ ] Email notifications planned (future)
- [ ] Monitoring/alerting configured
- [ ] Backup strategy in place
- [ ] Team trained on system

## Support

For issues or questions:
1. Check `PLANNING.md` for architecture details
2. Review `README.md` for comprehensive documentation
3. Check Supabase logs for errors
4. Review audit logs for activity tracking

Happy triaging!
