/**
 * Automatic emails and starter templates. Pure data, shared by the dashboard
 * and the backend. In subjects and messages, [name] becomes the person's first
 * name, [business] your business name, [order] the order code and [event] the
 * event title.
 */
export type AutomationTrigger = "order_received" | "registration_received" | "registration_approved" | "registration_declined" | "booking_received" | "booking_confirmed";

export type AutomationDef = {
  trigger: AutomationTrigger;
  label: string;
  when: string;
  tokens: string[];
  subject: string;
  message: string;
};

export const AUTOMATIONS: AutomationDef[] = [
  {
    trigger: "booking_received",
    label: "Service booking received",
    when: "Sent when a customer books or requests a service and gave an email address.",
    tokens: ["[name]", "[service]", "[order]", "[business]"],
    subject: "We received your booking for [service]",
    message: "Hi [name], thank you for booking [service].\n\nWe have received your request. Your booking code is [order]. We will confirm the details with you shortly.\n\n[business]",
  },
  {
    trigger: "booking_confirmed",
    label: "Service booking confirmed",
    when: "Sent when a booking is paid online or when you confirm it.",
    tokens: ["[name]", "[service]", "[order]", "[business]"],
    subject: "Your booking for [service] is confirmed",
    message: "Hi [name], your booking for [service] is confirmed. Your booking code is [order].\n\nWe look forward to serving you.\n\n[business]",
  },
  {
    trigger: "order_received",
    label: "Order received",
    when: "Sent to the customer right after they place an order, if they gave an email address.",
    tokens: ["[name]", "[order]", "[business]"],
    subject: "We received your order [order]",
    message: "Thank you for your order, [name].\n\nWe have received it and will be in touch shortly to confirm. Your order code is [order]. Keep it so you can track your order at any time.\n\nThank you for choosing [business].",
  },
  {
    trigger: "registration_received",
    label: "Event registration received",
    when: "Sent when someone registers for an event and gave an email address.",
    tokens: ["[name]", "[event]", "[business]"],
    subject: "We received your registration for [event]",
    message: "Hi [name], thank you for registering for [event].\n\nWe have received your details. We will email you again if there is anything you need to know before the event.\n\n[business]",
  },
  {
    trigger: "registration_approved",
    label: "Registration approved",
    when: "Sent when you approve someone's registration for an event.",
    tokens: ["[name]", "[event]", "[business]"],
    subject: "You're in: [event]",
    message: "Good news, [name]. Your registration for [event] has been approved.\n\nWe look forward to seeing you.\n\n[business]",
  },
  {
    trigger: "registration_declined",
    label: "Registration declined",
    when: "Sent when you decline someone's registration for an event.",
    tokens: ["[name]", "[event]", "[business]"],
    subject: "About your registration for [event]",
    message: "Hi [name], thank you for your interest in [event].\n\nUnfortunately we are not able to confirm your place this time. We hope to see you at a future event.\n\n[business]",
  },
];

export const automationDef = (trigger: string): AutomationDef | undefined => AUTOMATIONS.find((a) => a.trigger === trigger);

export type StarterTemplate = { id: string; name: string; subject: string; message: string };

export const STARTER_TEMPLATES: StarterTemplate[] = [
  { id: "welcome", name: "Welcome", subject: "Welcome to [business]", message: "Hi [name],\n\nThank you for joining us at [business]. We are glad to have you.\n\nTake a look around and tell us if there is anything we can help with." },
  { id: "promo", name: "Sale or promotion", subject: "A special offer from [business]", message: "Hi [name],\n\nFor a limited time we have a special offer for you at [business].\n\nTell us what you need and we will take care of it. This offer ends soon, so do not wait too long." },
  { id: "arrivals", name: "New arrivals", subject: "New at [business]", message: "Hi [name],\n\nWe have just added new items at [business]. Come and see what is new.\n\nOrder on our website or message us on WhatsApp and we will help you right away." },
  { id: "event_invite", name: "Event invitation", subject: "You are invited", message: "Hi [name],\n\nWe would love to see you at our next event.\n\nDate and time:\nPlace:\n\nRegister on our website to reserve your place." },
  { id: "event_reminder", name: "Event reminder", subject: "Reminder: our event is coming up", message: "Hi [name],\n\nThis is a friendly reminder about our event.\n\nDate and time:\nPlace:\n\nWe look forward to seeing you." },
  { id: "thanks", name: "Thank you", subject: "Thank you from [business]", message: "Hi [name],\n\nThank you for your support. It means a lot to us at [business].\n\nWe hope to serve you again soon." },
  { id: "feedback", name: "Ask for feedback", subject: "How did we do?", message: "Hi [name],\n\nWe would love to hear how your experience with [business] was. Reply to this email and tell us what we did well and what we can do better." },
  { id: "update", name: "Business update", subject: "News from [business]", message: "Hi [name],\n\nWe have some news to share.\n\n" },
];

/** Replaces the [tokens] in a subject or message. Unknown tokens are left alone. */
export const fillTokens = (text: string, vars: Partial<Record<"name" | "business" | "order" | "event" | "service", string>>) =>
  text.replace(/\[(name|business|order|event|service)\]/gi, (all, key: string) => vars[key.toLowerCase() as "name"] ?? all);
