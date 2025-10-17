import { useState } from 'react';
import { useTickets } from '../hooks/useTickets';
import { useAuth } from '../contexts/AuthContext';
import { Filter, Clock, AlertTriangle } from 'lucide-react';
import { TicketCard } from '../components/TicketCard';

export function Inbox() {
  const { profile } = useAuth();
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
  });

  const { tickets, loading } = useTickets(filters);

  if (!profile) {
    return <div>Please log in</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Inbox</h1>
          <p className="text-slate-600">Manage and respond to support tickets</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={filters.status}
              onChange={e => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="waiting">Waiting</option>
              <option value="resolved">Resolved</option>
            </select>

            <select
              value={filters.priority}
              onChange={e => setFilters({ ...filters, priority: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={filters.category}
              onChange={e => setFilters({ ...filters, category: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">All Categories</option>
              <option value="billing">Billing</option>
              <option value="bug">Bug</option>
              <option value="feature_request">Feature Request</option>
              <option value="abuse_report">Abuse Report</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Clock className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No tickets found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map(ticket => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
