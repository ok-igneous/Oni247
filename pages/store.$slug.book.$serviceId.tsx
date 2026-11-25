import { useStorefrontRouteParams } from "../helpers/storefrontHost";
import { useStorefrontRouteParams } from "../helpers/storefrontHost";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock } from "lucide-react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Textarea } from "../components/Textarea";
import { StoreServiceShell } from "../components/StoreServiceShell";
import { useStorefront } from "../helpers/useStorefront";
import { formatMoney } from "../helpers/formatMoney";
import { postCreateBooking } from "../endpoints/bookings/create_POST.schema";
import styles from "../components/StoreServiceShell.module.css";

const LOCATION_LABEL = { business: "At the business", customer: "At your location", online: "Online" } as const;

export default function ServiceBookingPage() {
  const { slug, serviceId } = useStorefrontRouteParams<{ slug: string; serviceId: string }>();
  const navigate = useNavigate();
  const { data, isFetching, error } = useStorefront(slug);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [payNow, setPayNow] = useState(true);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  if (isFetching && !data) return <main className={styles.content}><p>Loading…</p></main>;
  const business = data?.business;
  const service = data?.services.find((s) => s.id === serviceId);
  if (error || !data || !business || !service) {
    return (
      <main className={styles.content}>
        <h1>Service not found</h1>
        <p className={styles.muted}>This service may have been removed or is no longer taking bookings.</p>
        {data && <Link to={`/${data.business.slug}/services`}>Back to services</Link>}
      </main>
    );
  }

  const online = service.payOnline === true && service.amountDue !== undefined;
  const due = service.amountDue ?? 0;
  const total = service.amountTotal ?? 0;
  const paying = online && payNow;
  const needsAgree = Boolean(service.terms);
  const fixedPrice = service.priceType === "contact" ? "Contact for price" : service.priceType === "fixed" ? service.price : `From ${service.price}`;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setProblem("");
    if (!phone.trim() && !email.trim()) return setProblem("Add a phone number or an email so the business can reach you.");
    if (paying && !email.trim()) return setProblem("Enter your email address. Your payment receipt is sent there.");
    if (needsAgree && !agree) return setProblem("Please agree to the booking terms to continue.");
    setBusy(true);
    try {
      const result = await postCreateBooking({
        slug: business.slug,
        serviceId: service.id,
        name,
        phone: phone || undefined,
        email: email || "",
        date: date || undefined,
        time: time || undefined,
        location: location || undefined,
        notes: notes || undefined,
        payOnline: paying,
      });
      if (result.paymentUrl) {
        window.location.href = result.paymentUrl;
        return;
      }
      navigate(`/store/${business.slug}/booking/${result.code}`);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Could not make the booking. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <StoreServiceShell data={data} title={`Book ${service.name}`}>
      <Link className={styles.back} to={`/store/${business.slug}/s/${service.id}`}><ArrowLeft size={16} /> {service.name}</Link>
      <p className={styles.eyebrow}>Book a service</p>
      <h1>{service.name}</h1>
      <div className={styles.layout}>
        <form className={`${styles.card} ${styles.form}`} onSubmit={(e) => void submit(e)}>
          <h2>Your details</h2>
          <div className={styles.field}><label htmlFor="b-name">Full name</label><Input id="b-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} /></div>
          <div className={styles.two}>
            <div className={styles.field}><label htmlFor="b-phone">Phone</label><Input id="b-phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" maxLength={40} /></div>
            <div className={styles.field}><label htmlFor="b-email">Email{paying ? "" : " (optional)"}</label><Input id="b-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} /></div>
          </div>
          {service.askSchedule !== false && (
            <div className={styles.two}>
              <div className={styles.field}><label htmlFor="b-date">Preferred date</label><Input id="b-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
              <div className={styles.field}><label htmlFor="b-time">Preferred time</label><Input id="b-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
            </div>
          )}
          {service.location === "customer" && (
            <div className={styles.field}><label htmlFor="b-loc">Address for the service</label><Input id="b-loc" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={300} /></div>
          )}
          <div className={styles.field}><label htmlFor="b-notes">Anything we should know? (optional)</label><Textarea id="b-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} /></div>

          {online && (
            <div className={styles.field}>
              <label>Payment</label>
              <label className={`${styles.choice} ${payNow ? styles.choiceOn : ""}`}>
                <input type="radio" name="pay" checked={payNow} onChange={() => setPayNow(true)} />
                <span><strong>{service.checkoutMode === "deposit" ? `Pay a deposit of ${formatMoney(due, business.currency)} now` : `Pay ${formatMoney(due, business.currency)} now`}</strong><span className={styles.hint}>Secure online payment. Your booking is confirmed once it goes through.</span></span>
              </label>
              <label className={`${styles.choice} ${!payNow ? styles.choiceOn : ""}`}>
                <input type="radio" name="pay" checked={!payNow} onChange={() => setPayNow(false)} />
                <span><strong>Send a request and pay later</strong><span className={styles.hint}>{business.name} will contact you to confirm and arrange payment.</span></span>
              </label>
            </div>
          )}
          {needsAgree && (
            <>
              <p className={styles.terms}>{service.terms}</p>
              <label className={styles.agree}><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> I agree to these booking terms</label>
            </>
          )}
          {problem && <p className={styles.error} role="alert">{problem}</p>}
          <div className={styles.actions}>
            <Button type="submit" disabled={busy || !name.trim()}>
              {busy ? "Please wait…" : paying ? <><Lock size={15} /> Continue to payment</> : "Send booking request"}
            </Button>
          </div>
        </form>

        <aside className={`${styles.card} ${styles.summary}`}>
          <h2>Summary</h2>
          {service.imageUrl && <img src={service.imageUrl} alt="" />}
          <strong>{service.name}</strong>
          <div className={styles.line}><span>Price</span><span>{fixedPrice}</span></div>
          {service.duration && <div className={styles.line}><span>Duration</span><span>{service.duration}</span></div>}
          <div className={styles.line}><span>Where</span><span>{LOCATION_LABEL[service.location ?? "business"]}</span></div>
          {service.includes && service.includes.length > 0 && <ul className={styles.includes}>{service.includes.map((l) => <li key={l}>{l}</li>)}</ul>}
          {paying && (
            <>
              {service.checkoutMode === "deposit" && <div className={styles.line}><span>Service total</span><span>{formatMoney(total, business.currency)}</span></div>}
              <div className={`${styles.line} ${styles.total}`}><span>{service.checkoutMode === "deposit" ? "Deposit due now" : "Due now"}</span><span>{formatMoney(due, business.currency)}</span></div>
            </>
          )}
        </aside>
      </div>
    </StoreServiceShell>
  );
}
