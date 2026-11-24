/**
 * Turns a raw stored number into the digits-only form wa.me expects.
 * "0803 123 4567" -> "2348031234567"; "+234 803 123 4567" -> "2348031234567".
 */
export const normalizeWhatsAppNumber = (
  raw: string,
  defaultCallingCode: string = "234",
): string => {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.startsWith("00")) return digits.slice(2);
  if (raw.trim().startsWith("+")) return digits;
  if (digits.startsWith("0")) return `${defaultCallingCode}${digits.slice(1)}`;
  if (digits.startsWith(defaultCallingCode)) return digits;
  return digits;
};
