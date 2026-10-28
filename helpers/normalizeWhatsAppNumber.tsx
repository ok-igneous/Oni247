/**
 * Turns a raw stored number into the digits-only form wa.me expects.
 * "0803 123 4567" -> "2348031234567"; "+234 803 123 4567" -> "2348031234567".
 */
export const normalizeWhatsAppNumber = (
  raw: string,
  defaultCallingCode: string = "234",
): string => {
  const digits = (raw ?? "").replace(/\D/g, "");
   10	  if (digits.length === 0) return "";
   11	  if (digits.startsWith("00")) return digits.slice(2);
   12	  if (raw.trim().startsWith("+")) return digits;
   13	  if (digits.startsWith("0")) return `${defaultCallingCode}${digits.slice(1)}`;
   14	  if (digits.startsWith(defaultCallingCode)) return digits;
   15	  return digits;
   16	};
