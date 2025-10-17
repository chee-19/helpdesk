import { Database } from './database.types';

type RoutingRule = Database['public']['Tables']['routing_rules']['Row'];
type Ticket = Database['public']['Tables']['tickets']['Row'];

interface RuleCondition {
  field: string;
  operator: 'equals' | 'contains' | 'in' | 'greaterThan' | 'lessThan';
  value: unknown;
}

interface RuleAction {
  type: 'assign_queue' | 'assign_user' | 'set_priority' | 'add_tag';
  value: unknown;
}

interface Rule {
  conditions: RuleCondition[];
  actions: RuleAction[];
  matchAll?: boolean;
}

interface RoutingResult {
  queueId?: string;
  assigneeId?: string;
  priority?: string;
  matchedRules: Array<{ ruleId: string; ruleName: string }>;
}

export function evaluateRoutingRules(
  ticket: Partial<Ticket>,
  rules: RoutingRule[]
): RoutingResult {
  const result: RoutingResult = {
    matchedRules: [],
  };

  const sortedRules = [...rules]
    .filter(rule => rule.enabled)
    .sort((a, b) => b.priority - a.priority);

  for (const rule of sortedRules) {
    const ruleDefinition = rule.rule_json as Rule;

    if (evaluateConditions(ticket, ruleDefinition.conditions, ruleDefinition.matchAll)) {
      result.matchedRules.push({
        ruleId: rule.id,
        ruleName: rule.name,
      });

      for (const action of ruleDefinition.actions) {
        applyAction(result, action);
      }
    }
  }

  return result;
}

function evaluateConditions(
  ticket: Partial<Ticket>,
  conditions: RuleCondition[],
  matchAll: boolean = true
): boolean {
  if (conditions.length === 0) return false;

  const results = conditions.map(condition => evaluateCondition(ticket, condition));

  return matchAll ? results.every(r => r) : results.some(r => r);
}

function evaluateCondition(ticket: Partial<Ticket>, condition: RuleCondition): boolean {
  const fieldValue = (ticket as Record<string, unknown>)[condition.field];

  switch (condition.operator) {
    case 'equals':
      return fieldValue === condition.value;

    case 'contains':
      if (typeof fieldValue === 'string' && typeof condition.value === 'string') {
        return fieldValue.toLowerCase().includes(condition.value.toLowerCase());
      }
      return false;

    case 'in':
      if (Array.isArray(condition.value)) {
        return condition.value.includes(fieldValue);
      }
      return false;

    case 'greaterThan':
      if (typeof fieldValue === 'number' && typeof condition.value === 'number') {
        return fieldValue > condition.value;
      }
      return false;

    case 'lessThan':
      if (typeof fieldValue === 'number' && typeof condition.value === 'number') {
        return fieldValue < condition.value;
      }
      return false;

    default:
      return false;
  }
}

function applyAction(result: RoutingResult, action: RuleAction): void {
  switch (action.type) {
    case 'assign_queue':
      if (!result.queueId && typeof action.value === 'string') {
        result.queueId = action.value;
      }
      break;

    case 'assign_user':
      if (!result.assigneeId && typeof action.value === 'string') {
        result.assigneeId = action.value;
      }
      break;

    case 'set_priority':
      if (!result.priority && typeof action.value === 'string') {
        result.priority = action.value;
      }
      break;
  }
}

export function simulateRouting(
  ticketData: Partial<Ticket>,
  rules: RoutingRule[]
): RoutingResult {
  return evaluateRoutingRules(ticketData, rules);
}
