import { Database } from '../lib/database.types';
import { Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { Link } from '../components/Link';

type Ticket = Database['public']['Tables']['tickets']['Row'];

interface TicketCardProps {
  ticket: Ticket;
}

const priorityColors = {
  urgent: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-green-100 text-green-800 border-green-200',
};

const statusIcons = {
  new: AlertCircle,
  assigned: Clock,
  in_progress: Clock,
  waiting: Clock,
  resolved: CheckCircle,
  closed: CheckCircle,
};

export function TicketCard({ ticket }: TicketCardProps) {
  const StatusIcon = statusIcons[ticket.status];

  return (
    <Link
      href={`/ticket/${ticket.id}`}
      className="block bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-slate-300 transition"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <StatusIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <h3 className="font-semibold text-slate-900 truncate">{ticket.subject}</h3>
          </div>

          <p className="text-sm text-slate-600 mb-3 line-clamp-2">{ticket.body}</p>

          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span>{ticket.requester_email}</span>
            <span>•</span>
            <span>{new Date(ticket.created_at).toLocaleString()}</span>
            {ticket.language && ticket.language !== 'en' && (
              <>
                <span>•</span>
                <span className="uppercase">{ticket.language}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium border ${
              priorityColors[ticket.priority]
            }`}
          >
            {ticket.priority}
          </span>

          {ticket.category && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
              {ticket.category.replace('_', ' ')}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
