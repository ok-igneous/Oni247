import { normalizeWhatsAppNumber } from "./normalizeWhatsAppNumber";

/**
 * A shop replying to a customer. Separate from the order link, which runs the
 * other way round.
 */
export const buildWhatsAppReplyUrl = ({
  phone,
  message,
   10	  defaultCallingCode = "234",
   11	}: {
   12	  phone: string;
   13	  message: string;
   14	  defaultCallingCode?: string;
   15	}): string => {
   16	  const number = normalizeWhatsAppNumber(phone, defaultCallingCode);
   17	  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
   18	};
