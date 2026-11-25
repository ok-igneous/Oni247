/**
 * One key per real phone number, so "0803 123 4567", "+234 803 123 4567" and
 * "2348031234567" all land on the same customer. Digits only; a leading 0 is
 * treated as a Nigerian local number (234…). Backend use only.
 */
export const normalizeCustomerPhone = (raw: string): string => {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) return `234${digits.slice(1)}`;
  return digits;
};
