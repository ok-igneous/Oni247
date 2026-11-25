import { formatMoney } from "./formatMoney";
import { normalizeWhatsAppNumber } from "./normalizeWhatsAppNumber";

type OrderLine = {
  name: string;
  quantity: number;
  unitPrice: number | string;
};

type BuildWhatsAppOrderUrlInput = {
  businessName: string;
  whatsappNumber: string;
  items: OrderLine[];
  currency?: string;
  customerName?: string | null;
  customerPhone?: string | null;
  note?: string | null;
  /** Default country calling code used when a local number starts with 0. */
  defaultCallingCode?: string;
};

/**
 * Builds the wa.me deep link for an order. Pure and framework-free so it can move
 * to any host untouched.
 */
export const buildWhatsAppOrderUrl = ({
  businessName,
  whatsappNumber,
  items,
  currency = "NGN",
  customerName,
  customerPhone,
  note,
  defaultCallingCode = "234",
}: BuildWhatsAppOrderUrlInput): string => {
  const number = normalizeWhatsAppNumber(whatsappNumber, defaultCallingCode);

  const lines: string[] = [`Hello ${businessName},`, ""];

  if (items.length > 0) {
    lines.push("I would like to order:");
    for (const item of items) {
      const unit =
        typeof item.unitPrice === "string"
          ? Number.parseFloat(item.unitPrice)
          : item.unitPrice;
      const lineTotal = (Number.isNaN(unit) ? 0 : unit) * item.quantity;
      lines.push(
        `${item.quantity} × ${item.name} — ${formatMoney(lineTotal, currency)}`,
      );
    }

    const total = items.reduce((sum, item) => {
      const unit =
        typeof item.unitPrice === "string"
          ? Number.parseFloat(item.unitPrice)
          : item.unitPrice;
      return sum + (Number.isNaN(unit) ? 0 : unit) * item.quantity;
    }, 0);

    lines.push("");
    lines.push(`Total: ${formatMoney(total, currency)}`);
  } else {
    lines.push("I would like to make an enquiry.");
  }

  if (customerName?.trim()) {
    lines.push("");
    lines.push(`Name: ${customerName.trim()}`);
  }
  if (customerPhone?.trim()) {
    lines.push(`Phone: ${customerPhone.trim()}`);
  }
  if (note?.trim()) {
    lines.push("");
    lines.push(note.trim());
  }

  lines.push("");
  lines.push("Please confirm availability.");

  return `https://wa.me/${number}?text=${encodeURIComponent(lines.join("\n"))}`;
};
