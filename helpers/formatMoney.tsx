/**
 * Portable money formatting. No Floot dependency.
 * Prices arrive from Postgres NUMERIC columns as strings, so both are accepted.
 */
export const formatMoney = (
  amount: number | string | null | undefined,
  currency: string = "NGN",
  locale: string = "en-NG",
): string => {
   10	  const value = typeof amount === "string" ? Number.parseFloat(amount) : amount;
   11	  if (value === null || value === undefined || Number.isNaN(value)) {
   12	    return "—";
   13	  }
   14	  try {
   15	    return new Intl.NumberFormat(locale, {
   16	      style: "currency",
   17	      currency,
   18	      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
   19	      maximumFractionDigits: 2,
   20	    }).format(value);
   21	  } catch {
   22	    return `${currency} ${value.toLocaleString(locale)}`;
   23	  }
   24	};
