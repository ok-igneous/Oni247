import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./Button";
import { Input } from "./Input";
import { Spinner } from "./Spinner";
import { Textarea } from "./Textarea";
import { getEngagement } from "../endpoints/engagement/get_GET.schema";
import { postComment } from "../endpoints/engagement/comment_POST.schema";
import { postReaction } from "../endpoints/engagement/react_POST.schema";
import { getVisitorKey } from "../helpers/visitorKey";
import { friendlyError } from "../helpers/friendlyError";
import type { EngagementTarget, ReactionKind } from "../helpers/parseEngagementSettings";
import styles from "./EngagementSection.module.css";

interface Props {
  slug: string;
  targetType: EngagementTarget;
  targetId: string;
  className?: string;
  /** Name of the article, product, event or gallery, so visitors see what they are reacting to. */
  contextTitle?: string;
}

const KIND_EMOJI: Record<ReactionKind, string> = { like: "👍", love: "❤️", clap: "👏", wow: "😮" };
const KIND_LABEL: Record<ReactionKind, string> = { like: "Like", love: "Love", clap: "Applaud", wow: "Wow" };
const NAME_KEY = "oniduka.commenter";

const timeAgo = (value: Date | string) => {
  const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  if (seconds < 86400 * 30) return `${Math.floor(seconds / 86400)} d ago`;
  return new Date(value).toLocaleDateString();
};

/**
 * Reactions and comments for any public page (blog post, product, event, gallery). What
 * shows, how many comments appear first and in which order is set by the owner under
 * Comments & reactions; this component just follows that configuration.
 */
export const EngagementSection = ({ slug, targetType, targetId, className, contextTitle }: Props) => {
  const queryClient = useQueryClient();
  const [visitorKey, setVisitorKey] = useState<string | null>(null);
  const [order, setOrder] = useState<"recent" | "popular" | null>(null);
  const [limit, setLimit] = useState<number | undefined>(undefined);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [website, setWebsite] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setVisitorKey(getVisitorKey());
    try {
      setName(window.localStorage.getItem(NAME_KEY) ?? "");
    } catch {
      /* ignore */
    }
  }, []);

  const queryKey = useMemo(
    () => ["engagement", slug, targetType, targetId, order, limit] as const,
    [slug, targetType, targetId, order, limit],
  );

  const { data, isFetching, error } = useQuery({
    queryKey,
    enabled: visitorKey !== null,
    queryFn: () =>
      getEngagement({
        slug,
        targetType,
        targetId,
        visitorKey: visitorKey as string,
        order: order ?? undefined,
        limit,
      }),
    staleTime: 10_000,
    retry: false,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["engagement", slug, targetType, targetId] });

  const react = useMutation({
    mutationFn: (input: { targetType: EngagementTarget | "comment"; targetId: string; kind: ReactionKind | null }) =>
      postReaction({ slug, visitorKey: visitorKey as string, ...input }),
    onSuccess: refresh,
    onError: (err) => toast.error(friendlyError(err, "Could not save your reaction.")),
  });

  const comment = useMutation({
    mutationFn: () => postComment({ slug, targetType, targetId, authorName: name, body, website }),
    onSuccess: (result) => {
      setBody("");
      setNotice(result.message);
      try {
        window.localStorage.setItem(NAME_KEY, name);
      } catch {
        /* ignore */
      }
      void refresh();
    },
    onError: (err) => toast.error(friendlyError(err, "Could not post your comment.")),
  });

  if (error || !data) return null;
  const { config, reactions, comments } = data;
  if (!config.commentsEnabled && !config.reactionsEnabled) return null;

  const activeOrder = order ?? config.defaultOrder;
  const kinds: ReactionKind[] = config.reactionStyle === "multi" ? ["like", "love", "clap", "wow"] : ["like"];

  return (
    <section className={`${styles.section} ${className ?? ""}`} aria-label={contextTitle ? `Reactions and comments on ${contextTitle}` : "Reactions and comments"}>
      {config.reactionsEnabled && contextTitle && (
        <p style={{ margin: "0 0 8px", fontWeight: 650 }}>What do you think of “{contextTitle}”?</p>
      )}
      {config.reactionsEnabled && (
        <div className={styles.reactions} role="group" aria-label="React">
          {kinds.map((kind) => {
            const on = reactions.mine === kind;
            return (
              <button
                key={kind}
                type="button"
                className={`${styles.reaction} ${on ? styles.reactionOn : ""}`}
                aria-pressed={on}
                disabled={react.isPending}
                onClick={() => react.mutate({ targetType, targetId, kind: on ? null : kind })}
              >
                {config.reactionStyle === "like" ? (
                  <Heart size={16} className={on ? styles.filled : ""} aria-hidden="true" />
                ) : (
                  <span aria-hidden="true">{KIND_EMOJI[kind]}</span>
                )}
                <span>{config.reactionStyle === "like" ? (on ? "Liked" : "Like") : KIND_LABEL[kind]}</span>
                <span className={styles.count}>{reactions.counts[kind]}</span>
              </button>
            );
          })}
        </div>
      )}

      {config.commentsEnabled && (
        <div className={styles.comments}>
          <div className={styles.commentsHead}>
            <h2 className={styles.heading}>
              <MessageCircle size={18} aria-hidden="true" /> Comments ({comments.total}){contextTitle ? ` on “${contextTitle}”` : ""}
            </h2>
            {comments.total > 1 && (
              <div className={styles.tabs} role="group" aria-label="Order comments">
                {(["recent", "popular"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`${styles.tab} ${activeOrder === item ? styles.tabOn : ""}`}
                    aria-pressed={activeOrder === item}
                    onClick={() => {
                      setOrder(item);
                      setLimit(undefined);
                    }}
                  >
                    {item === "recent" ? "Recent" : "Popular"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {comments.items.length === 0 ? (
            <p className={styles.empty}>No comments yet. Be the first to share your thoughts.</p>
          ) : (
            <ul className={styles.list}>
              {comments.items.map((item) => (
                <li key={item.id} className={styles.comment}>
                  <div className={styles.avatar} aria-hidden="true">{item.authorName.charAt(0).toUpperCase()}</div>
                  <div className={styles.commentBody}>
                    <div className={styles.commentMeta}>
                      <strong>{item.authorName}</strong>
                      <span>{timeAgo(item.createdAt)}</span>
                    </div>
                    <p className={styles.text}>{item.body}</p>
                    <button
                      type="button"
                      className={`${styles.like} ${item.likedByMe ? styles.likeOn : ""}`}
                      aria-pressed={item.likedByMe}
                      disabled={react.isPending}
                      onClick={() =>
                        react.mutate({
                          targetType: "comment",
                          targetId: item.id,
                          kind: item.likedByMe ? null : "like",
                        })
                      }
                    >
                      <ThumbsUp size={13} aria-hidden="true" /> {item.likeCount > 0 ? item.likeCount : "Like"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {comments.hasMore && (
            <Button
              variant="outline"
              size="sm"
              disabled={isFetching}
              onClick={() => setLimit((comments.items.length || config.initialCount) + 10)}
            >
              {isFetching ? <Spinner size="sm" /> : null}
              Show more comments
            </Button>
          )}

          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              setNotice(null);
              comment.mutate();
            }}
          >
            <h3 className={styles.formTitle}>Leave a comment</h3>
            <label className={styles.field}>
              <span>Your name</span>
              <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} autoComplete="name" placeholder="Your name" required />
            </label>
            <label className={styles.field}>
              <span>Comment</span>
              <Textarea value={body} onChange={(event) => setBody(event.target.value)} rows={3} maxLength={1000} placeholder="Share your thoughts" required />
            </label>
            {/* Honeypot: hidden from people, tempting to bots. */}
            <div className={styles.trap} aria-hidden="true">
              <label>
                Website
                <input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
              </label>
            </div>
            <div className={styles.formActions}>
              <Button type="submit" disabled={comment.isPending || name.trim().length < 2 || body.trim().length < 2}>
                {comment.isPending ? <Spinner size="sm" /> : null}
                Post comment
              </Button>
              {config.moderation === "manual" && (
                <span className={styles.hint}>Comments appear after the owner approves them.</span>
              )}
            </div>
            {notice && <p className={styles.notice} role="status">{notice}</p>}
          </form>
        </div>
      )}
    </section>
  );
};