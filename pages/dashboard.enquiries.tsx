import { Helmet } from "react-helmet";
import { toast } from "sonner";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { useEnquiries } from "../helpers/useEnquiries";
import { useEnquiryStatus } from "../helpers/useEnquiryStatus";
import { buildWhatsAppReplyUrl } from "../helpers/buildWhatsAppReplyUrl";
import type { EnquiryStatus } from "../helpers/schema";
import styles from "./dashboard.enquiries.module.css";

const steps: { status: EnquiryStatus; label: string }[] = [
  { status: "contacted", label: "Contacted" },
  { status: "resolved", label: "Resolved" },
  { status: "new", label: "Reopen" },
];

const badgeVariant = (status: EnquiryStatus) => {
  if (status === "resolved") return "success" as const;
  if (status === "contacted") return "primary" as const;
  return "warning" as const;
};

const EnquiriesPage = () => {
  const { data, isFetching, error } = useEnquiries();
  const updateStatus = useEnquiryStatus();

  const enquiries = data?.enquiries ?? [];

  const setStatus = async (id: string, status: EnquiryStatus) => {
    try {
      await updateStatus.mutateAsync({ id, status });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update the enquiry.",
      );
    }
  };

  if (isFetching && !data) {
    return (
      <div className={styles.page}>
        <Skeleton className={styles.skeletonTitle} />
        <Skeleton className={styles.skeletonBlock} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Helmet>
        <title>Enquiries — Oni247</title>
      </Helmet>

      <div>
        <h1 className={styles.title}>Enquiries</h1>
        <p className={styles.subtitle}>
          Messages sent from the contact form on your page.
        </p>
      </div>

      {error && (
        <p className={styles.errorText}>
          {error instanceof Error ? error.message : "Could not load enquiries."}
        </p>
      )}

      {enquiries.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No enquiries yet.</p>
          <p className={styles.emptyBody}>
            Customers who are not ready to order can still write to you from
            your page. Their messages land here.
          </p>
        </div>
      ) : (
        <ul className={styles.list}>
          {enquiries.map((enquiry) => (
            <li key={enquiry.id} className={styles.card}>
              <div className={styles.cardHead}>
                <span className={styles.customer}>{enquiry.customerName}</span>
                <Badge variant={badgeVariant(enquiry.status)}>
                  {enquiry.status}
                </Badge>
              </div>

              <p className={styles.message}>{enquiry.message}</p>

              <div className={styles.contacts}>
                {enquiry.customerPhone && (
                  <>
                    <a
                      className={styles.contactLink}
                      href={`tel:${enquiry.customerPhone.replace(/\s/g, "")}`}
                    >
                      <Phone size={14} />
                      {enquiry.customerPhone}
                    </a>
                    <a
                      className={styles.contactLink}
                      href={buildWhatsAppReplyUrl({
                        phone: enquiry.customerPhone,
                        message: `Hello ${enquiry.customerName}, thank you for your message.`,
                      })}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle size={14} />
                      WhatsApp
                    </a>
                  </>
                )}
                {enquiry.customerEmail && (
                  <a
                    className={styles.contactLink}
                    href={`mailto:${enquiry.customerEmail}`}
                  >
                    <Mail size={14} />
                    {enquiry.customerEmail}
                  </a>
                )}
                <span className={styles.date}>
                  {new Date(enquiry.createdAt).toLocaleString()}
                </span>
              </div>

              <div className={styles.statusRow}>
                {steps
                  .filter((step) => step.status !== enquiry.status)
                  .map((step) => (
                    <Button
                      key={step.status}
                      variant="outline"
                      size="sm"
                      disabled={updateStatus.isPending}
                      onClick={() => {
                        void setStatus(enquiry.id, step.status);
                      }}
                    >
                      {step.label}
                    </Button>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default EnquiriesPage;
