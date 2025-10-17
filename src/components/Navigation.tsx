import { useAuth } from '../contexts/AuthContext';
import { Link } from './Link';
import { Inbox, BarChart3, Settings, LogOut, Send } from 'lucide-react';

export function Navigation() {
  const { profile, signOut } = useAuth();

  if (!profile) return null;

  return (
    <nav className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/inbox" className="text-xl font-bold text-slate-900">
              Helpdesk Triage
            </Link>

            <div className="flex items-center gap-1">
              <Link
                href="/inbox"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition"
              >
                <Inbox className="w-4 h-4" />
                Inbox
              </Link>

              <Link
                href="/metrics"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition"
              >
                <BarChart3 className="w-4 h-4" />
                Metrics
              </Link>

              {profile.role === 'admin' && (
                <Link
                  href="/admin"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition"
                >
                  <Settings className="w-4 h-4" />
                  Admin
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/submit"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition"
            >
              <Send className="w-4 h-4" />
              Submit
            </Link>

            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="text-sm">
                <div className="font-medium text-slate-900">{profile.email}</div>
                <div className="text-xs text-slate-500 capitalize">{profile.role}</div>
              </div>

              <button
                onClick={() => signOut()}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
