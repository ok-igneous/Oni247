import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarX, MapPin, Search, Users } from "lucide-react";
import { Badge } from "./Badge";
import { Input } from "./Input";
import { EventDateBadge } from "./EventDateBadge";
import { eventTimeState, formatEventRange, registrationInfo } from "../helpers/eventStatus";
import type { PublicEventItem } from "../endpoints/events/publicList_GET.schema";
import styles from "./EventsList.module.css";

interface Props {
  events: PublicEventItem[];
  businessSlug: string;
  showPast: boolean;
  /** Hide the search box and tabs, e.g. for a short "more events" strip. */
  compact?: boolean;
}

const monthLabel = (date: Date | string) =>
  new Date(date).toLocaleDateString(undefined, { month: "long", year: "numeric" });

/** Public events list: search, upcoming / past tabs, grouped by month. */
export const EventsList = ({ events, businessSlug, showPast, compact = false }: Props) => {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [search, setSearch] = useState("");
  const now = new Date();

  const { upcoming, past } = useMemo(() => {
    const up: PublicEventItem[] = [];
    const done: PublicEventItem[] = [];
    for (const event of events) {
      (eventTimeState(event) === "past" ? done : up).push(event);
    }
    up.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    done.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
    return { upcoming: up, past: done };
  }, [events]);

  const activeTab = tab === "past" && showPast && past.length > 0 ? "past" : "upcoming";
  const source = activeTab === "past" ? past : upcoming;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return source;
    return source.filter(
      (event) =>
        event.title.toLowerCase().includes(term) ||
        (event.venue ?? "").toLowerCase().includes(term) ||
        event.description.toLowerCase().includes(term),
    );
  }, [source, search]);

  const groups = useMemo(() => {
    const map = new Map<string, PublicEventItem[]>();
    for (const event of filtered) {
      const key = monthLabel(event.startsAt);
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const card = (event: PublicEventItem) => {
    const state = eventTimeState(event, now);
    const reg = registrationInfo(event, event.registrationCount ?? 0, now);
    return (
      <li key={event.id} className={styles.card}>
        <Link to={`/${businessSlug}/e/${event.slug}`} className={styles.cardLink}>
          <EventDateBadge date={event.startsAt} muted={state === "past"} />
          <div className={styles.cardBody}>
            <div className={styles.badges}>
              {state === "live" && <Badge variant="success">Happening now</Badge>}
              {state === "upcoming" && reg.state === "open" && <Badge variant="success">Registration open</Badge>}
              {state === "upcoming" && reg.state === "full" && <Badge variant="destructive">Fully booked</Badge>}
              {state === "upcoming" && reg.state === "closed" && <Badge variant="secondary">Registration closed</Badge>}
              {state === "upcoming" && reg.state === "open" && reg.spotsLeft !== null && reg.spotsLeft <= 10 && (
                <Badge variant="warning">{reg.spotsLeft} {reg.spotsLeft === 1 ? "spot" : "spots"} left</Badge>
              )}
              {state === "past" && <Badge variant="secondary">Ended</Badge>}
            </div>
            <h3 className={styles.title}>{event.title}</h3>
            <p className={styles.when}>{formatEventRange(event.startsAt, event.endsAt)}</p>
            {event.venue && (
              <p className={styles.venue}><MapPin size={14} aria-hidden="true" /> {event.venue}</p>
            )}
            <span className={styles.cta}>
              {state === "past" ? "See details →" : reg.state === "open" ? "Details & register →" : "View event →"}
            </span>
          </div>
          {event.coverImageUrl && (
            <img className={styles.cover} src={event.coverImageUrl} alt="" loading="lazy" decoding="async" />
          )}
        </Link>
      </li>
    );
  };

  if (events.length === 0) {
    return (
      <div className={styles.empty}>
        <CalendarX size={28} aria-hidden="true" />
        <p>There are no events right now. Check back soon.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      {!compact && (
        <div className={styles.controls}>
          <div className={styles.searchWrap}>
            <Search size={18} className={styles.searchIcon} aria-hidden="true" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search events"
              aria-label="Search events"
              className={styles.search}
            />
          </div>
          {showPast && past.length > 0 && (
            <div className={styles.tabs} role="tablist" aria-label="Show events">
              {(["upcoming", "past"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === item}
                  className={`${styles.tab} ${activeTab === item ? styles.tabOn : ""}`}
                  onClick={() => setTab(item)}
                >
                  {item === "upcoming" ? `Upcoming (${upcoming.length})` : `Past (${past.length})`}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <Users size={26} aria-hidden="true" />
          <p>{search ? "No event matches your search." : activeTab === "past" ? "No past events." : "No upcoming events right now. Check back soon."}</p>
        </div>
      ) : compact ? (
        <ul className={styles.list}>{filtered.map(card)}</ul>
      ) : (
        groups.map(([month, items]) => (
          <section key={month} className={styles.group}>
            <h2 className={styles.month}>{month}</h2>
            <ul className={styles.list}>{items.map(card)}</ul>
          </section>
        ))
      )}
    </div>
  );
};