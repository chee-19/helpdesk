import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export async function classifyTicket(subject: string, body: string, requesterEmail: string) {
  const apiUrl = `${SUPABASE_URL}/functions/v1/classify-ticket`;

  const { data: { session } } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ subject, body, requesterEmail }),
  });

  if (!response.ok) {
    throw new Error('Classification failed');
  }

  return response.json();
}

export async function draftReply(
  subject: string,
  body: string,
  category: string,
  language: string,
  kbArticles?: Array<{ title: string; body: string }>
) {
  const apiUrl = `${SUPABASE_URL}/functions/v1/draft-reply`;

  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ subject, body, category, language, kbArticles }),
  });

  if (!response.ok) {
    throw new Error('Draft reply failed');
  }

  return response.json();
}

export async function translateText(text: string, targetLanguage: string, sourceLanguage?: string) {
  const apiUrl = `${SUPABASE_URL}/functions/v1/translate-text`;

  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, targetLanguage, sourceLanguage }),
  });

  if (!response.ok) {
    throw new Error('Translation failed');
  }

  return response.json();
}

export async function createAuditLog(
  actorId: string,
  action: string,
  payloadJson?: Record<string, unknown>,
  ticketId?: string
) {
  const { error } = await supabase.from('audit_logs').insert({
    actor_id: actorId,
    action,
    payload_json: payloadJson,
    ticket_id: ticketId,
  });

  if (error) throw error;
}

export async function checkDuplicateTickets(
  subject: string,
  requesterEmail: string,
  windowHours: number = 24
) {
  const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('tickets')
    .select('id, subject, created_at, status')
    .eq('requester_email', requesterEmail)
    .gte('created_at', windowStart)
    .neq('status', 'closed')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) throw error;

  const similarityThreshold = 0.6;
  const duplicates = data?.filter(ticket => {
    const similarity = calculateStringSimilarity(subject.toLowerCase(), ticket.subject.toLowerCase());
    return similarity >= similarityThreshold;
  }) || [];

  return duplicates;
}

function calculateStringSimilarity(str1: string, str2: string): number {
  const words1 = str1.split(/\s+/).filter(w => w.length > 2);
  const words2 = str2.split(/\s+/).filter(w => w.length > 2);

  if (words1.length === 0 || words2.length === 0) return 0;

  const set1 = new Set(words1);
  const set2 = new Set(words2);

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}
