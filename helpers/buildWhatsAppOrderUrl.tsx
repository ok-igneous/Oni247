import { formatMoney } from "./formatMoney";
import { normalizeWhatsAppNumber } from "./normalizeWhatsAppNumber";

type OrderLine = {
  name: string;
  quantity: number;
  unitPrice: number | string;
};

   10	type BuildWhatsAppOrderUrlInput = {
   11	  businessName: string;
   12	  whatsappNumber: string;
   13	  items: OrderLine[];
   14	  currency?: string;
   15	  customerName?: string | null;
   16	  customerPhone?: string | null;
   17	  note?: string | null;
   18	  /** Default country calling code used when a local number starts with 0. */
   19	  defaultCallingCode?: string;
   20	};
   21	
   22	/**
   23	 * Builds the wa.me deep link for an order. Pure and framework-free so it can move
   24	 * to any host untouched.
   25	 */
   26	export const buildWhatsAppOrderUrl = ({
   27	  businessName,
   28	  whatsappNumber,
   29	  items,
   30	  currency = "NGN",
   31	  customerName,
   32	  customerPhone,
   33	  note,
   34	  defaultCallingCode = "234",
   35	}: BuildWhatsAppOrderUrlInput): string => {
   36	  const number = normalizeWhatsAppNumber(whatsappNumber, defaultCallingCode);
   37	
   38	  const lines: string[] = [`Hello ${businessName},`, ""];
   39	
   40	  if (items.length > 0) {
   41	    lines.push("I would like to order:");
   42	    for (const item of items) {
   43	      const unit =
   44	        typeof item.unitPrice === "string"
   45	          ? Number.parseFloat(item.unitPrice)
   46	          : item.unitPrice;
   47	      const lineTotal = (Number.isNaN(unit) ? 0 : unit) * item.quantity;
   48	      lines.push(
   49	        `${item.quantity} × ${item.name} — ${formatMoney(lineTotal, currency)}`,
   50	      );
   51	    }
   52	
   53	    const total = items.reduce((sum, item) => {
   54	      const unit =
   55	        typeof item.unitPrice === "string"
   56	          ? Number.parseFloat(item.unitPrice)
   57	          : item.unitPrice;
   58	      return sum + (Number.isNaN(unit) ? 0 : unit) * item.quantity;
   59	    }, 0);
   60	
   61	    lines.push("");
   62	    lines.push(`Total: ${formatMoney(total, currency)}`);
   63	  } else {
   64	    lines.push("I would like to make an enquiry.");
   65	  }
   66	
   67	  if (customerName?.trim()) {
   68	    lines.push("");
   69	    lines.push(`Name: ${customerName.trim()}`);
   70	  }
   71	  if (customerPhone?.trim()) {
   72	    lines.push(`Phone: ${customerPhone.trim()}`);
   73	  }
   74	  if (note?.trim()) {
   75	    lines.push("");
   76	    lines.push(note.trim());
   77	  }
   78	
   79	  lines.push("");
   80	  lines.push("Please confirm availability.");
   81	
   82	  return `https://wa.me/${number}?text=${encodeURIComponent(lines.join("\n"))}`;
   83	};
