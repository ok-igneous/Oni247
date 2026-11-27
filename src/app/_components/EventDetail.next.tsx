"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarPlus, Check, Clock, Download, MapPin, Share2, Ticket, Users } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../components/Dialog";
import { Badge } from "../../../components/Badge";
import { Button } from "../../../components/Button";
import { Input } from "../../../components/Input";
import { Progress } from "../../../components/Progress";
import { Spinner } from "../../../components/Spinner";
import { Textarea } from "../../../components/Textarea";
import { EngagementSection } from "../../../components/EngagementSection";
import { EventDateBadge } from "../../../components/EventDateBadge";
import { StorefrontHeaderNext } from "./StorefrontHeader.next";
import { storeThemeEngine } from "../../../helpers/storeThemeEngine";
import { friendlyError } from "../../../helpers/friendlyError";
import { eventTimeState, formatEventRange, registrationInfo, startsInText } from "../../../helpers/eventStatus";
import type { OutputType as EventData } from "../../../endpoints/events/public_GET.schema";
import type { PublicEventItem } from "../../../endpoints/events/publicList_GET.schema";
import { postSubmitEvent } from "../../../endpoints/events/submit_POST.schema";
import styles from "../../../pages/store.$slug.e.$eventSlug.module.css";

const calendarStamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const icsText = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

type Props = { data: EventData; eventSlug: string; others: PublicEventItem[]; customDomain: boolean; origin: string };
export default function PublicEventNext({ data, eventSlug, others, customDomain, origin }: Props) {
  const slug = data.business.slug;
  const path = (suffix: string) => customDomain ? (suffix || "/") : `/${encodeURIComponent(slug)}${suffix}`;
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [regOpen, setRegOpen] = useState(false);

  const event = data.event;
  const calendar = useMemo(() => {
    if (!event) return null;
    const start = new Date(event.startsAt);
    const end = event.endsAt ? new Date(event.endsAt) : new Date(start.getTime() + 60 * 60 * 1000);
    const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${calendarStamp(start)}/${calendarStamp(end)}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.venue ?? "")}`;
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Oni247//Events//EN",
      "BEGIN:VEVENT",
      `UID:${event.id}@oni247`,
      `DTSTAMP:${calendarStamp(start)}`,
      `DTSTART:${calendarStamp(start)}`,
      `DTEND:${calendarStamp(end)}`,
      `SUMMARY:${icsText(event.title)}`,
      `DESCRIPTION:${icsText(event.description)}`,
      `LOCATION:${icsText(event.venue ?? "")}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    return { google, icsHref: `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}` };
  }, [event]);

  const submit = async () => {
    setBusy(true);
    setFormError("");
    try {
      const result = await postSubmitEvent({ slug, eventSlug, answers });
      setMessage(result.message ?? data.form?.successMessage ?? "Your registration was received.");
    } catch (err) {
      setFormError(friendlyError(err, "Could not send your registration. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const appearance = data.business.appearanceSettings ?? {};
  const theme = storeThemeEngine("clean", appearance);
  const state = eventTimeState(event);
  const reg = registrationInfo(event, data.registrationCount);
  const homePage = typeof appearance.homePage === "string" ? appearance.homePage : "home";
  const home = homePage === "home" ? path("") : path(`/${homePage}`);
  const footerMode = appearance.footerMode === "none" || appearance.footerMode === "selected" ? appearance.footerMode : "all";
  const footerPages = Array.isArray(appearance.footerPages) ? (appearance.footerPages as string[]) : [];
  const showFooter = footerMode === "all" || (footerMode === "selected" && footerPages.includes("event-detail"));
  const url = new URL(`/_api/share/page?slug=${encodeURIComponent(slug)}&kind=event&id=${encodeURIComponent(event.slug)}`, origin).toString();
  const fillPercent =
    event.capacity !== null && event.capacity > 0
      ? Math.min(100, Math.round((data.registrationCount / event.capacity) * 100))
      : 0;
  const upcomingOthers = others.filter((item) => item.slug !== event.slug && eventTimeState(item) !== "past").slice(0, 3);

  const share = () => {
    if (navigator.share) void navigator.share({ title: event.title, url }).catch(() => {});
    else
      void navigator.clipboard
        .writeText(url)
        .then(() => toast.success("Event link copied."))
        .catch(() => toast.error("Could not copy the link."));
  };

  const missing = data.form?.fields.find(
    (field) =>
      field.required &&
      (answers[field.id] === undefined || answers[field.id] === null || String(answers[field.id]).trim() === "" || answers[field.id] === false),
  );

  return (
    <main className={styles.page} style={{ ...theme.style, "--brand": "var(--store-primary)" } as React.CSSProperties}>


      <StorefrontHeaderNext
        businessName={data.business.name}
        logoUrl={data.business.logoUrl}
        navItems={[
          { label: "Home", href: home },
          { label: "Events", href: path("/events"), active: true },
          { label: "Contact", href: path("/contact") },
        ]}
        menuStyle="bar"
        menuPosition="left"
      />

      <div className={styles.shell}>
        <header className={styles.header}>
          <EventDateBadge date={event.startsAt} muted={state === "past"} />
          <div>
            <div className={styles.badges}>
              <Badge variant={state === "past" ? "secondary" : "success"}>{startsInText(event)}</Badge>
              {state !== "past" && reg.state === "full" && <Badge variant="destructive">Fully booked</Badge>}
              {state !== "past" && reg.state === "open" && reg.spotsLeft !== null && reg.spotsLeft <= 10 && (
                <Badge variant="warning">{reg.spotsLeft} {reg.spotsLeft === 1 ? "spot" : "spots"} left</Badge>
              )}
            </div>
            <h1 className={styles.title}>{event.title}</h1>
          </div>
        </header>

        {event.coverImageUrl && (
          <div className={styles.hero}>
            <img src={event.coverImageUrl} alt={`${event.title} event poster`} className={styles.cover} />
          </div>
        )}

        <div className={styles.layout}>
          <div className={styles.main}>
            <ul className={styles.facts}>
              <li>
                <Clock size={18} aria-hidden="true" />
                <span>
                  <strong>When</strong>
                  {formatEventRange(event.startsAt, event.endsAt)}
                </span>
              </li>
              {event.venue && (
                <li>
                  <MapPin size={18} aria-hidden="true" />
                  <span>
                    <strong>Where</strong>
                    {event.venue}
                    {!/^https?:\/\//i.test(event.venue) && (
                      <>
                        {" · "}
                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue)}`} target="_blank" rel="noopener noreferrer">
                          Open in Maps
                        </a>
                      </>
                    )}
                  </span>
                </li>
              )}
              {event.capacity !== null && (
                <li>
                  <Users size={18} aria-hidden="true" />
                  <span>
                    <strong>Attendance</strong>
                    {data.registrationCount} of {event.capacity} places taken
                  </span>
                </li>
              )}
              {event.registrationEnabled && event.registrationClosesAt && state === "upcoming" && (
                <li>
                  <CalendarPlus size={18} aria-hidden="true" />
                  <span>
                    <strong>Register by</strong>
                    {new Date(event.registrationClosesAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </li>
              )}
            </ul>

            {state !== "past" && (
              <div className={styles.actions}>
                {data.form && event.registrationEnabled && reg.state === "open" && !message && (
                  <Button size="sm" onClick={() => setRegOpen(true)}><Ticket size={15} /> Register</Button>
                )}
                <Button asChild variant="outline" size="sm">
                  <a href={calendar.google} target="_blank" rel="noopener noreferrer"><CalendarPlus size={15} /> Google Calendar</a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={calendar.icsHref} download={`${event.slug}.ics`}><Download size={15} /> Apple / Outlook</a>
                </Button>
              </div>
            )}
            {state !== "past" && event.registrationEnabled && reg.state !== "open" && (
              <p className={styles.notice}>{reg.state === "full" ? "This event is fully booked." : "Registration is closed."}</p>
            )}

            <h2 className={styles.sectionTitle}>About this event</h2>
            <p className={styles.description}>{event.description}</p>

            <div className={styles.shareRow}>
              <span>Share this event</span>
              <Button variant="outline" size="sm" onClick={share}><Share2 size={15} /> Share</Button>
            </div>

            <EngagementSection slug={slug} targetType="event" targetId={event.id} contextTitle={event.title} />
          </div>

          {data.form && event.registrationEnabled && (
            <Dialog open={regOpen} onOpenChange={setRegOpen}>
              <DialogContent className={styles.regDialog}>
                <DialogHeader>
                  <DialogTitle>{data.form.title}</DialogTitle>
                  <DialogDescription>{data.form.description || `Register for ${event.title}.`}</DialogDescription>
                </DialogHeader>
              <section className={styles.card}>

                {event.capacity !== null && state !== "past" && (
                  <div className={styles.meter}>
                    <Progress value={fillPercent} aria-label="How full the event is" />
                    <span className={styles.muted}>
                      {reg.spotsLeft === 0 ? "No places left" : `${reg.spotsLeft} of ${event.capacity} places left`}
                    </span>
                  </div>
                )}

                {message ? (
                  <div className={styles.success} role="status">
                    <Check size={20} aria-hidden="true" />
                    <p>{message}</p>
                  </div>
                ) : reg.state === "full" ? (
                  <p className={styles.notice}>This event is fully booked.</p>
                ) : reg.state !== "open" ? (
                  <p className={styles.notice}>Registration is closed.</p>
                ) : (
                  <form
                    className={styles.form}
                    onSubmit={(submitEvent) => {
                      submitEvent.preventDefault();
                      void submit();
                    }}
                  >
                    {data.form.fields.map((field) => (
                      <label key={field.id} className={styles.field}>
                        <span>
                          {field.label}
                          {field.required && <span aria-hidden="true"> *</span>}
                        </span>
                        {field.type === "textarea" ? (
                          <Textarea rows={3} required={field.required} value={String(answers[field.id] ?? "")} onChange={(e) => setAnswers((a) => ({ ...a, [field.id]: e.target.value }))} />
                        ) : field.type === "select" ? (
                          <select required={field.required} value={String(answers[field.id] ?? "")} onChange={(e) => setAnswers((a) => ({ ...a, [field.id]: e.target.value }))}>
                            <option value="">Choose…</option>
                            {(field.options ?? []).map((option) => (<option key={option}>{option}</option>))}
                          </select>
                        ) : field.type === "checkbox" ? (
                          <input type="checkbox" checked={answers[field.id] === true} onChange={(e) => setAnswers((a) => ({ ...a, [field.id]: e.target.checked }))} />
                        ) : (
                          <Input type={field.type === "phone" ? "tel" : field.type} required={field.required} value={String(answers[field.id] ?? "")} onChange={(e) => setAnswers((a) => ({ ...a, [field.id]: e.target.value }))} />
                        )}
                      </label>
                    ))}
                    {formError && <p className={styles.error} role="alert">{formError}</p>}
                    <Button type="submit" size="lg" disabled={busy || Boolean(missing)}>
                      {busy ? <Spinner size="sm" /> : null}
                      {busy ? "Sending…" : data.form.submitLabel}
                    </Button>
                  </form>
                )}
              </section>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {upcomingOthers.length > 0 && (
          <section className={styles.more}>
            <h2 className={styles.sectionTitle}>More events</h2>
            <ul className={styles.moreList}>
              {upcomingOthers.map((item) => (
                <li key={item.id}>
                  <Link href={path(`/e/${item.slug}`)}>
                    <EventDateBadge date={item.startsAt} />
                    <span><strong>{item.title}</strong><small>{formatEventRange(item.startsAt, item.endsAt)}</small></span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href={path("/events")} className={styles.allLink}>See all events →</Link>
          </section>
        )}
      </div>

      {showFooter && <footer className={styles.footer}>© {new Date().getFullYear()} {data.business.name}</footer>}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "Event", name: event.title, description: event.description, startDate: event.startsAt, endDate: event.endsAt || undefined, location: event.venue ? { "@type": "Place", name: event.venue } : undefined, image: event.coverImageUrl ? [event.coverImageUrl] : undefined, organizer: { "@type": "Organization", name: data.business.name }, url: new URL(path(`/e/${encodeURIComponent(event.slug)}`), origin).toString() }).replace(/</g, "\\u003c") }} />
      {data.form && event.registrationEnabled && state !== "past" && reg.state === "open" && !message && (
        <button type="button" className={styles.floatingRegister} onClick={() => setRegOpen(true)}>
          <Ticket size={18} aria-hidden="true" /> Register
        </button>
      )}
    </main>
  );
}
