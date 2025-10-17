import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { draftReply, createAuditLog } from '../lib/api';
import { Database } from '../lib/database.types';
import { ArrowLeft, Send, Sparkles, MessageSquare } from 'lucide-react';
import { Link } from '../components/Link';

type Ticket = Database['public']['Tables']['tickets']['Row'];
type Reply = Database['public']['Tables']['ticket_replies']['Row'];
type Classification = Database['public']['Tables']['classifications']['Row'];

export function TicketDetail() {
  const ticketId = window.location.pathname.split('/').pop();
  const { profile } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [classification, setClassification] = useState<Classification | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [generatingDraft, setGeneratingDraft] = useState(false);

  useEffect(() => {
    if (ticketId) {
      loadTicket();
    }
  }, [ticketId]);

  const loadTicket = async () => {
    if (!ticketId) return;

    try {
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (ticketError) throw ticketError;
      setTicket(ticketData);

      const { data: repliesData } = await supabase
        .from('ticket_replies')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      setReplies(repliesData || []);

      const { data: classData } = await supabase
        .from('classifications')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setClassification(classData);
    } catch (error) {
      console.error('Failed to load ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDraft = async () => {
    if (!ticket || !profile) return;

    setGeneratingDraft(true);
    try {
      const result = await draftReply(
        ticket.subject,
        ticket.body,
        ticket.category || 'other',
        ticket.language
      );

      setReplyText(result.reply);
    } catch (error) {
      console.error('Failed to generate draft:', error);
    } finally {
      setGeneratingDraft(false);
    }
  };

  const handleSendReply = async () => {
    if (!ticket || !profile || !replyText.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase.from('ticket_replies').insert({
        ticket_id: ticket.id,
        author_id: profile.id,
        body: replyText,
        is_internal: false,
      });

      if (error) throw error;

      const now = new Date().toISOString();
      if (!ticket.first_response_at) {
        await supabase
          .from('tickets')
          .update({ first_response_at: now, status: 'in_progress' })
          .eq('id', ticket.id);
      }

      await createAuditLog(profile.id, 'reply_sent', { body: replyText }, ticket.id);

      setReplyText('');
      loadTicket();
    } catch (error) {
      console.error('Failed to send reply:', error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!ticket) {
    return <div className="p-8 text-center">Ticket not found</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link
          href="/inbox"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Inbox
        </Link>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">{ticket.subject}</h1>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span>{ticket.requester_email}</span>
                <span>•</span>
                <span>{new Date(ticket.created_at).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                {ticket.status}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                {ticket.priority}
              </span>
            </div>
          </div>

          <div className="prose max-w-none mb-6">
            <p className="text-slate-700 whitespace-pre-wrap">{ticket.body}</p>
          </div>

          {classification && (
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-2">AI Classification</h3>
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-slate-600">Category:</span>{' '}
                  <span className="font-medium">{classification.label}</span>
                </p>
                <p>
                  <span className="text-slate-600">Confidence:</span>{' '}
                  <span className="font-medium">{(classification.confidence * 100).toFixed(1)}%</span>
                </p>
                {classification.rationale && (
                  <p className="text-slate-600 italic">{classification.rationale}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {replies.length > 0 && (
          <div className="mb-6 space-y-4">
            {replies.map(reply => (
              <div key={reply.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-600">
                    {new Date(reply.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-slate-700 whitespace-pre-wrap">{reply.body}</p>
              </div>
            ))}
          </div>
        )}

        {profile && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Reply</h3>

            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              rows={6}
              placeholder="Type your response..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={handleSendReply}
                disabled={sending || !replyText.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {sending ? 'Sending...' : 'Send Reply'}
              </button>

              <button
                onClick={handleGenerateDraft}
                disabled={generatingDraft}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                {generatingDraft ? 'Generating...' : 'AI Draft'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
