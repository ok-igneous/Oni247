import { Helmet } from "react-helmet";
import { toast } from "sonner";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { useEnquiries } from "../helpers/useEnquiries";
import { useEnquiryStatus } from "../helpers/useEnquiryStatus";
import { buildWhatsAppReplyUrl } from "../helpers/buildWhatsAppReplyUrl";
   10	import type { EnquiryStatus } from "../helpers/schema";
   11	import styles from "./dashboard.enquiries.module.css";
   12	
   13	const steps: { status: EnquiryStatus; label: string }[] = [
   14	  { status: "contacted", label: "Contacted" },
   15	  { status: "resolved", label: "Resolved" },
   16	  { status: "new", label: "Reopen" },
   17	];
   18	
   19	const badgeVariant = (status: EnquiryStatus) => {
   20	  if (status === "resolved") return "success" as const;
   21	  if (status === "contacted") return "primary" as const;
   22	  return "warning" as const;
   23	};
   24	
   25	const EnquiriesPage = () => {
   26	  const { data, isFetching, error } = useEnquiries();
   27	  const updateStatus = useEnquiryStatus();
   28	
   29	  const enquiries = data?.enquiries ?? [];
   30	
   31	  const setStatus = async (id: string, status: EnquiryStatus) => {
   32	    try {
   33	      await updateStatus.mutateAsync({ id, status });
   34	    } catch (err) {
   35	      toast.error(
   36	        err instanceof Error ? err.message : "Could not update the enquiry.",
   37	      );
   38	    }
   39	  };
   40	
   41	  if (isFetching && !data) {
   42	    return (
   43	      <div className={styles.page}>
   44	        <Skeleton className={styles.skeletonTitle} />
   45	        <Skeleton className={styles.skeletonBlock} />
   46	      </div>
   47	    );
   48	  }
   49	
   50	  return (
   51	    <div className={styles.page}>
   52	      <Helmet>
   53	        <title>Enquiries — Oniduka</title>
   54	      </Helmet>
   55	
   56	      <div>
   57	        <h1 className={styles.title}>Enquiries</h1>
   58	        <p className={styles.subtitle}>
   59	          Messages sent from the contact form on your page.
   60	        </p>
   61	      </div>
   62	
   63	      {error && (
   64	        <p className={styles.errorText}>
   65	          {error instanceof Error ? error.message : "Could not load enquiries."}
   66	        </p>
   67	      )}
   68	
   69	      {enquiries.length === 0 ? (
   70	        <div className={styles.empty}>
   71	          <p className={styles.emptyTitle}>No enquiries yet.</p>
   72	          <p className={styles.emptyBody}>
   73	            Customers who are not ready to order can still write to you from
   74	            your page. Their messages land here.
   75	          </p>
   76	        </div>
   77	      ) : (
   78	        <ul className={styles.list}>
   79	          {enquiries.map((enquiry) => (
   80	            <li key={enquiry.id} className={styles.card}>
   81	              <div className={styles.cardHead}>
   82	                <span className={styles.customer}>{enquiry.customerName}</span>
   83	                <Badge variant={badgeVariant(enquiry.status)}>
   84	                  {enquiry.status}
   85	                </Badge>
   86	              </div>
   87	
   88	              <p className={styles.message}>{enquiry.message}</p>
   89	
   90	              <div className={styles.contacts}>
   91	                {enquiry.customerPhone && (
   92	                  <>
   93	                    <a
   94	                      className={styles.contactLink}
   95	                      href={`tel:${enquiry.customerPhone.replace(/\s/g, "")}`}
   96	                    >
   97	                      <Phone size={14} />
   98	                      {enquiry.customerPhone}
   99	                    </a>
  100	                    <a
  101	                      className={styles.contactLink}
  102	                      href={buildWhatsAppReplyUrl({
  103	                        phone: enquiry.customerPhone,
  104	                        message: `Hello ${enquiry.customerName}, thank you for your message.`,
  105	                      })}
  106	                      target="_blank"
  107	                      rel="noopener noreferrer"
  108	                    >
  109	                      <MessageCircle size={14} />
  110	                      WhatsApp
  111	                    </a>
  112	                  </>
  113	                )}
  114	                {enquiry.customerEmail && (
  115	                  <a
  116	                    className={styles.contactLink}
  117	                    href={`mailto:${enquiry.customerEmail}`}
  118	                  >
  119	                    <Mail size={14} />
  120	                    {enquiry.customerEmail}
  121	                  </a>
  122	                )}
  123	                <span className={styles.date}>
  124	                  {new Date(enquiry.createdAt).toLocaleString()}
  125	                </span>
  126	              </div>
  127	
  128	              <div className={styles.statusRow}>
  129	                {steps
  130	                  .filter((step) => step.status !== enquiry.status)
  131	                  .map((step) => (
  132	                    <Button
  133	                      key={step.status}
  134	                      variant="outline"
  135	                      size="sm"
  136	                      disabled={updateStatus.isPending}
  137	                      onClick={() => {
  138	                        void setStatus(enquiry.id, step.status);
  139	                      }}
  140	                    >
  141	                      {step.label}
  142	                    </Button>
  143	                  ))}
  144	              </div>
  145	            </li>
  146	          ))}
  147	        </ul>
  148	      )}
  149	    </div>
  150	  );
  151	};
  152	
  153	export default EnquiriesPage;
