type When = Date | string | null | undefined;

export type EventTiming = {
  startsAt: Date | string;
  endsAt: When;
  registrationEnabled: boolean;
  registrationClosesAt: When;
  capacity: number | null;
};

const MS_HOUR = 3_600_000;

export const eventTimeState = (event: Pick<EventTiming, "startsAt" | "endsAt">, now = new Date()): "upcoming" | "live" | "past" => {
  const start = new Date(event.startsAt).getTime();
  const end = event.endsAt ? new Date(event.endsAt).getTime() : start + 3 * MS_HOUR;
  if (now.getTime() < start) return "upcoming";
  if (now.getTime() <= end) return "live";
  return "past";
};

export type RegistrationInfo = {
  state: "off" | "open" | "closed" | "full";
  spotsLeft: number | null;
};

/** Same rules the registration endpoint applies, so the page never offers a form that will be refused. */
export const registrationInfo = (event: EventTiming, count: number, now = new Date()): RegistrationInfo => {
  const spotsLeft = event.capacity === null ? null : Math.max(0, event.capacity - count);
  if (!event.registrationEnabled) return { state: "off", spotsLeft };
  if (new Date(event.startsAt) <= now) return { state: "closed", spotsLeft };
  if (event.registrationClosesAt && new Date(event.registrationClosesAt) <= now) return { state: "closed", spotsLeft };
  if (spotsLeft === 0) return { state: "full", spotsLeft };
  return { state: "open", spotsLeft };
};

/** "Starts in 3 days", "Starts today at 5:00 PM", "Happening now". */
export const startsInText = (event: Pick<EventTiming, "startsAt" | "endsAt">, now = new Date()): string => {
  const state = eventTimeState(event, now);
  if (state === "live") return "Happening now";
  if (state === "past") return "This event has ended";
  const start = new Date(event.startsAt);
  const hours = (start.getTime() - now.getTime()) / MS_HOUR;
  if (hours < 1) return `Starts in ${Math.max(1, Math.round(hours * 60))} minutes`;
  if (hours < 24 && start.getDate() === now.getDate()) {
    return `Starts today at ${start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  }
  const days = Math.ceil(hours / 24);
  if (days === 1) return "Starts tomorrow";
  if (days < 14) return `Starts in ${days} days`;
  return `Starts in ${Math.round(days / 7)} weeks`;
};

export const formatEventRange = (startsAt: Date | string, endsAt: When): string => {
  const start = new Date(startsAt);
  const day = (date: Date) => date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const time = (date: Date) => date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (!endsAt) return `${day(start)}, ${time(start)}`;
  const end = new Date(endsAt);
  if (start.toDateString() === end.toDateString()) return `${day(start)}, ${time(start)} – ${time(end)}`;
  return `${day(start)}, ${time(start)} → ${day(end)}, ${time(end)}`;
};
