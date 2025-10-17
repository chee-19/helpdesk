import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Database } from '../lib/database.types';
import { evaluateRoutingRules, simulateRouting } from '../lib/routing';
import { Settings, PlayCircle, Plus } from 'lucide-react';

type RoutingRule = Database['public']['Tables']['routing_rules']['Row'];
type Queue = Database['public']['Tables']['queues']['Row'];

export function Admin() {
  const { profile } = useAuth();
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [simulatorInput, setSimulatorInput] = useState({
    category: 'bug',
    priority: 'high',
    subject: 'Test ticket',
  });
  const [simulatorResult, setSimulatorResult] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: rulesData } = await supabase
      .from('routing_rules')
      .select('*')
      .order('priority', { ascending: false });

    const { data: queuesData } = await supabase.from('queues').select('*');

    setRules(rulesData || []);
    setQueues(queuesData || []);
  };

  const runSimulator = () => {
    const result = simulateRouting(simulatorInput, rules);
    setSimulatorResult(result);
  };

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Admin Panel</h1>
          <p className="text-slate-600">Manage system configuration</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-slate-700" />
              <h2 className="text-xl font-semibold text-slate-900">Routing Rules</h2>
            </div>

            <div className="space-y-3">
              {rules.map(rule => (
                <div
                  key={rule.id}
                  className="p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-slate-900">{rule.name}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        rule.enabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">Priority: {rule.priority}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <PlayCircle className="w-5 h-5 text-slate-700" />
              <h2 className="text-xl font-semibold text-slate-900">Rule Simulator</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                <select
                  value={simulatorInput.category}
                  onChange={e =>
                    setSimulatorInput({ ...simulatorInput, category: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="billing">Billing</option>
                  <option value="bug">Bug</option>
                  <option value="feature_request">Feature Request</option>
                  <option value="abuse_report">Abuse Report</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
                <select
                  value={simulatorInput.priority}
                  onChange={e =>
                    setSimulatorInput({ ...simulatorInput, priority: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <button
                onClick={runSimulator}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition"
              >
                <PlayCircle className="w-4 h-4" />
                Run Simulation
              </button>

              {simulatorResult && (
                <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <h3 className="font-medium text-slate-900 mb-2">Results</h3>
                  <div className="text-sm space-y-2">
                    {simulatorResult.queueId && (
                      <p>
                        <span className="text-slate-600">Queue:</span>{' '}
                        <span className="font-medium">{simulatorResult.queueId}</span>
                      </p>
                    )}
                    {simulatorResult.priority && (
                      <p>
                        <span className="text-slate-600">Priority:</span>{' '}
                        <span className="font-medium">{simulatorResult.priority}</span>
                      </p>
                    )}
                    <p className="text-slate-600">
                      Matched {simulatorResult.matchedRules.length} rule(s)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="w-5 h-5 text-slate-700" />
            <h2 className="text-xl font-semibold text-slate-900">Queues</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {queues.map(queue => (
              <div
                key={queue.id}
                className="p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition"
              >
                <h3 className="font-medium text-slate-900 mb-1">{queue.name}</h3>
                {queue.team && <p className="text-sm text-slate-600">Team: {queue.team}</p>}
                {queue.description && (
                  <p className="text-sm text-slate-500 mt-2">{queue.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
