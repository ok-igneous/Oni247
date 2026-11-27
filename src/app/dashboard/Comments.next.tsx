import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, EyeOff, MessageSquare, ThumbsUp, Trash2 } from "lucide-react";
import { Badge } from "../../../components/Badge";
import { Button } from "../../../components/Button";
import { Input } from "../../../components/Input";
import { ListToolbar } from "../../../components/ListToolbar";
import { Skeleton } from "../../../components/Skeleton";
import { Spinner } from "../../../components/Spinner";
import { Switch } from "../../../components/Switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/Select";
import { friendlyError } from "../../../helpers/friendlyError";
import { useMyBusiness } from "../../../helpers/useMyBusiness";
import {
  useModerateComments,
  useOwnerComments,
  useSaveEngagementSettings,
} from "../../../helpers/useEngagementAdmin";
import {
  ENGAGEMENT_TARGETS,
  parseEngagementSettings,
  type EngagementSettings,
  type EngagementTarget,
} from "../../../helpers/parseEngagementSettings";
import type { OwnerComment } from "../../../endpoints/engagement/ownerComments_GET.schema";
import styles from "../../../pages/dashboard.comments.module.css";

const TARGET_LABELS: Record<EngagementTarget, string> = {
  blog: "Blog posts",
  product: "Products",
  event: "Events",
  gallery: "Galleries",
};

const statusVariant = (status: OwnerComment["status"]) =>
  status === "approved" ? "success" : status === "pending" ? "warning" : "secondary";

const CommentsPage = () => {
  const { data, isLoading, error } = useOwnerComments();
  const { data: businessData } = useMyBusiness();
  const moderate = useModerateComments();
  const saveSettings = useSaveEngagementSettings();

  const [view, setView] = useState<"comments" | "settings">("comments");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [settings, setSettings] = useState<EngagementSettings | null>(null);

  const business = businessData?.business ?? null;
  useEffect(() => {
    if (business && !settings) setSettings(parseEngagementSettings(business.engagementSettings));
  }, [business, settings]);

  const comments = data?.comments ?? [];
  const pending = comments.filter((comment) => comment.status === "pending");

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    return comments.filter(
      (comment) =>
        (status === "all" || comment.status === status) &&
        (type === "all" || comment.targetType === type) &&
        (term === "" ||
          comment.body.toLowerCase().includes(term) ||
          comment.authorName.toLowerCase().includes(term) ||
          comment.targetTitle.toLowerCase().includes(term)),
    );
  }, [comments, search, status, type]);

  const act = async (ids: string[], action: "approve" | "hide" | "delete") => {
    try {
      await moderate.mutateAsync({ ids, action });
      toast.success(
        action === "approve" ? "Comment approved." : action === "hide" ? "Comment hidden." : "Comment deleted.",
      );
    } catch (err) {
      toast.error(friendlyError(err, "Could not update the comment."));
    }
  };

  const saveAll = async () => {
    if (!settings) return;
    try {
      await saveSettings.mutateAsync(settings);
      toast.success("Comments and reactions settings saved.");
    } catch (err) {
      toast.error(friendlyError(err, "Could not save the settings."));
    }
  };

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Skeleton className={styles.skeletonTitle} />
        <Skeleton className={styles.skeletonBlock} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      
      <div>
        <h1 className={styles.title}>Comments &amp; reactions</h1>
        <p className={styles.subtitle}>
          Choose where visitors can comment and react, then approve or remove what they post.
        </p>
      </div>

      <div className={styles.tabs} role="tablist">
        <button type="button" role="tab" aria-selected={view === "comments"} className={`${styles.tab} ${view === "comments" ? styles.tabOn : ""}`} onClick={() => setView("comments")}>
          Comments {pending.length > 0 && <Badge variant="warning">{pending.length} to review</Badge>}
        </button>
        <button type="button" role="tab" aria-selected={view === "settings"} className={`${styles.tab} ${view === "settings" ? styles.tabOn : ""}`} onClick={() => setView("settings")}>
          Settings
        </button>
      </div>

      {error && <p className={styles.error}>{friendlyError(error, "Could not load comments.")}</p>}

      {view === "comments" && (
        <>
          {comments.length === 0 ? (
            <div className={styles.empty}>
              <MessageSquare size={24} />
              <p>No comments yet. When visitors comment on your blog, products or events, they will show up here.</p>
            </div>
          ) : (
            <>
              <ListToolbar
                search={search}
                onSearch={setSearch}
                placeholder="Search comments"
                shown={shown.length}
                total={comments.length}
                filters={[
                  {
                    id: "status",
                    label: "Status",
                    value: status,
                    onChange: setStatus,
                    options: [
                      { value: "pending", label: "To review", count: comments.filter((c) => c.status === "pending").length },
                      { value: "approved", label: "Live", count: comments.filter((c) => c.status === "approved").length },
                      { value: "hidden", label: "Hidden", count: comments.filter((c) => c.status === "hidden").length },
                    ],
                  },
                  {
                    id: "type",
                    label: "Where",
                    value: type,
                    onChange: setType,
                    options: ENGAGEMENT_TARGETS.filter((target) => comments.some((c) => c.targetType === target)).map((target) => ({
                      value: target,
                      label: TARGET_LABELS[target],
                    })),
                  },
                ]}
              />
              {pending.length > 1 && (
                <div>
                  <Button variant="outline" size="sm" disabled={moderate.isPending} onClick={() => void act(pending.slice(0, 100).map((c) => c.id), "approve")}>
                    <Check size={14} /> Approve all {pending.length} waiting
                  </Button>
                </div>
              )}
              {shown.length === 0 ? (
                <p className={styles.subtitle}>No comment matches that search.</p>
              ) : (
                <ul className={styles.list}>
                  {shown.map((comment) => (
                    <li key={comment.id} className={styles.item}>
                      <div className={styles.itemHead}>
                        <strong>{comment.authorName}</strong>
                        <Badge variant={statusVariant(comment.status)}>
                          {comment.status === "approved" ? "Live" : comment.status === "pending" ? "To review" : "Hidden"}
                        </Badge>
                        <span className={styles.meta}>
                          {TARGET_LABELS[comment.targetType]} · {comment.targetTitle}
                        </span>
                      </div>
                      <p className={styles.body}>{comment.body}</p>
                      <div className={styles.itemFoot}>
                        <span className={styles.meta}>
                          {new Date(comment.createdAt).toLocaleString()}
                          {comment.likeCount > 0 && (
                            <> · <ThumbsUp size={12} /> {comment.likeCount}</>
                          )}
                        </span>
                        <div className={styles.rowActions}>
                          {comment.status !== "approved" && (
                            <Button size="sm" variant="outline" disabled={moderate.isPending} onClick={() => void act([comment.id], "approve")}>
                              <Check size={14} /> Approve
                            </Button>
                          )}
                          {comment.status !== "hidden" && (
                            <Button size="sm" variant="ghost" disabled={moderate.isPending} onClick={() => void act([comment.id], "hide")}>
                              <EyeOff size={14} /> Hide
                            </Button>
                          )}
                          <Button size="icon-sm" variant="ghost" aria-label="Delete comment" disabled={moderate.isPending} onClick={() => void act([comment.id], "delete")}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </>
      )}

      {view === "settings" && settings && (
        <div className={styles.settings}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Where visitors can interact</h2>
            <div className={styles.matrix}>
              <span />
              <strong>Comments</strong>
              <strong>Likes &amp; reactions</strong>
              {ENGAGEMENT_TARGETS.map((target) => (
                <div key={target} className={styles.matrixRow}>
                  <span>{TARGET_LABELS[target]}</span>
                  <Switch
                    aria-label={`Comments on ${TARGET_LABELS[target]}`}
                    checked={settings.comments[target]}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, comments: { ...settings.comments, [target]: checked } })
                    }
                  />
                  <Switch
                    aria-label={`Reactions on ${TARGET_LABELS[target]}`}
                    checked={settings.reactions[target]}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, reactions: { ...settings.reactions, [target]: checked } })
                    }
                  />
                </div>
              ))}
            </div>
            <p className={styles.hint}>
              A single blog post can override this from its own editor.
            </p>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>How comments show</h2>
            <div className={styles.twoUp}>
              <div className={styles.field}>
                <span className={styles.label}>Show first</span>
                <Select value={settings.defaultOrder} onValueChange={(value) => setSettings({ ...settings, defaultOrder: value as EngagementSettings["defaultOrder"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most recent comments</SelectItem>
                    <SelectItem value="popular">Most liked comments</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className={styles.field}>
                <span className={styles.label}>Comments shown before &quot;Show more&quot;</span>
                <Input
                  className={styles.numberInput}
                  inputMode="numeric"
                  value={String(settings.initialCount)}
                  onChange={(event) => {
                    const value = Number.parseInt(event.target.value.replace(/\D/g, ""), 10);
                    setSettings({ ...settings, initialCount: Number.isNaN(value) ? 1 : value });
                  }}
                />
                <span className={styles.hint}>Between 1 and 50. Visitors can switch between recent and popular themselves.</span>
              </label>
            </div>
            <div className={styles.twoUp}>
              <div className={styles.field}>
                <span className={styles.label}>New comments</span>
                <Select value={settings.moderation} onValueChange={(value) => setSettings({ ...settings, moderation: value as EngagementSettings["moderation"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Appear straight away</SelectItem>
                    <SelectItem value="manual">Wait for my approval</SelectItem>
                  </SelectContent>
                </Select>
                <span className={styles.hint}>Comments with several links always wait for approval.</span>
              </div>
              <div className={styles.field}>
                <span className={styles.label}>Reaction style</span>
                <Select value={settings.reactionStyle} onValueChange={(value) => setSettings({ ...settings, reactionStyle: value as EngagementSettings["reactionStyle"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="like">Like button only</SelectItem>
                    <SelectItem value="multi">Like, love, applause and wow</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <div>
            <Button disabled={saveSettings.isPending} onClick={() => void saveAll()}>
              {saveSettings.isPending ? <Spinner size="sm" /> : null}
              Save settings
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentsPage;
