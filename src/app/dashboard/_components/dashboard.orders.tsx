"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Copy,
  MessageCircle,
  Minus,
  NotebookPen,
  Phone,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "../../../../components/Badge";
import { Button } from "../../../../components/Button";
import { Input } from "../../../../components/Input";
import { Skeleton } from "../../../../components/Skeleton";
import { Spinner } from "../../../../components/Spinner";
import { Switch } from "../../../../components/Switch";
import { Textarea } from "../../../../components/Textarea";
import { formatMoney } from "../../../../helpers/formatMoney";
import { buildWhatsAppReplyUrl } from "../../../../helpers/buildWhatsAppReplyUrl";
import { useOrders } from "../../../../helpers/useOrders";
import { useOrderMutations } from "../../../../helpers/useOrderMutations";
import { useProducts } from "../../../../helpers/useProducts";
import { useMyBusiness } from "../../../../helpers/useMyBusiness";
import type {
  OrderPaymentMethod,
  OrderPaymentStatus,
  OrderStatus,
  ShippingStatus,
} from "../../../../helpers/schema";
import styles from "./dashboard.orders.module.css";

type Filter = "all" | OrderStatus;

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "contacted", label: "Contacted" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

const nextSteps: { status: OrderStatus; label: string }[] = [
  { status: "contacted", label: "Contacted" },
  { status: "completed", label: "Completed" },
  { status: "cancelled", label: "Cancelled" },
];

const shippingSteps: { id: ShippingStatus; label: string }[] = [
  { id: "not_required", label: "Collection" },
  { id: "preparing", label: "Preparing" },
  { id: "shipped", label: "Shipped" },
  { id: "out_for_delivery", label: "Out for delivery" },
  { id: "delivered", label: "Delivered" },
];

const badgeVariant = (status: OrderStatus) => {
  if (status === "completed") return "success" as const;
  if (status === "cancelled") return "secondary" as const;
  if (status === "contacted") return "primary" as const;
  return "warning" as const;
};

const paymentLabels: Record<OrderPaymentMethod, string> = {
  cash_on_delivery: "Pay on delivery",
  pay_on_pickup: "Pay on pickup",
  bank_transfer: "Bank transfer",
  online: "Paid online",
};

const OrdersPage = () => {
  const { data, isFetching, error } = useOrders();
  const { data: productData } = useProducts();
  const { data: businessData } = useMyBusiness();
  const businessSlug = businessData?.business?.slug;
  const { update, create, remove } = useOrderMutations();

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const [saleOpen, setSaleOpen] = useState(false);
  const [sale, setSale] = useState({
    customerName: "",
    customerPhone: "",
    deliveryAddress: "",
    markCompleted: true,
  });
  const [saleItems, setSaleItems] = useState<Record<string, number>>({});

  const orders = useMemo(() => data?.orders ?? [], [data]);
  const products = productData?.products ?? [];

  const counts = useMemo(() => {
    const base: Record<Filter, number> = {
      all: orders.length,
      pending: 0,
      contacted: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const order of orders) base[order.status] += 1;
    return base;
  }, [orders]);

  const totals = useMemo(() => {
    let open = 0;
    let earned = 0;
    let currency = "NGN";
    for (const order of orders) {
      currency = order.currency;
      if (order.status === "pending" || order.status === "contacted") {
        open += order.totalAmount;
      }
      if (order.status === "completed") earned += order.totalAmount;
    }
    return { open, earned, currency };
  }, [orders]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesFilter = filter === "all" || order.status === filter;
      const matchesTerm =
        term.length === 0 ||
        order.customerName.toLowerCase().includes(term) ||
        order.trackingCode.toLowerCase().includes(term) ||
        (order.customerPhone ?? "").toLowerCase().includes(term) ||
        order.items.some((line) => line.name.toLowerCase().includes(term));
      return matchesFilter && matchesTerm;
    });
  }, [orders, filter, search]);

  const saleTotal = useMemo(
    () =>
      Object.entries(saleItems).reduce((sum, [id, quantity]) => {
        const product = products.find((item) => item.id === id);
        return sum + (product ? product.price * quantity : 0);
      }, 0),
    [saleItems, products],
  );

  const saleCurrency = products[0]?.currency ?? "NGN";

  const bump = (id: string, delta: number) =>
    setSaleItems((current) => {
      const next = (current[id] ?? 0) + delta;
      if (next <= 0) {
        const { [id]: _removed, ...rest } = current;
        return rest;
      }
      return { ...current, [id]: next };
    });

  const patchOrder = async (
    id: string,
    patch: {
      status?: OrderStatus;
      shippingStatus?: ShippingStatus;
      paymentStatus?: OrderPaymentStatus;
      ownerNote?: string;
    },
  ) => {
    try {
      await update.mutateAsync({ id, ...patch });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update the order.",
      );
    }
  };

  const recordSale = async () => {
    const items = Object.entries(saleItems).map(([productId, quantity]) => ({
      productId,
      quantity,
    }));
    try {
      const result = await create.mutateAsync({
        customerName: sale.customerName,
        customerPhone: sale.customerPhone,
        deliveryAddress: sale.deliveryAddress,
        markCompleted: sale.markCompleted,
        items,
      });
      toast.success(`Sale recorded — reference ${result.trackingCode}.`);
      setSaleOpen(false);
      setSale({
        customerName: "",
        customerPhone: "",
        deliveryAddress: "",
        markCompleted: true,
      });
      setSaleItems({});
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not record the sale.",
      );
    }
  };

  const deleteOrder = async (id: string) => {
    try {
      await remove.mutateAsync({ id });
      toast.success("Order deleted.");
      setConfirmingId(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not delete the order.",
      );
    }
  };

  const copyTracking = (code: string) => {
    void navigator.clipboard
      .writeText(`${window.location.origin}${businessSlug ? `/${businessSlug}/track/${code}` : `/track/${code}`}`)
      .then(() => toast.success("Tracking link copied."))
      .catch(() => toast.error("Could not copy the link."));
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
      

      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Orders</h1>
          <p className={styles.subtitle}>
            Online orders arrive here when a customer places an order at
            checkout. You can also record a sale made in the shop or over the
            phone.
          </p>
        </div>
        {!saleOpen && (
          <Button onClick={() => setSaleOpen(true)}>
            <Plus size={16} />
            Record a sale
          </Button>
        )}
      </div>

      {error && (
        <p className={styles.errorText}>
          {error instanceof Error ? error.message : "Could not load orders."}
        </p>
      )}

      {saleOpen && (
        <section className={styles.form}>
          <div className={styles.formHead}>
            <h2 className={styles.formTitle}>Record a sale</h2>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSaleOpen(false)}
              aria-label="Cancel"
            >
              <X size={16} />
            </Button>
          </div>

          {products.length === 0 ? (
            <p className={styles.subtitle}>
              Add a product first — a sale is built from your catalogue so the
              prices stay consistent.
            </p>
          ) : (
            <>
              <div className={styles.saleFields}>
                <Input
                  value={sale.customerName}
                  onChange={(event) =>
                    setSale({ ...sale, customerName: event.target.value })
                  }
                  placeholder="Customer name"
                  aria-label="Customer name"
                />
                <Input
                  value={sale.customerPhone}
                  onChange={(event) =>
                    setSale({ ...sale, customerPhone: event.target.value })
                  }
                  placeholder="Phone (optional)"
                  inputMode="tel"
                  aria-label="Customer phone"
                />
                <Input
                  value={sale.deliveryAddress}
                  onChange={(event) =>
                    setSale({ ...sale, deliveryAddress: event.target.value })
                  }
                  placeholder="Delivery address (optional)"
                  aria-label="Delivery address"
                />
              </div>

              <div className={styles.picker}>
                {products.map((product) => (
                  <div key={product.id} className={styles.pickerRow}>
                    <div className={styles.pickerText}>
                      <span className={styles.pickerName}>{product.name}</span>
                      <span className={styles.pickerPrice}>
                        {formatMoney(product.price, product.currency)}
                      </span>
                    </div>
                    <div className={styles.stepper}>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        disabled={!saleItems[product.id]}
                        onClick={() => bump(product.id, -1)}
                        aria-label={`Fewer ${product.name}`}
                      >
                        <Minus size={14} />
                      </Button>
                      <span className={styles.qty}>
                        {saleItems[product.id] ?? 0}
                      </span>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => bump(product.id, 1)}
                        aria-label={`More ${product.name}`}
                      >
                        <Plus size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.switchRow}>
                <Switch
                  id="markCompleted"
                  checked={sale.markCompleted}
                  onCheckedChange={(checked) =>
                    setSale({ ...sale, markCompleted: checked })
                  }
                />
                <label htmlFor="markCompleted" className={styles.switchLabel}>
                  Already paid and collected
                </label>
              </div>

              <div className={styles.formActions}>
                <Button
                  onClick={() => {
                    void recordSale();
                  }}
                  disabled={
                    create.isPending ||
                    sale.customerName.trim().length === 0 ||
                    Object.keys(saleItems).length === 0
                  }
                >
                  {create.isPending ? <Spinner size="sm" /> : null}
                  Record {formatMoney(saleTotal, saleCurrency)}
                </Button>
                <Button variant="ghost" onClick={() => setSaleOpen(false)}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </section>
      )}

      {orders.length > 0 && (
        <section className={styles.summary}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryValue}>{counts.pending}</span>
            <span className={styles.summaryLabel}>Awaiting reply</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryValue}>
              {formatMoney(totals.open, totals.currency)}
            </span>
            <span className={styles.summaryLabel}>Open order value</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryValue}>
              {formatMoney(totals.earned, totals.currency)}
            </span>
            <span className={styles.summaryLabel}>Completed</span>
          </div>
        </section>
      )}

      {orders.length > 0 && (
        <div className={styles.controls}>
          <div className={styles.filters}>
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.filter} ${filter === item.id ? styles.filterActive : ""}`}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
                <span className={styles.filterCount}>{counts[item.id]}</span>
              </button>
            ))}
          </div>
          <div className={styles.searchWrap}>
            <Search size={16} className={styles.searchIcon} />
            <Input
              className={styles.searchInput}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, code or item"
              aria-label="Search orders"
            />
          </div>
        </div>
      )}

      {orders.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No orders yet.</p>
          <p className={styles.emptyBody}>
            Share your page link, or record your first in-shop sale above.
          </p>
        </div>
      ) : visible.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Nothing matches that.</p>
          <p className={styles.emptyBody}>
            Try another search term, or switch back to All.
          </p>
        </div>
      ) : (
        <ul className={styles.list}>
          {visible.map((order) => (
            <li key={order.id} className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardWho}>
                  <span className={styles.customer}>{order.customerName}</span>
                  {order.customerPhone && (
                    <div className={styles.contactLinks}>
                      <a
                        className={styles.contactLink}
                        href={`tel:${order.customerPhone.replace(/\s/g, "")}`}
                      >
                        <Phone size={13} />
                        {order.customerPhone}
                      </a>
                      <a
                        className={styles.contactLink}
                        href={buildWhatsAppReplyUrl({
                          phone: order.customerPhone,
                          message: `Hello ${order.customerName}, an update on your order ${order.trackingCode}.\nTrack it here: ${window.location.origin}${businessSlug ? `/${businessSlug}/track/${order.trackingCode}` : `/track/${order.trackingCode}`}\n\n`,
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle size={13} />
                        Reply
                      </a>
                    </div>
                  )}
                </div>
                <div className={styles.headBadges}>
                  {order.source === "direct" && (
                    <Badge variant="secondary">In shop</Badge>
                  )}
                  <Badge variant={badgeVariant(order.status)}>
                    {order.status}
                  </Badge>
                </div>
              </div>

              <div className={styles.trackingRow}>
                <a
                  className={styles.trackingCode}
                  href={businessSlug ? `/${businessSlug}/track/${order.trackingCode}` : `/track/${order.trackingCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {order.trackingCode}
                </a>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyTracking(order.trackingCode)}
                >
                  <Copy size={14} />
                  Copy tracking link
                </Button>
              </div>

              <ul className={styles.lines}>
                {order.items.map((line, index) => (
                  <li key={`${line.productId}-${index}`} className={styles.line}>
                    <span>
                      {line.quantity} × {line.name}
                      {line.variantLabel ? ` (${line.variantLabel})` : ""}
                    </span>
                    <span className={styles.lineTotal}>
                      {formatMoney(line.lineTotal, order.currency)}
                    </span>
                  </li>
                ))}
              </ul>

              {order.deliveryFee > 0 && (
                <ul className={styles.lines}>
                  <li className={styles.line}>
                    <span>
                      Delivery{order.deliveryZone ? ` — ${order.deliveryZone}` : ""}
                    </span>
                    <span className={styles.lineTotal}>
                      {formatMoney(order.deliveryFee, order.currency)}
                    </span>
                  </li>
                </ul>
              )}

              <div className={styles.cardFoot}>
                <span className={styles.total}>
                  {formatMoney(order.totalAmount, order.currency)}
                </span>
                <span className={styles.date}>
                  {new Date(order.createdAt).toLocaleString()}
                </span>
              </div>

              {order.deliveryAddress && (
                <p className={styles.address}>
                  Deliver to {order.deliveryAddress}
                  {order.deliveryZone && order.deliveryFee === 0
                    ? ` (${order.deliveryZone})`
                    : ""}
                </p>
              )}

              {order.deliveryZone === "Pickup" && (
                <p className={styles.address}>Customer will pick this up.</p>
              )}

              {order.customerNote && (
                <p className={styles.savedNote}>Customer note: {order.customerNote}</p>
              )}

              {order.paymentMethod && (
                <div className={styles.shippingRow}>
                  <span className={styles.shippingLabel}>Payment</span>
                  <div className={styles.shippingButtons}>
                    <Badge variant="secondary">{paymentLabels[order.paymentMethod]}</Badge>
                    <Badge variant={order.paymentStatus === "paid" ? "success" : order.paymentStatus === "refunded" ? "secondary" : "warning"}>
                      {order.paymentStatus}
                    </Badge>
                    {order.paymentStatus !== "paid" && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={update.isPending}
                        onClick={() => {
                          void patchOrder(order.id, { paymentStatus: "paid" });
                        }}
                      >
                        Mark paid
                      </Button>
                    )}
                    {order.paymentStatus === "paid" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={update.isPending}
                        onClick={() => {
                          void patchOrder(order.id, { paymentStatus: "unpaid" });
                        }}
                      >
                        Mark unpaid
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <div className={styles.shippingRow}>
                <span className={styles.shippingLabel}>Shipping</span>
                <div className={styles.shippingButtons}>
                  {shippingSteps.map((step) => (
                    <button
                      key={step.id}
                      type="button"
                      className={`${styles.ship} ${order.shippingStatus === step.id ? styles.shipActive : ""}`}
                      disabled={update.isPending}
                      onClick={() => {
                        void patchOrder(order.id, { shippingStatus: step.id });
                      }}
                    >
                      {step.label}
                    </button>
                  ))}
                </div>
              </div>

              {noteFor === order.id ? (
                <div className={styles.noteBox}>
                  <Textarea
                    value={noteText}
                    onChange={(event) => setNoteText(event.target.value)}
                    rows={2}
                    placeholder="Shown to the customer on their tracking page."
                    aria-label="Note for the customer"
                  />
                  <div className={styles.formActions}>
                    <Button
                      size="sm"
                      disabled={update.isPending}
                      onClick={() => {
                        void patchOrder(order.id, { ownerNote: noteText }).then(
                          () => setNoteFor(null),
                        );
                      }}
                    >
                      Save note
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setNoteFor(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                order.ownerNote && (
                  <p className={styles.savedNote}>{order.ownerNote}</p>
                )
              )}

              {confirmingId === order.id ? (
                <div className={styles.statusRow}>
                  <span className={styles.confirmText}>
                    Delete this order permanently?
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={remove.isPending}
                    onClick={() => {
                      void deleteOrder(order.id);
                    }}
                  >
                    Yes, delete
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmingId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className={styles.statusRow}>
                  {nextSteps
                    .filter((step) => step.status !== order.status)
                    .map((step) => (
                      <Button
                        key={step.status}
                        variant="outline"
                        size="sm"
                        disabled={update.isPending}
                        onClick={() => {
                          void patchOrder(order.id, { status: step.status });
                        }}
                      >
                        {step.label}
                      </Button>
                    ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setNoteFor(order.id);
                      setNoteText(order.ownerNote ?? "");
                    }}
                  >
                    <NotebookPen size={15} />
                    Note
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete order"
                    className={styles.deleteButton}
                    onClick={() => setConfirmingId(order.id)}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default OrdersPage;
