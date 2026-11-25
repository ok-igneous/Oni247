import { useStorefrontRouteParams } from "../helpers/storefrontHost";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "../components/Button";
import { StoreServiceShell } from "../components/StoreServiceShell";
import { useStorefront } from "../helpers/useStorefront";
import { formatMoney } from "../helpers/formatMoney";
import { postBookingStatus } from "../endpoints/bookings/status_POST.schema";
import { postBookingPay } from "../endpoints/bookings/pay_POST.schema";
import styles from "../components/StoreServiceShell.module.css";

export default function BookingStatusPage() {
  const { slug, code } = useStorefrontRouteParams<{ slug: string; code: string }>();
  const store = useStorefront(slug);
  const booking = useQuery({
    queryKey: ["booking-status", slug, code],
    queryFn: () => postBookingStatus({ slug: slug ?? "", code: code ?? "" }),
    enabled: Boolean(slug && code),
    retry: false,
  });
  const [paying, setPaying] = useState(false);

  if ((store.isFetching && !store.data) || (booking.isFetching && !booking.data)) return <main className={styles.content}><p>Loading your booking…</p></main>;
  if (!store.data) return <main className={styles.content}><h1>Booking not found</h1></main>;
  const b = booking.data;
  if (booking.error || !b) {
    return (
      <StoreServiceShell data={store.data} title="Booking">
        <h1>We could not find that booking</h1>
        <p className={styles.muted}>Check the booking code in your email or message and try again.</p>
        <Link to={`/${store.data.business.slug}/services`}>Back to services</Link>
      </StoreServiceShell>
    );
  }

  const paid = b.paymentStatus === "paid";
  const waiting = b.canPay;
  const pay = async () => {
    setPaying(true);
    try {
      const r = await postBookingPay({ slug: b.businessSlug, code: b.code });
      window.location.href = r.paymentUrl;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open the payment page.");
      setPaying(false);
    }
  };
  const phone = store.data.business.whatsappNumber?.replace(/\D/g, "");

  return (
    <StoreServiceShell data={store.data} title={`Booking ${b.code}`}>
      <p className={styles.eyebrow}>Booking {b.code}</p>
      <h1>{b.serviceName}</h1>
      {b.status === "cancelled" ? (
        <div className={`${styles.banner} ${styles.bannerNeutral}`}><strong>This booking was cancelled.</strong><span className={styles.muted}>Contact {b.businessName} if you would like to book again.</span></div>
      ) : paid ? (
        <div className={`${styles.banner} ${styles.bannerOk}`}><strong>Payment received. Your booking is confirmed.</strong><span className={styles.muted}>{b.businessName} has been notified and will see you as arranged.</span></div>
      ) : waiting ? (
        <div className={`${styles.banner} ${styles.bannerWait}`}>
          <strong>Waiting for your payment of {formatMoney(b.amountDue, b.currency)}</strong>
          <span className={styles.muted}>If you just paid, give it a moment and check again.</span>
          <div className={styles.actions}>
            <Button onClick={() => void pay()} disabled={paying}>{paying ? "Opening…" : "Pay now"}</Button>
            <Button variant="outline" onClick={() => void booking.refetch()} disabled={booking.isFetching}>I have paid, check again</Button>
          </div>
        </div>
      ) : (
        <div className={`${styles.banner} ${styles.bannerNeutral}`}><strong>Your request has been sent.</strong><span className={styles.muted}>{b.businessName} will contact you to confirm your booking{b.checkoutMode === "enquiry" ? " and arrange payment" : ""}.</span></div>
      )}
      <div className={`${styles.card}`} style={{ marginTop: 18 }}>
        <h2>Details</h2>
        <div className={styles.form}>
          <div className={styles.line}><span>Booking code</span><strong>{b.code}</strong></div>
          {(b.preferredDate || b.preferredTime) && <div className={styles.line}><span>Preferred time</span><span>{[b.preferredDate, b.preferredTime].filter(Boolean).join(" at ")}</span></div>}
          {b.amountTotal > 0 && <div className={styles.line}><span>Service price</span><span>{formatMoney(b.amountTotal, b.currency)}</span></div>}
          {b.amountDue > 0 && <div className={styles.line}><span>Paid online</span><span>{paid ? formatMoney(b.amountDue, b.currency) : "Not yet"}</span></div>}
          <div className={styles.line}><span>Status</span><span style={{ textTransform: "capitalize" }}>{b.status}</span></div>
        </div>
        <p className={styles.hint}>Keep your booking code. You can open this page again from your confirmation message.</p>
        {phone && <div className={styles.actions}><Button asChild variant="outline"><a href={`https://wa.me/${phone}?text=${encodeURIComponent(`Hello ${b.businessName}, about my booking ${b.code}.`)}`} target="_blank" rel="noreferrer">Message on WhatsApp</a></Button></div>}
      </div>
    </StoreServiceShell>
  );
}