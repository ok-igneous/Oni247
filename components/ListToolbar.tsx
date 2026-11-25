import { Search, X } from "lucide-react";
import { Button } from "./Button";
import { Input } from "./Input";
import styles from "./ListToolbar.module.css";

export type ListFilterOption = { value: string; label: string; count?: number };

export type ListFilter = {
  id: string;
  label: string;
  value: string;
  options: ListFilterOption[];
  onChange: (value: string) => void;
};

interface Props {
  search: string;
  onSearch: (value: string) => void;
  placeholder: string;
  filters?: ListFilter[];
  /** Shown as "Showing X of Y" once a search or filter narrows the list. */
  shown?: number;
  total?: number;
  className?: string;
}

/** Search box plus filter chips shared by every list in the owner dashboard. */
export const ListToolbar = ({
  search,
  onSearch,
  placeholder,
  filters = [],
  shown,
  total,
  className,
}: Props) => {
  const filtering =
    search.trim() !== "" || filters.some((filter) => filter.value !== "all");

  const clear = () => {
    onSearch("");
    filters.forEach((filter) => filter.onChange("all"));
  };

  return (
    <div className={`${styles.toolbar} ${className ?? ""}`} role="search">
      <div className={styles.searchWrap}>
        <Search size={16} className={styles.searchIcon} aria-hidden="true" />
        <Input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className={styles.search}
        />
        {search && (
          <button
            type="button"
            className={styles.clearSearch}
            aria-label="Clear search"
            onClick={() => onSearch("")}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {filters.map((filter) => (
        <div key={filter.id} className={styles.group} role="group" aria-label={filter.label}>
          {[{ value: "all", label: "All" }, ...filter.options].map((option) => {
            const on = filter.value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className={`${styles.chip} ${on ? styles.chipOn : ""}`}
                aria-pressed={on}
                onClick={() => filter.onChange(option.value)}
              >
                {option.label}
                {"count" in option && typeof option.count === "number" ? (
                  <span className={styles.count}>{option.count}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      ))}

      {filtering && typeof shown === "number" && typeof total === "number" && (
        <div className={styles.summary}>
          <span>
            Showing {shown} of {total}
          </span>
          <Button variant="ghost" size="sm" onClick={clear}>
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
};