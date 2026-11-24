/**
 * Portable money formatting. No Floot dependency.
 * Prices arrive from Postgres NUMERIC columns as strings, so both are accepted.
 */
export const formatMoney = (
  amount: number | string | null | undefined,
  currency: string = "NGN",
  locale: string = "en-NG",
): string => {
  const value = typeof amount === "string" ? Number.parseFloat(amount) : amount;
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString(locale)}`;
  }
};
