import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type Ticket = Database['public']['Tables']['tickets']['Row'];

interface UseTicketsOptions {
  status?: string;
  priority?: string;
  category?: string;
  queueId?: string;
  assigneeId?: string;
}

export function useTickets(options: UseTicketsOptions = {}) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchTickets();

    const channel = supabase
      .channel('tickets-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [options.status, options.priority, options.category, options.queueId, options.assigneeId]);

  async function fetchTickets() {
    try {
      setLoading(true);
      let query = supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (options.status) {
        query = query.eq('status', options.status);
      }
      if (options.priority) {
        query = query.eq('priority', options.priority);
      }
      if (options.category) {
        query = query.eq('category', options.category);
      }
      if (options.queueId) {
        query = query.eq('queue_id', options.queueId);
      }
      if (options.assigneeId) {
        query = query.eq('assignee_id', options.assigneeId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTickets(data || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }

  return { tickets, loading, error, refetch: fetchTickets };
}
