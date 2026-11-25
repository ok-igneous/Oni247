import { useState } from "react";
import { toast } from "sonner";
import { Button } from "./Button";
import { Skeleton } from "./Skeleton";
import { useEmailWorkspace, useEmailWorkspaceAction } from "../helpers/useEmail";
import type { ComposeInitial } from "./EmailCompose";
import type { EmailTemplate } from "../helpers/emailTemplate";
import styles from "./EmailWorkspace.module.css";

const when = (d: Date) => new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export function EmailDrafts({ onOpen }: { onOpen: (draft: ComposeInitial) => void }) {
  const { data, isFetching } = useEmailWorkspace();
  const act = useEmailWorkspaceAction();
  if (isFetching && !data) return <Skeleton style={{ height: 120 }} />;
  const drafts = data?.drafts ?? [];
  return (
    <section className={styles.panel}>
      <h2>Drafts</h2>
      {drafts.length === 0 ? (
        <p className={styles.hint}>No drafts yet. In Compose, press Save draft to keep an email and finish it later.</p>
      ) : (
        <div className={styles.list}>
          {drafts.map((d) => {
            const rec = (d.recipients ?? {}) as { people?: Array<{ email: string; name: string }>; manual?: string };
            return (
              <div className={styles.row} key={d.id}>
                <span className={styles.rowMain}>
                  <strong>{d.subject || "(no subject)"}</strong>
                  <span className={styles.meta}>Saved {when(d.updatedAt)} · {(rec.people ?? []).length} chosen</span>
                </span>
                <span className={styles.rowActions}>
                  <Button size="sm" onClick={() => onOpen({
                    draftId: d.id,
                    subject: d.subject,
                    message: d.message,
                    chosen: Object.fromEntries((rec.people ?? []).map((p) => [p.email, p.name])),
                    manual: rec.manual ?? "",
                    look: d.look && typeof d.look === "object" ? (d.look as Partial<EmailTemplate>) : null,
                  })}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => { if (window.confirm("Delete this draft?")) act.mutate({ op: "draft.delete", id: d.id }, { onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete.") }); }}>Delete</Button>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function EmailInbox({ onReply }: { onReply: (draft: ComposeInitial) => void }) {
  const { data, isFetching } = useEmailWorkspace();
  const act = useEmailWorkspaceAction();
  const [openId, setOpenId] = useState<string | null>(null);
  if (isFetching && !data) return <Skeleton style={{ height: 120 }} />;
  const inbox = data?.inbox ?? [];
  const open = inbox.find((m) => m.id === openId) ?? null;

  const show = (id: string, isRead: boolean) => {
    setOpenId(id);
    if (!isRead) act.mutate({ op: "inbox.read", id, read: true });
  };

  return (
    <section className={styles.panel}>
      <h2>Inbox</h2>
      {data?.inboxAddress ? (
        <p className={styles.hint}>Replies to your emails arrive here. Your inbox address is <strong>{data.inboxAddress}</strong>.</p>
      ) : (
        <div className={styles.notice}>Replies to your emails still go to your own email address. Once receiving is switched on for Oni247's email domain, replies will also arrive here.</div>
      )}
      {open ? (
        <div className={styles.stack}>
          <div className={styles.actions}>
            <Button size="sm" variant="outline" onClick={() => setOpenId(null)}>Back to inbox</Button>
            <Button size="sm" onClick={() => onReply({ subject: open.subject.toLowerCase().startsWith("re:") ? open.subject : `Re: ${open.subject}`, message: "", chosen: { [open.fromEmail]: open.fromName }, manual: "", look: null })}>Reply</Button>
            <Button size="sm" variant="ghost" onClick={() => { act.mutate({ op: "inbox.read", id: open.id, read: false }); setOpenId(null); }}>Mark unread</Button>
            <Button size="sm" variant="ghost" onClick={() => { act.mutate({ op: "inbox.delete", id: open.id }); setOpenId(null); }}>Delete</Button>
          </div>
          <div>
            <strong>{open.subject || "(no subject)"}</strong>
            <div className={styles.meta}>{open.fromName ? `${open.fromName} · ` : ""}{open.fromEmail} · {when(open.receivedAt)}</div>
          </div>
          <div className={styles.body}>{open.body || "(empty message)"}</div>
        </div>
      ) : inbox.length === 0 ? (
        <p className={styles.hint}>No messages yet.</p>
      ) : (
        <div className={styles.list}>
          {inbox.map((m) => (
            <button key={m.id} type="button" className={styles.row} style={{ background: "transparent", border: 0, borderBottom: "1px solid var(--border)", textAlign: "left", cursor: "pointer", color: "inherit", font: "inherit" }} onClick={() => show(m.id, m.isRead)}>
              <span className={m.isRead ? styles.dotOff : styles.dot} />
              <span className={`${styles.rowMain} ${m.isRead ? "" : styles.unread}`}>
                <strong>{m.fromName || m.fromEmail}</strong>
                <span>{m.subject || "(no subject)"}</span>
                <span className={styles.meta}>{when(m.receivedAt)}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
