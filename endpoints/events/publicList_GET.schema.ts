import superjson from "superjson";

export type PublicEventItem = {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverImageUrl: string | null;
  startsAt: Date | string;
  endsAt: Date | string | null;
  venue: string | null;
  registrationEnabled: boolean;
  registrationClosesAt: Date | string | null;
  capacity: number | null;
  registrationCount?: number;
};
export type OutputType = { events: PublicEventItem[] };

export const getPublicEvents = async (slug: string, init?: RequestInit): Promise<OutputType> => {
  const r = await fetch(`/_api/events/publicList?slug=${encodeURIComponent(slug)}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!r.ok) {
    const e = superjson.parse<{ error: string }>(await r.text());
    throw new Error(e.error);
  }
  return superjson.parse<OutputType>(await r.text());
};
