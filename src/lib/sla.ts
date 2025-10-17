import { Database } from './database.types';

type SLAPolicy = Database['public']['Tables']['sla_policies']['Row'];
type BusinessHours = Database['public']['Tables']['business_hours']['Row'];

interface SLAStatus {
  firstResponseDue: Date | null;
  resolutionDue: Date | null;
  firstResponseBreached: boolean;
  resolutionBreached: boolean;
  minutesUntilFirstResponseBreach: number | null;
  minutesUntilResolutionBreach: number | null;
}

export function calculateSLAStatus(
  ticketCreatedAt: string,
  slaPolicy: SLAPolicy | null,
  businessHours: BusinessHours | null,
  firstResponseAt: string | null,
  resolvedAt: string | null
): SLAStatus {
  if (!slaPolicy) {
    return {
      firstResponseDue: null,
      resolutionDue: null,
      firstResponseBreached: false,
      resolutionBreached: false,
      minutesUntilFirstResponseBreach: null,
      minutesUntilResolutionBreach: null,
    };
  }

  const createdDate = new Date(ticketCreatedAt);
  const now = new Date();

  const firstResponseDue = addBusinessMinutes(
    createdDate,
    slaPolicy.first_response_minutes,
    businessHours
  );

  const resolutionDue = addBusinessMinutes(
    createdDate,
    slaPolicy.resolve_minutes,
    businessHours
  );

  const firstResponseBreached = !firstResponseAt && now > firstResponseDue;
  const resolutionBreached = !resolvedAt && now > resolutionDue;

  const minutesUntilFirstResponseBreach = firstResponseAt
    ? null
    : Math.floor((firstResponseDue.getTime() - now.getTime()) / 60000);

  const minutesUntilResolutionBreach = resolvedAt
    ? null
    : Math.floor((resolutionDue.getTime() - now.getTime()) / 60000);

  return {
    firstResponseDue,
    resolutionDue,
    firstResponseBreached,
    resolutionBreached,
    minutesUntilFirstResponseBreach,
    minutesUntilResolutionBreach,
  };
}

function addBusinessMinutes(
  startDate: Date,
  minutes: number,
  businessHours: BusinessHours | null
): Date {
  if (!businessHours) {
    return new Date(startDate.getTime() + minutes * 60000);
  }

  const schedule = businessHours.schedule as Record<string, { start: string; end: string }>;
  let remainingMinutes = minutes;
  let currentDate = new Date(startDate);

  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  while (remainingMinutes > 0) {
    const dayName = dayNames[currentDate.getDay()];
    const daySchedule = schedule[dayName];

    if (!daySchedule) {
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(0, 0, 0, 0);
      continue;
    }

    const [startHour, startMinute] = daySchedule.start.split(':').map(Number);
    const [endHour, endMinute] = daySchedule.end.split(':').map(Number);

    const dayStart = new Date(currentDate);
    dayStart.setHours(startHour, startMinute, 0, 0);

    const dayEnd = new Date(currentDate);
    dayEnd.setHours(endHour, endMinute, 0, 0);

    if (currentDate < dayStart) {
      currentDate = dayStart;
    }

    if (currentDate >= dayEnd) {
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(0, 0, 0, 0);
      continue;
    }

    const minutesLeftInDay = Math.floor((dayEnd.getTime() - currentDate.getTime()) / 60000);
    const minutesToAdd = Math.min(remainingMinutes, minutesLeftInDay);

    currentDate = new Date(currentDate.getTime() + minutesToAdd * 60000);
    remainingMinutes -= minutesToAdd;

    if (remainingMinutes > 0) {
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(0, 0, 0, 0);
    }
  }

  return currentDate;
}

export function getSLABadgeColor(minutesUntilBreach: number | null): string {
  if (minutesUntilBreach === null) return 'gray';
  if (minutesUntilBreach < 0) return 'red';
  if (minutesUntilBreach < 60) return 'orange';
  if (minutesUntilBreach < 240) return 'yellow';
  return 'green';
}
