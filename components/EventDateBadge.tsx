import styles from "./EventDateBadge.module.css";

/** Calendar-style tile: month on top, big day number below. */
export const EventDateBadge = ({ date, muted = false }: { date: Date | string; muted?: boolean }) => {
  const value = new Date(date);
  return (
    <div className={`${styles.badge} ${muted ? styles.muted : ""}`} aria-hidden="true">
      <span className={styles.month}>{value.toLocaleDateString(undefined, { month: "short" })}</span>
      <span className={styles.day}>{value.getDate()}</span>
    </div>
  );
};
