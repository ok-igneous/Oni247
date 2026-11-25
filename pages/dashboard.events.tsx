import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  CalendarDays,
  Check,
  Copy,
  Download,
  ExternalLink,
  ImagePlus,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Plus,
  Trash2,
  Unlock,
  Users,
  X,
} from "lucide-react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { EventDateBadge } from "../components/EventDateBadge";
import { Input } from "../components/Input";
import { ListToolbar } from "../components/ListToolbar";
import { Progress } from "../components/Progress";
import { Skeleton } from "../components/Skeleton";
import { Spinner } from "../components/Spinner";
import { Switch } from "../components/Switch";
import { Textarea } from "../components/Textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/Dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/Select";
import { useMyBusiness } from "../helpers/useMyBusiness";
import { useSubscriptionStatus } from "../helpers/useSubscriptionStatus";
import { uploadImage } from "../helpers/uploadImage";
import { friendlyError } from "../helpers/friendlyError";
import { toSlug } from "../helpers/toSlug";
import { eventTimeState, formatEventRange, registrationInfo } from "../helpers/eventStatus";
import { getEvents } from "../endpoints/events/list_GET.schema";
import { postSaveEvent } from "../endpoints/events/save_POST.schema";
import { postDeleteEvent } from "../endpoints/events/delete_POST.schema";
import { getFormSubmissions, type Submission } from "../endpoints/forms/submissions_GET.schema";
import { postSubmissionStatus } from "../endpoints/forms/submissionStatus_POST.schema";
import styles from "./dashboard.events.module.css";

type EventItem = {
  id: string;
  title: string;
  slug: string;
  description: string;
  startsAt: Date | string;
  endsAt: Date | string | null;
  venue: string | null;
  registrationEnabled: boolean;
  approvalRequired?: boolean;
  registrationClosesAt: Date | string | null;
  capacity: number | null;
  formId: string | null;
  published: boolean;
  registrationCount: number;
  coverImageUrl: string | null;
};
type FormOption = { id: string; title: string; isActive: boolean; fields: Array<{ id: string; label: string }> };

type Draft = {
  id?: string;
  title: string;
  slug: string;
  description: string;
  coverImageUrl: string;
  startsAt: string;
  endsAt: string;
  venue: string;
  registrationEnabled: boolean;
  approvalRequired: boolean;
  registrationClosesAt: string;
  capacity: string;
  formId: string;
  published: boolean;
};

const dateValue = (value: Date | string | null | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toDraft = (event: EventItem): Draft => ({
  id: event.id,
  title: event.title,
  slug: event.slug,
  description: event.description,
  coverImageUrl: event.coverImageUrl ?? "",
  startsAt: dateValue(event.startsAt),
  endsAt: dateValue(event.endsAt),
  venue: event.venue ?? "",
  registrationEnabled: event.registrationEnabled,  approvalRequired: event.approvalRequired ?? false,
  registrationClosesAt: dateValue(event.registrationClosesAt),
  capacity: event.capacity === null ? "" : String(event.capacity),
  formId: event.formId ?? "",
  published: event.published,
});

export default function EventsPage() {
  const { data: plan } = useSubscriptionStatus();
  const { data: businessData } = useMyBusiness();
  const allowed = plan?.isPremiumPlus === true;
  const businessSlug = businessData?.business?.slug;

  const [events, setEvents] = useState<EventItem[]>([]);
  const [forms, setForms] = useState<FormOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [deleting, setDeleting] = useState<EventItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [attendeesFor, setAttendeesFor] = useState<EventItem | null>(null);
  const [attendees, setAttendees] = useState<Submission[]>([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const coverRef = useRef<HTMLInputElement>(null);
  const [messageText, setMessageText] = useState("Hello {name}, thank you for registering for {event}.");

  const contactOf = (answers: Record<string, unknown>) => {
    const values = Object.values(answers).map((value) => String(value ?? "").trim()).filter(Boolean);
    const email = values.find((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) ?? "";
    const phoneRaw = values.find((value) => /^\+?[\d\s()-]{8,}$/.test(value)) ?? "";
    const digits = phoneRaw.replace(/\D/g, "");
    const phone = digits.startsWith("0") && digits.length === 11 ? `234${digits.slice(1)}` : digits;
    const name = values.find((value) => value !== email && value !== phoneRaw && !/^\d+$/.test(value)) ?? "there";
    return { email, phone, name };
  };

  const changeStatus = async (attendee: Submission, status: "new" | "approved" | "declined") => {
    try {
      await postSubmissionStatus({ id: attendee.id, status });
      setAttendees((list) => list.map((item) => (item.id === attendee.id ? { ...item, status } : item)));
      toast.success(status === "approved" ? "Registration approved." : status === "declined" ? "Registration declined." : "Moved back to pending.");
    } catch (error) {
      toast.error(friendlyError(error, "Could not update the registration."));
    }
  };

  const setRegistrationOpen = async (event: EventItem, open: boolean) => {
    try {
      await postSaveEvent({
        id: event.id,
        title: event.title,
        slug: event.slug,
        description: event.description,
        coverImageUrl: event.coverImageUrl,
        startsAt: new Date(event.startsAt).toISOString(),
        endsAt: event.endsAt ? new Date(event.endsAt).toISOString() : null,
        venue: event.venue,
        registrationEnabled: event.registrationEnabled,
        approvalRequired: event.approvalRequired ?? false,
        registrationClosesAt: open ? null : new Date(Date.now() - 1000).toISOString(),
        capacity: event.capacity,
        formId: event.formId,
        published: event.published,
      });
      toast.success(open ? "Registration reopened." : "Registration closed. Visitors will see that it is closed.");
      await load();
    } catch (error) {
      toast.error(friendlyError(error, "Could not change registration."));
    }
  };

  const load = useCallback(async () => {
    try {
      const result = await getEvents();
      setEvents(result.events as EventItem[]);
      setForms(result.forms as FormOption[]);
    } catch (error) {
      toast.error(friendlyError(error, "Could not load your events."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (allowed) void load();
    else setLoading(false);
  }, [allowed, load]);

  const stats = useMemo(() => {
    const now = new Date();
    return {
      upcoming: events.filter((e) => e.published && eventTimeState(e, now) !== "past").length,
      past: events.filter((e) => eventTimeState(e, now) === "past").length,
      drafts: events.filter((e) => !e.published).length,
      registrations: events.reduce((sum, e) => sum + e.registrationCount, 0),
    };  }, [events]);

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    const now = new Date();
    return events.filter((event) => {
      const state = eventTimeState(event, now);
      const matchesFilter =
        filter === "all" ||
        (filter === "upcoming" && event.published && state !== "past") ||
        (filter === "past" && state === "past") ||
        (filter === "draft" && !event.published);
      const matchesTerm =
        term === "" ||
        event.title.toLowerCase().includes(term) ||
        (event.venue ?? "").toLowerCase().includes(term);
      return matchesFilter && matchesTerm;
    });
  }, [events, search, filter]);

  const startNew = () => {
    setSlugEdited(false);
    const start = new Date(Date.now() + 7 * 86_400_000);
    start.setMinutes(0, 0, 0);
    setDraft({
      title: "",
      slug: "",
      description: "",
      coverImageUrl: "",
      startsAt: dateValue(start),
      endsAt: "",
      venue: "",
      registrationEnabled: false,
      approvalRequired: false,
      registrationClosesAt: "",
      capacity: "",
      formId: "",
      published: false,
    });
  };

  const handleCover = async (files: FileList | null) => {
    const file = files?.[0];
    if (coverRef.current) coverRef.current.value = "";
    if (!file) return;
    setCoverUploading(true);
    try {
      const url = await uploadImage(file, "gallery");
      setDraft((current) => (current ? { ...current, coverImageUrl: url } : current));
    } catch (error) {
      toast.error(friendlyError(error, "The cover image could not be uploaded."));
    } finally {
      setCoverUploading(false);
    }
  };

  const handleSave = async (publishOverride?: boolean) => {
    if (!draft) return;
    if (draft.title.trim().length < 2) return void toast.error("Give the event a title first.");
    if (!draft.startsAt) return void toast.error("Choose when the event starts.");
    const starts = new Date(draft.startsAt);
    if (draft.endsAt && new Date(draft.endsAt) < starts) {
      return void toast.error("The end time must be after the start time.");
    }
    if (draft.registrationClosesAt && new Date(draft.registrationClosesAt) > starts) {
      return void toast.error("Registration must close before the event starts.");
    }
    if (draft.registrationEnabled && !draft.formId) {
      return void toast.error("Choose a registration form, or turn registration off.");
    }
    const capacity = draft.capacity.trim() === "" ? null : Number.parseInt(draft.capacity, 10);
    if (capacity !== null && (Number.isNaN(capacity) || capacity < 1)) {
      return void toast.error("Capacity must be a whole number, or leave it empty for unlimited.");
    }
    setSaving(true);
    try {
      await postSaveEvent({
        id: draft.id,
        title: draft.title.trim(),
        slug: draft.slug.trim() || undefined,
        description: draft.description,
        coverImageUrl: draft.coverImageUrl || null,
        startsAt: starts.toISOString(),
        endsAt: draft.endsAt ? new Date(draft.endsAt).toISOString() : null,
        venue: draft.venue.trim() || null,
        registrationEnabled: draft.registrationEnabled,
        approvalRequired: draft.approvalRequired,
        registrationClosesAt: draft.registrationClosesAt ? new Date(draft.registrationClosesAt).toISOString() : null,
        capacity,
        formId: draft.formId || null,
        published: publishOverride ?? draft.published,
      });
      toast.success((publishOverride ?? draft.published) ? "Event saved and live." : "Draft saved.");
      setDraft(null);
      await load();
    } catch (error) {
      toast.error(friendlyError(error, "The event could not be saved."));
    } finally {
      setSaving(false);
    }  };

  const togglePublished = async (event: EventItem) => {
    try {
      await postSaveEvent({
        id: event.id,
        title: event.title,
        slug: event.slug,
        description: event.description,
        coverImageUrl: event.coverImageUrl,
        startsAt: new Date(event.startsAt).toISOString(),
        endsAt: event.endsAt ? new Date(event.endsAt).toISOString() : null,
        venue: event.venue,
        registrationEnabled: event.registrationEnabled,
        approvalRequired: event.approvalRequired ?? false,
        registrationClosesAt: event.registrationClosesAt ? new Date(event.registrationClosesAt).toISOString() : null,
        capacity: event.capacity,
        formId: event.formId,
        published: !event.published,
      });
      toast.success(event.published ? "Event moved back to drafts." : "Event is now live.");
      await load();
    } catch (error) {
      toast.error(friendlyError(error, "Could not change the event."));
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await postDeleteEvent({ id: deleting.id });
      toast.success("Event deleted.");
      setDeleting(null);
      await load();
    } catch (error) {
      toast.error(friendlyError(error, "The event could not be deleted."));
    } finally {
      setDeleteBusy(false);
    }
  };

  const openAttendees = async (event: EventItem) => {
    setAttendeesFor(event);
    setAttendees([]);
    setAttendeeSearch("");
    setAttendeesLoading(true);
    try {
      const result = await getFormSubmissions({ eventId: event.id });
      setAttendees(result.submissions);
    } catch (error) {
      toast.error(friendlyError(error, "Could not load the attendees."));
    } finally {
      setAttendeesLoading(false);
    }
  };

  const labelFor = useCallback(
    (event: EventItem | null, fieldId: string) =>
      forms.find((form) => form.id === event?.formId)?.fields.find((field) => field.id === fieldId)?.label ?? fieldId,
    [forms],
  );

  const shownAttendees = useMemo(() => {
    const term = attendeeSearch.trim().toLowerCase();
    if (!term) return attendees;
    return attendees.filter((attendee) =>
      Object.values(attendee.answers).some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [attendees, attendeeSearch]);

  const exportAttendees = () => {
    const keys = Array.from(new Set(attendees.flatMap((a) => Object.keys(a.answers))));
    const rows = [
      ["Registered at", ...keys.map((key) => labelFor(attendeesFor, key))],
      ...attendees.map((a) => [new Date(a.submittedAt).toISOString(), ...keys.map((key) => String(a.answers[key] ?? ""))]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${attendeesFor?.slug ?? "event"}-attendees.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!allowed && !loading) {
    return (
      <div className={styles.page}>
        <Helmet><title>Events — Oni247</title></Helmet>
        <h1 className={styles.title}>Events</h1>
        <p className={styles.subtitle}>
          Create public events, take registrations and manage capacity. Available on Premium Plus.
        </p>
        <div><Button asChild><Link to="/dashboard/plan">Upgrade to Premium Plus</Link></Button></div>
      </div>
    );
  }

  if (loading) {
    return (      <div className={styles.page}>
        <Skeleton className={styles.skeletonTitle} />
        <Skeleton className={styles.skeletonBlock} />
      </div>
    );
  }

  // ---------- Editor ----------
  if (draft) {
    const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
    return (
      <div className={styles.page}>
        <Helmet><title>{`${draft.id ? "Edit" : "New"} event — Oni247`}</title></Helmet>
        <div className={styles.head}>
          <div>
            <h1 className={styles.title}>{draft.id ? "Edit event" : "New event"}</h1>
            <p className={styles.subtitle}>Fill in the details, then publish when you are ready.</p>
          </div>
          <Button variant="ghost" onClick={() => setDraft(null)}>Back to events</Button>
        </div>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>The basics</h2>
          <label className={styles.field}>
            <span className={styles.label}>Event title</span>
            <Input
              value={draft.title}
              onChange={(e) => set({ title: e.target.value, ...(slugEdited ? {} : { slug: toSlug(e.target.value) }) })}
              placeholder="Customer open day"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Page address</span>
            <Input
              value={draft.slug}
              onChange={(e) => {
                setSlugEdited(true);
                set({ slug: toSlug(e.target.value) });
              }}
              placeholder="Created from the title"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Description</span>
            <Textarea
              rows={6}
              value={draft.description}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="What will happen, who it is for and what to bring."
            />
          </label>
          <div className={styles.field}>
            <span className={styles.label}>Cover image</span>
            <div className={styles.coverRow}>
              {draft.coverImageUrl && <img src={draft.coverImageUrl} alt="" className={styles.coverPreview} />}
              <input ref={coverRef} type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={(e) => void handleCover(e.target.files)} />
              <Button variant="outline" size="sm" disabled={coverUploading} onClick={() => coverRef.current?.click()}>
                {coverUploading ? <Spinner size="sm" /> : <ImagePlus size={15} />}
                {draft.coverImageUrl ? "Change image" : "Add cover image"}
              </Button>
              {draft.coverImageUrl && (
                <Button variant="ghost" size="sm" onClick={() => set({ coverImageUrl: "" })}>Remove</Button>
              )}
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>When and where</h2>
          <div className={styles.twoUp}>
            <label className={styles.field}>
              <span className={styles.label}>Starts</span>
              <Input type="datetime-local" value={draft.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Ends (optional)</span>
              <Input type="datetime-local" value={draft.endsAt} onChange={(e) => set({ endsAt: e.target.value })} />
            </label>
          </div>
          <label className={styles.field}>
            <span className={styles.label}>Venue or online link</span>
            <Input value={draft.venue} onChange={(e) => set({ venue: e.target.value })} placeholder="12 Allen Avenue, Ikeja, or a meeting link" />
          </label>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Registration</h2>
          <label className={styles.switchRow}>
            <Switch checked={draft.registrationEnabled} onCheckedChange={(checked) => set({ registrationEnabled: checked })} />
            <span>
              <strong>Let people register</strong>
              <small>Visitors fill in one of your forms to book a place.</small>
            </span>
          </label>
          {draft.registrationEnabled && (
            <>
              <div className={styles.field}>
                <span className={styles.label}>Registration form</span>
                {forms.filter((f) => f.isActive).length === 0 ? (
                  <p className={styles.hint}>                    You have no active forms yet. <Link to="/dashboard/forms">Create a form</Link>, then come back.
                  </p>
                ) : (
                  <Select value={draft.formId || "none"} onValueChange={(value) => set({ formId: value === "none" ? "" : value })}>
                    <SelectTrigger><SelectValue placeholder="Choose a form" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Choose a form…</SelectItem>
                      {forms.filter((f) => f.isActive).map((form) => (
                        <SelectItem key={form.id} value={form.id}>{form.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <label className={styles.switchRow}>
                <Switch checked={draft.approvalRequired} onCheckedChange={(checked) => set({ approvalRequired: checked })} />
                <span>
                  <strong>I want to approve registrations</strong>
                  <small>Off: everyone who registers is confirmed straight away. On: each registration waits until you approve or decline it.</small>
                </span>
              </label>
              <div className={styles.twoUp}>
                <label className={styles.field}>
                  <span className={styles.label}>Places available</span>
                  <Input
                    inputMode="numeric"
                    value={draft.capacity}
                    onChange={(e) => set({ capacity: e.target.value.replace(/\D/g, "") })}
                    placeholder="Leave empty for unlimited"
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Registration closes (optional)</span>
                  <Input type="datetime-local" value={draft.registrationClosesAt} onChange={(e) => set({ registrationClosesAt: e.target.value })} />
                </label>
              </div>
            </>
          )}
        </section>

        <section className={styles.card}>
          <label className={styles.switchRow}>
            <Switch checked={draft.published} onCheckedChange={(checked) => set({ published: checked })} />
            <span>
              <strong>Show this event on my website</strong>
              <small>Turn off to keep it as a private draft.</small>
            </span>
          </label>
        </section>

        <div className={styles.actions}>
          <Button disabled={saving} onClick={() => void handleSave()}>
            {saving ? <Spinner size="sm" /> : null}
            Save event
          </Button>
          {!draft.published && (
            <Button variant="outline" disabled={saving} onClick={() => void handleSave(true)}>Save and publish</Button>
          )}
          <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
        </div>
      </div>
    );
  }

  // ---------- Attendees ----------
  if (attendeesFor) {
    const keys = Array.from(new Set(attendees.flatMap((a) => Object.keys(a.answers))));
    return (
      <div className={styles.page}>
        <Helmet><title>{`Attendees — ${attendeesFor.title}`}</title></Helmet>
        <div className={styles.head}>
          <div>
            <h1 className={styles.title}>Attendees</h1>
            <p className={styles.subtitle}>
              {attendeesFor.title} · {attendees.length} {attendees.length === 1 ? "registration" : "registrations"}
              {attendeesFor.capacity !== null ? ` of ${attendeesFor.capacity} places` : ""}
            </p>
          </div>
          <div className={styles.headActions}>
            <Button variant="outline" disabled={attendees.length === 0} onClick={exportAttendees}>
              <Download size={15} /> Export CSV
            </Button>
            <Button variant="ghost" onClick={() => setAttendeesFor(null)}>Back to events</Button>
          </div>
        </div>

        {attendeesLoading ? (
          <Skeleton className={styles.skeletonBlock} />
        ) : attendees.length === 0 ? (
          <div className={styles.empty}><Users size={26} /><p>No one has registered yet.</p></div>
        ) : (
          <>
            <ListToolbar
              search={attendeeSearch}
              onSearch={setAttendeeSearch}
              placeholder="Search by name, email or phone"
              shown={shownAttendees.length}
              total={attendees.length}
            />
            <label className={styles.field}>              <span className={styles.label}>Message to send to registrants</span>
              <Textarea rows={2} value={messageText} onChange={(event) => setMessageText(event.target.value)} />
              <small className={styles.meta}>Use {"{name}"} and {"{event}"}. Tap WhatsApp or Email on a registrant to send it.</small>
            </label>
            <div className={styles.headActions}>
              <Button
                variant="outline"
                size="sm"
                disabled={!attendees.some((a) => a.status !== "declined" && (events.find((e) => e.id === attendeesFor.id)?.approvalRequired ? a.status === "approved" : true) && contactOf(a.answers).email)}
                onClick={() => {
                  const needs = events.find((e) => e.id === attendeesFor.id)?.approvalRequired === true;
                  const emails = attendees.filter((a) => (needs ? a.status === "approved" : a.status !== "declined")).map((a) => contactOf(a.answers).email).filter(Boolean);
                  window.location.href = `mailto:?bcc=${encodeURIComponent(emails.join(","))}&subject=${encodeURIComponent(attendeesFor.title)}&body=${encodeURIComponent(messageText.replace(/\{name\}/g, "").replace(/\{event\}/g, attendeesFor.title))}`;
                }}
              >
                <Mail size={14} /> Email everyone confirmed
              </Button>
            </div>
            <ul className={styles.attendees}>
              {shownAttendees.map((attendee) => (
                <li key={attendee.id} className={styles.attendee}>
                  <small className={styles.meta}>{new Date(attendee.submittedAt).toLocaleString()}</small>
                  <Badge variant={attendee.status === "declined" ? "destructive" : attendee.status === "approved" || !(events.find((e) => e.id === attendeesFor.id)?.approvalRequired) ? "success" : "secondary"}>
                    {attendee.status === "declined"
                      ? (events.find((e) => e.id === attendeesFor.id)?.approvalRequired ? "Declined" : "Cancelled")
                      : events.find((e) => e.id === attendeesFor.id)?.approvalRequired
                        ? (attendee.status === "approved" ? "Approved" : "Pending")
                        : "Registered"}
                  </Badge>
                  <dl className={styles.answers}>
                    {keys.filter((key) => attendee.answers[key] !== undefined && attendee.answers[key] !== "").map((key) => (
                      <div key={key}>
                        <dt>{labelFor(attendeesFor, key)}</dt>
                        <dd>{String(attendee.answers[key])}</dd>
                      </div>
                    ))}
                  </dl>
                  {(() => {
                    const contact = contactOf(attendee.answers);
                    const text = messageText.replace(/\{name\}/g, contact.name).replace(/\{event\}/g, attendeesFor.title);
                    const needsApproval = events.find((e) => e.id === attendeesFor.id)?.approvalRequired === true;
                    return (
                      <div className={styles.headActions}>
                        {needsApproval && attendee.status !== "approved" && (
                          <Button size="sm" onClick={() => void changeStatus(attendee, "approved")}><Check size={14} /> Approve</Button>
                        )}
                        {attendee.status !== "declined" && (
                          <Button size="sm" variant="outline" onClick={() => void changeStatus(attendee, "declined")}><X size={14} /> {needsApproval ? "Decline" : "Cancel registration"}</Button>
                        )}
                        {needsApproval && attendee.status !== "new" && (
                          <Button size="sm" variant="ghost" onClick={() => void changeStatus(attendee, "new")}>Back to pending</Button>
                        )}
                        {!needsApproval && attendee.status === "declined" && (
                          <Button size="sm" variant="ghost" onClick={() => void changeStatus(attendee, "new")}>Restore</Button>
                        )}
                        {contact.phone && (
                          <Button asChild size="sm" variant="outline">
                            <a href={`https://wa.me/${contact.phone}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={14} /> WhatsApp</a>
                          </Button>
                        )}
                        {contact.email && (
                          <Button asChild size="sm" variant="outline">
                            <a href={`mailto:${contact.email}?subject=${encodeURIComponent(attendeesFor.title)}&body=${encodeURIComponent(text)}`}><Mail size={14} /> Email</a>
                          </Button>
                        )}
                      </div>
                    );
                  })()}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    );
  }

  // ---------- List ----------
  return (
    <div className={styles.page}>
      <Helmet><title>Events — Oni247</title></Helmet>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Events</h1>
          <p className={styles.subtitle}>Publish events, take registrations and see who is coming.</p>
        </div>
        <Button onClick={startNew}><Plus size={16} /> New event</Button>
      </div>

      {events.length > 0 && (
        <div className={styles.stats}>
          <div className={styles.stat}><strong>{stats.upcoming}</strong><span>Upcoming</span></div>
          <div className={styles.stat}><strong>{stats.registrations}</strong><span>Registrations</span></div>
          <div className={styles.stat}><strong>{stats.drafts}</strong><span>Drafts</span></div>
          <div className={styles.stat}><strong>{stats.past}</strong><span>Past</span></div>
        </div>
      )}

      {events.length === 0 ? (
        <div className={styles.empty}>          <CalendarDays size={28} />
          <p>No events yet. Create your first event, then attach a registration form if you want bookings.</p>
          <div className={styles.actions}>
            <Button onClick={startNew}><Plus size={16} /> Create an event</Button>
            <Button asChild variant="outline"><Link to="/dashboard/forms">Make a registration form</Link></Button>
          </div>
        </div>
      ) : (
        <>
          <ListToolbar
            search={search}
            onSearch={setSearch}
            placeholder="Search events"
            shown={shown.length}
            total={events.length}
            filters={[
              {
                id: "status",
                label: "Show",
                value: filter,
                onChange: setFilter,
                options: [
                  { value: "upcoming", label: "Upcoming", count: stats.upcoming },
                  { value: "past", label: "Past", count: stats.past },
                  { value: "draft", label: "Drafts", count: stats.drafts },
                ],
              },
            ]}
          />
          {shown.length === 0 ? (
            <p className={styles.subtitle}>No event matches that search.</p>
          ) : (
            <ul className={styles.list}>
              {shown.map((event) => {
                const state = eventTimeState(event);
                const reg = registrationInfo(event, event.registrationCount);
                const fill = event.capacity ? Math.min(100, Math.round((event.registrationCount / event.capacity) * 100)) : 0;
                return (
                  <li key={event.id} className={styles.item}>
                    <EventDateBadge date={event.startsAt} muted={state === "past"} />
                    <div className={styles.itemBody}>
                      <div className={styles.badges}>
                        <Badge variant={event.published ? "success" : "secondary"}>{event.published ? "Live" : "Draft"}</Badge>
                        {state === "live" && <Badge variant="success">Happening now</Badge>}
                        {state === "past" && <Badge variant="secondary">Ended</Badge>}
                        {state !== "past" && reg.state === "open" && <Badge variant="outline">Registration open</Badge>}
                        {state !== "past" && reg.state === "full" && <Badge variant="destructive">Full</Badge>}
                        {state !== "past" && reg.state === "closed" && event.registrationEnabled && <Badge variant="secondary">Registration closed</Badge>}
                      </div>
                      <h2 className={styles.itemTitle}>{event.title}</h2>
                      <p className={styles.meta}>{formatEventRange(event.startsAt, event.endsAt)}</p>
                      {event.venue && <p className={styles.meta}><MapPin size={13} /> {event.venue}</p>}
                      {event.registrationEnabled && (
                        <div className={styles.capacity}>
                          <span className={styles.meta}>
                            {event.registrationCount} registered{event.capacity ? ` of ${event.capacity}` : ""}
                          </span>
                          {event.capacity ? <Progress value={fill} aria-label="How full the event is" /> : null}
                        </div>
                      )}
                    </div>
                    <div className={styles.rowActions}>
                      <Button size="sm" variant="outline" onClick={() => void openAttendees(event)}>
                        <Users size={14} /> Attendees
                      </Button>
                      {event.registrationEnabled && state !== "past" && (
                        reg.state === "closed" ? (
                          <Button size="sm" variant="outline" onClick={() => void setRegistrationOpen(event, true)}>
                            <Unlock size={14} /> Reopen registration
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => void setRegistrationOpen(event, false)}>
                            <Lock size={14} /> Close registration
                          </Button>
                        )
                      )}
                      <Button size="sm" variant="outline" onClick={() => { setSlugEdited(true); setDraft(toDraft(event)); }}>
                        <Pencil size={14} /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void togglePublished(event)}>
                        {event.published ? "Unpublish" : "Publish"}
                      </Button>
                      {event.published && businessSlug && (


                        <Button asChild size="sm" variant="outline">
                          <a href={`/store/${businessSlug}/e/${event.slug}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink size={14} /> View
                          </a>
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
      {deleting && (
        <Dialog open={!!deleting} onOpenChange={(open)=>!open && setDeleting(null)}>
          <DialogContent><DialogHeader><DialogTitle>Delete event?</DialogTitle><DialogDescription>This action cannot be undone.</DialogDescription></DialogHeader>
            <DialogFooter><Button variant="outline" onClick={()=>setDeleting(null)}>Cancel</Button><Button variant="destructive" disabled={deleteBusy} onClick={()=>void handleDelete()}>{deleteBusy ? <Spinner size="sm"/> : "Delete event"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
