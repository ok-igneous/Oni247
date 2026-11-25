export type CheckoutZone = { id: string; name: string; fee: number };

export type CheckoutSettings = {
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  pickupNote: string;
  zones: CheckoutZone[];
  /** Orders at or above this subtotal get free delivery. null = never free. */
  freeDeliveryOver: number | null;
  deliveryNote: string;
  returnPolicy: string;
  paymentMethods: {
    cashOnDelivery: boolean;
    bankTransfer: boolean;
    payOnPickup: boolean;
  };
  bank: { bankName: string; accountName: string; accountNumber: string };
};

const text = (value: unknown, max: number): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const money = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.round(value * 100) / 100
    : null;

/**
 * Reads the checkout_settings jsonb column defensively. Works on both server and
 * client, and always returns a complete object, so a business that never opened
 * the settings page behaves like a simple "pay on delivery" shop.
 */
export const parseCheckoutSettings = (raw: unknown): CheckoutSettings => {
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const payments =
    source.paymentMethods &&
    typeof source.paymentMethods === "object" &&
    !Array.isArray(source.paymentMethods)
      ? (source.paymentMethods as Record<string, unknown>)
      : {};
  const bank =
    source.bank && typeof source.bank === "object" && !Array.isArray(source.bank)
      ? (source.bank as Record<string, unknown>)
      : {};

  const zones: CheckoutZone[] = Array.isArray(source.zones)
    ? source.zones
        .map((zone, index): CheckoutZone | null => {
          if (!zone || typeof zone !== "object") return null;
          const row = zone as Record<string, unknown>;
          const name = text(row.name, 80);
          const fee = money(row.fee);
          if (!name || fee === null) return null;
          return {
            id: typeof row.id === "string" && row.id ? row.id : `zone-${index + 1}`,
            name,
            fee,
          };
        })
        .filter((zone): zone is CheckoutZone => zone !== null)
        .slice(0, 40)
    : [];

  return {
    deliveryEnabled: source.deliveryEnabled !== false,
    pickupEnabled: source.pickupEnabled === true,
    pickupNote: text(source.pickupNote, 200),
    zones,
    freeDeliveryOver: money(source.freeDeliveryOver),
    deliveryNote: text(source.deliveryNote, 200),
    returnPolicy: text(source.returnPolicy, 600),
    paymentMethods: {
      cashOnDelivery: payments.cashOnDelivery !== false,
      bankTransfer: payments.bankTransfer === true,
      payOnPickup: payments.payOnPickup !== false,
    },
    bank: {
      bankName: text(bank.bankName, 80),
      accountName: text(bank.accountName, 120),
      accountNumber: text(bank.accountNumber, 30),
    },
  };
};
