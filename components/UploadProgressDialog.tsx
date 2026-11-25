import { useSyncExternalStore } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "./Button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./Dialog";
import { Progress } from "./Progress";
import { uploadStore, type UploadJob } from "../helpers/uploadStore";
import { cancelImageUpload, retryImageUpload } from "../helpers/uploadImage";
import styles from "./UploadProgressDialog.module.css";

const empty: UploadJob[] = [];

/** Shows every running upload with a progress bar, plus a plain-language reason if one fails. */
export const UploadProgressDialog = () => {
  const jobs = useSyncExternalStore(uploadStore.subscribe, uploadStore.getSnapshot, () => empty);
  const active = jobs.some((job) => job.step !== "done" && job.step !== "error");
  const failed = jobs.filter((job) => job.step === "error").length;

  const title = active
    ? jobs.length > 1
      ? `Uploading ${jobs.length} images`
      : "Uploading your image"
    : failed > 0
      ? "Some uploads did not finish"
      : "Upload complete";

  return (
    <Dialog
      open={jobs.length > 0}
      onOpenChange={(open) => {
        // Running uploads cannot be hidden; failed ones can.
        if (!open) uploadStore.dismissFailed();
      }}
    >
      <DialogContent
        className={styles.content}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => {
          if (active) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {active
              ? "Please keep this page open until it finishes."
              : failed > 0
                ? "Read the message below, then try again."
                : "All done."}
          </DialogDescription>
        </DialogHeader>

        <ul className={styles.list} role="status" aria-live="polite">
          {jobs.map((job) => (
            <li key={job.id} className={styles.job}>
              <div className={styles.row}>
                <span className={styles.icon} aria-hidden="true">
                  {job.step === "error" ? (
                    <AlertTriangle size={16} className={styles.errorIcon} />
                  ) : job.step === "done" ? (
                    <CheckCircle2 size={16} className={styles.doneIcon} />
                  ) : (
                    <Loader2 size={16} className={styles.spin} />
                  )}
                </span>
                <span className={styles.name}>{job.name}</span>
              </div>
              {job.step === "error" ? (
                <div className={styles.errorBox}>
                  <p className={styles.errorText}>{job.error}</p>
                  <div className={styles.errorActions}>
                    <Button size="sm" onClick={() => retryImageUpload(job.id)}>Retry</Button>
                  <Button size="sm" variant="outline" onClick={() => uploadStore.dismiss(job.id)}>
                    Dismiss
                  </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Progress value={job.percent} aria-label={`Upload progress for ${job.name}`} />
                  <span className={styles.message}>{job.message}</span>
                  {job.step === "uploading" && <Button size="sm" variant="outline" onClick={() => cancelImageUpload(job.id)}>Cancel upload</Button>}
                </>
              )}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
};
