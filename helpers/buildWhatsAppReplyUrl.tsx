import { normalizeWhatsAppNumber } from "./normalizeWhatsAppNumber";

/**
 * A shop replying to a customer. Separate from the order link, which runs the
 * other way round.
 */
export const buildWhatsAppReplyUrl = ({
  phone,
  message,
  defaultCallingCode = "234",
}: {
  phone: string;
  message: string;
  defaultCallingCode?: string;
}): string => {
  const number = normalizeWhatsAppNumber(phone, defaultCallingCode);
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
};
