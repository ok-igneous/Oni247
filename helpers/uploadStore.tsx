export type UploadJob = {
  id: string;
  name: string;
  step: "preparing" | "uploading" | "saving" | "done" | "error";
  percent: number;
  message: string;
  error?: string;
};

type Listener = () => void;

let jobs: UploadJob[] = [];
const listeners = new Set<Listener>();
/** Library picks arrive as files named __lib__…; this maps them back to the stored URL. */
const libraryUrls = new Map<string, string>();
let counter = 0;

const emit = () => {
  jobs = [...jobs];
  listeners.forEach((listener) => listener());
};

const patchJob = (id: string, patch: Partial<UploadJob>) => {
  jobs = jobs.map((job) => (job.id === id ? { ...job, ...patch } : job));
  emit();
};

/**
 * Tiny shared store behind the upload progress dialog. Every call to
 * uploadImage reports here, so any upload anywhere in the dashboard shows what
 * is happening without each page wiring up its own spinner.
 */
export const uploadStore = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot(): UploadJob[] {
    return jobs;
  },
  start(name: string): string {
    counter += 1;
    const id = `upload-${Date.now()}-${counter}`;
    jobs = [
      ...jobs,
      { id, name, step: "preparing", percent: 2, message: "Getting ready…" },
    ];
    emit();
    return id;
  },
  update(id: string, patch: Partial<Omit<UploadJob, "id" | "name">>) {
    patchJob(id, patch);
  },
  finish(id: string) {
    patchJob(id, { step: "done", percent: 100, message: "Uploaded" });
    setTimeout(() => {
      jobs = jobs.filter((job) => job.id !== id);
      emit();
    }, 700);
  },
  fail(id: string, error: string) {
    patchJob(id, { step: "error", error, message: "Upload failed" });
  },
  dismiss(id: string) {
    jobs = jobs.filter((job) => job.id !== id);
    emit();
  },
  dismissFailed() {
    jobs = jobs.filter((job) => job.step !== "error");
    emit();
  },
  registerLibraryFile(fileName: string, url: string) {
    libraryUrls.set(fileName, url);
  },
  takeLibraryUrl(fileName: string): string | null {
    const url = libraryUrls.get(fileName);
    if (!url) return null;
    libraryUrls.delete(fileName);
    return url;
  },
};
