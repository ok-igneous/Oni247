import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, Search } from "lucide-react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Skeleton } from "../components/Skeleton";
import { getAdminBusinesses } from "../endpoints/admin/businesses_GET.schema";
import { postAdminSetStatus } from "../endpoints/admin/setStatus_POST.schema";
import { subscriptionPlan } from "../helpers/subscriptionPlan";
import styles from "./admin.businesses.module.css";

const AdminBusinessesPage = () => {
  const queryClient = useQueryClient();
  const { data, isFetching, error } = useQuery({
    queryKey: ["admin", "businesses"],
    queryFn: () => getAdminBusinesses(),
    retry: false,
  });

  const setStatus = useMutation({
    mutationFn: (input: Parameters<typeof postAdminSetStatus>[0]) => postAdminSetStatus(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });

  const [search, setSearch] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);

  const businesses = useMemo(() => data?.businesses ?? [], [data]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return businesses;
    return businesses.filter(
      (business) =>
        business.name.toLowerCase().includes(term) ||
        business.slug.toLowerCase().includes(term) ||
        business.ownerEmail.toLowerCase().includes(term),
    );
  }, [businesses, search]);

  const change = async (businessId: string, status: "published" | "suspended") => {
    try {
      await setStatus.mutateAsync({ businessId, status });
      toast.success(status === "suspended" ? "Shop suspended." : "Shop restored.");
      setConfirming(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update the shop.",
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

  if (error || !data) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Businesses</h1>
        <p className={styles.errorText}>
          {error instanceof Error ? error.message : "Could not load businesses."}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Helmet>
        <title>Businesses — Oni247 Admin</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className={styles.head}>
        <h1 className={styles.title}>Businesses</h1>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <Input
            className={styles.searchInput}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, slug or owner email"
            aria-label="Search businesses"
          />
        </div>
      </div>

      <ul className={styles.list}>
        {visible.map((business) => {
          const plan = subscriptionPlan.resolve(business);
          const suspended = business.status === "suspended";
          return (
            <li key={business.id} className={styles.row}>
              <div className={styles.rowMain}>
                <div className={styles.rowText}>
                  <span className={styles.rowName}>
                    {business.name}
                    {business.isDemo && (
                      <Badge variant="secondary" className={styles.demoBadge}>
                        demo
                      </Badge>
                    )}
                  </span>
                  <span className={styles.rowMeta}>
                    /{business.slug} · {business.ownerEmail}
                  </span>
                  <span className={styles.rowMeta}>
                    {business.productCount} products · {business.orderCount} orders
                    · joined{" "}
                    {new Date(business.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className={styles.badges}>
                  <Badge
                    variant={
                      suspended
                        ? "destructive"
                        : business.status === "published"
                          ? "success"
                          : "secondary"
                    }
                  >
                    {business.status}
                  </Badge>
                  <Badge variant={plan.isPremium ? "primary" : "secondary"}>
                    {plan.source === "trial"
                      ? `trial ${plan.trialDaysLeft}d`
                      : plan.source === "paid"
                        ? "premium"
                        : plan.lapsed
                          ? "lapsed"
                          : "free"}
                  </Badge>
                </div>
              </div>

              <div className={styles.actions}>
                <Button asChild variant="ghost" size="sm">
                  <a
                    href={`/${business.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={14} />
                    View
                  </a>
                </Button>

                {confirming === business.id ? (
                  <>
                    <span className={styles.confirmText}>
                      Hide this shop from the public?
                    </span>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={setStatus.isPending}
                      onClick={() => {
                        void change(business.id, "suspended");
                      }}
                    >
                      Suspend
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirming(null)}
                    >
                      Cancel
                    </Button>
                  </>
                ) : suspended ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={setStatus.isPending}
                    onClick={() => {
                      void change(business.id, "published");
                    }}
                  >
                    Restore
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirming(business.id)}
                  >
                    Suspend
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {visible.length === 0 && (
        <p className={styles.muted}>No businesses match that search.</p>
      )}

      <p className={styles.muted}>
        Suspending hides the public page only. The owner keeps their dashboard
        and every product, order and message.
      </p>
    </div>
  );
};

export default AdminBusinessesPage;
