import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, MessageCircle, Search, Users } from "lucide-react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Skeleton } from "../components/Skeleton";
import { Spinner } from "../components/Spinner";
import { Textarea } from "../components/Textarea";
import { formatMoney } from "../helpers/formatMoney";
import { buildWhatsAppReplyUrl } from "../helpers/buildWhatsAppReplyUrl";
import { useCustomers, useCustomerNotes } from "../helpers/useCustomers";
import { useMyBusiness } from "../helpers/useMyBusiness";
import type { OwnerCustomer } from "../endpoints/customers/list_GET.schema";
import styles from "./dashboard.customers.module.css";

const formatDate = (value: Date | null) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "No orders yet";

const CustomerRow = ({
  customer,
  currency,
  shopName,
}: {
  customer: OwnerCustomer;
  currency: string;
  shopName: string;
}) => {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(customer.notes ?? "");
  const saveNotes = useCustomerNotes();

  const reply = buildWhatsAppReplyUrl({
    phone: customer.phone,
    message: `Hello ${customer.name.split(" ")[0]}, this is ${shopName}.`,
  });

  return (
    <li className={styles.row}>
      <div className={styles.rowMain}>
        <div className={styles.rowText}>
          <span className={styles.rowName}>
            {customer.name}
            {customer.orderCount >= 2 && <Badge variant="success">Repeat</Badge>}
          </span>
          <span className={styles.rowMeta}>{customer.phone}</span>
        </div>
        <div className={styles.stats}>
          <span>
            <strong>{customer.orderCount}</strong> {customer.orderCount === 1 ? "order" : "orders"}
          </span>
          <span className={styles.money}>{formatMoney(customer.totalSpent, currency)}</span>
          <span className={styles.rowMeta}>{formatDate(customer.lastOrderAt)}</span>
        </div>
        <div className={styles.rowActions}>
          <Button asChild variant="outline" size="sm">
            <a href={reply} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={14} /> WhatsApp
            </a>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={open ? "Hide details" : "Show details"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>
        </div>
      </div>

      {open && (
        <div className={styles.detail}>
          {customer.lastAddress && (
            <p className={styles.detailLine}>
              <span className={styles.detailLabel}>Last address</span> {customer.lastAddress}
            </p>
          )}
          {customer.email && (
            <p className={styles.detailLine}>
              <span className={styles.detailLabel}>Email</span> {customer.email}
            </p>
          )}

          <div className={styles.orders}>
            <span className={styles.detailLabel}>Recent orders</span>
            {customer.recentOrders.length === 0 ? (
              <span className={styles.rowMeta}>No orders linked yet.</span>
            ) : (
              <ul className={styles.orderList}>
                {customer.recentOrders.map((order) => (
                  <li key={order.id} className={styles.orderItem}>
                    <span className={styles.code}>{order.trackingCode}</span>
                    <span className={styles.orderSummary}>{order.itemSummary}</span>
                    <Badge variant={order.status === "cancelled" ? "destructive" : order.status === "completed" ? "success" : "secondary"}>
                      {order.status}
                    </Badge>
                    <span className={styles.money}>{formatMoney(order.totalAmount, order.currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <label className={styles.notes}>
            <span className={styles.detailLabel}>Private notes</span>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              placeholder="Preferences, delivery tips, anything worth remembering. Only you see this."
            />
          </label>
          <div>
            <Button
              size="sm"
              variant="outline"
              disabled={saveNotes.isPending || notes === (customer.notes ?? "")}
              onClick={() => {
                saveNotes
                  .mutateAsync({ id: customer.id, notes })
                  .then(() => toast.success("Note saved."))
                  .catch((err: unknown) =>
                    toast.error(err instanceof Error ? err.message : "Could not save the note."),
                  );
              }}
            >
              {saveNotes.isPending ? <Spinner size="sm" /> : null}
              Save note
            </Button>
          </div>
        </div>
      )}
    </li>
  );
};

const CustomersPage = () => {
  const { data, isFetching, error } = useCustomers();
  const { data: businessData } = useMyBusiness();
  const [search, setSearch] = useState("");

  const business = businessData?.business ?? null;
  const currency = business?.currency ?? "NGN";
  const customers = data?.customers ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(term) ||
        customer.phone.replace(/\s/g, "").includes(term.replace(/\s/g, "")),
    );
  }, [customers, search]);

  const repeat = customers.filter((customer) => customer.orderCount >= 2).length;
  const best = customers.reduce<OwnerCustomer | null>(
    (top, customer) => (top === null || customer.totalSpent > top.totalSpent ? customer : top),
    null,
  );

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
        <title>Customers — Oni247</title>
      </Helmet>

      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Customers</h1>
          <p className={styles.subtitle}>
            Everyone who has ordered from you, grouped by phone number. Customers are added
            automatically when an order comes in.
          </p>
        </div>
      </div>

      {error && (
        <p className={styles.errorText}>
          {error instanceof Error ? error.message : "Could not load customers."}
        </p>
      )}

      {customers.length > 0 && (
        <div className={styles.summary}>
          <div className={styles.summaryItem}>
            <span className={styles.rowMeta}>Customers</span>
            <strong>{customers.length}</strong>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.rowMeta}>Repeat buyers</span>
            <strong>{repeat}</strong>
          </div>
          {best && best.totalSpent > 0 && (
            <div className={styles.summaryItem}>
              <span className={styles.rowMeta}>Top customer</span>
              <strong>{best.name} · {formatMoney(best.totalSpent, currency)}</strong>
            </div>
          )}
        </div>
      )}

      {customers.length === 0 ? (
        <div className={styles.empty}>
          <Users size={22} />
          <p className={styles.emptyTitle}>No customers yet.</p>
          <p className={styles.emptyBody}>
            When someone places an order on your page, they appear here with their order
            history, so you can see who comes back.
          </p>
        </div>
      ) : (
        <>
          <div className={styles.searchWrap}>
            <Search size={15} className={styles.searchIcon} />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or phone"
              aria-label="Search customers"
              className={styles.searchInput}
            />
          </div>
          {filtered.length === 0 ? (
            <p className={styles.rowMeta}>No customer matches that search.</p>
          ) : (
            <ul className={styles.list}>
              {filtered.map((customer) => (
                <CustomerRow
                  key={customer.id}
                  customer={customer}
                  currency={currency}
                  shopName={business?.name ?? "the shop"}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

export default CustomersPage;
