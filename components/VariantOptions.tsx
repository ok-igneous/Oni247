import { formatMoney } from "../helpers/formatMoney";
import type { VariantGroup } from "../helpers/resolveVariantSelection";
import styles from "./VariantOptions.module.css";

interface Props {
  groups: VariantGroup[];
  selected: Record<string, string>;
  onSelect: (group: string, value: string) => void;
  currency: string;
  /** Group to highlight as "still needs a choice" after a failed add. */
  highlightGroup?: string | null;
  className?: string;
}

/** One row of selectable chips per option group (Size, Colour, …). */
export const VariantOptions = ({
  groups,
  selected,
  onSelect,
  currency,
  highlightGroup,
  className,
}: Props) => (
  <div className={`${styles.wrap} ${className ?? ""}`}>
    {groups.map((group) => (
      <fieldset
        key={group.name}
        className={`${styles.group} ${highlightGroup === group.name ? styles.needsChoice : ""}`}
      >
        <legend className={styles.legend}>
          {group.name}
          {selected[group.name] ? (
            <span className={styles.picked}>: {selected[group.name]}</span>
          ) : null}
        </legend>
        <div className={styles.chips}>
          {group.options.map((option) => {
            const active = selected[group.name] === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className={`${styles.chip} ${active ? styles.chipActive : ""}`}
                aria-pressed={active}
                onClick={() => onSelect(group.name, option.value)}
              >
                {option.value}
                {option.price !== null && option.price !== undefined ? (
                  <span className={styles.chipPrice}>
                    {formatMoney(option.price, currency)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </fieldset>
    ))}
  </div>
);
