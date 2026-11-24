import superjson from "superjson";

export type EmailEventOption = { id: string; title: string; startsAt: Date; all: number; approved: number };
export type EmailCampaignRow = {
  id: string;
  subject: string;
  /** Additive: the message text, for the Sent list. */
  message?: string;
  audienceLabel: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  error: string | null;
  createdAt: Date;
};
export type OutputType = {
  sendingReady: boolean;
  canSend: boolean;
  customers: number;
  events: EmailEventOption[];
  campaigns: EmailCampaignRow[];
};

export const getEmailOverview = async (init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/email/overview`, {
    method: "GET",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};
