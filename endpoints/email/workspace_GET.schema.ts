import superjson from "superjson";
import type { AutomationTrigger } from "../../helpers/emailAutomations";

export type Person = { email: string; name: string };

export type OutputType = {
  drafts: Array<{ id: string; subject: string; message: string; recipients: unknown; look: unknown; updatedAt: Date }>;
  templates: Array<{ id: string; name: string; subject: string; message: string; look: unknown; updatedAt: Date }>;
  automations: Array<{ trigger: AutomationTrigger; enabled: boolean; subject: string; message: string }>;
  contacts: Array<{ id: string; email: string; name: string; phone: string | null; note: string | null; source: string; unsubscribed: boolean; bounced: boolean }>;
  people: {
    customers: Person[];
    participants: Array<Person & { event: string; status: string }>;
  };
  inbox: Array<{ id: string; fromEmail: string; fromName: string; subject: string; body: string; isRead: boolean; receivedAt: Date }>;
  unread: number;
  /** The address replies arrive at, once receiving is switched on for the app. */
  inboxAddress: string | null;
};

export const getEmailWorkspace = async (init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/email/workspace`, {
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
