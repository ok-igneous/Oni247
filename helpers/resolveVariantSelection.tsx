export type ProductVariant = {
  name: string;
  value: string;
  price: number | null;
};

export type VariantGroup = {
  name: string;
  options: ProductVariant[];
};

export type VariantSelection = {
  /** Option groups in the order the owner entered them (e.g. Size, Colour). */
  groups: VariantGroup[];
  /** The unit price after applying the selected option's price, if it has one. */
  price: number;
  /** The options chosen so far, in group order. */
  chosen: Array<{ name: string; value: string }>;
  /** "Size: L, Colour: Red" — empty when nothing is chosen. */
  label: string;
  /** Stable key for cart lines: the same options always give the same key. */
  key: string;
  /** First group with no choice yet, or null when every group is chosen. */
  missingGroup: string | null;
  /** First group whose choice is not one of the product's options, or null. */
  invalidGroup: string | null;
};

/**
 * Shared by the storefront and the order endpoint so the price a customer sees
 * is always the price the server charges. A product's flat variant list
 * ({name: "Size", value: "L"}) is grouped by name; the customer picks one value
 * per group; the first chosen option that carries its own price sets the price.
 */
export const resolveVariantSelection = (
  basePrice: number,
  variants: ProductVariant[],
  selected: Record<string, string>,
): VariantSelection => {
  const groups: VariantGroup[] = [];
  for (const variant of variants) {
    const existing = groups.find((group) => group.name === variant.name);
    if (existing) existing.options.push(variant);
    else groups.push({ name: variant.name, options: [variant] });
  }

  let price = basePrice;
  let priceSet = false;
  let missingGroup: string | null = null;
  let invalidGroup: string | null = null;
  const chosen: Array<{ name: string; value: string }> = [];

  for (const group of groups) {
    const value = selected[group.name];
    if (value === undefined) {
      if (missingGroup === null) missingGroup = group.name;
      continue;
    }
    const hit = group.options.find((option) => option.value === value);
    if (!hit) {
      if (invalidGroup === null) invalidGroup = group.name;
      continue;
    }
    chosen.push({ name: group.name, value });
    if (!priceSet && hit.price !== null && hit.price !== undefined) {
      price = hit.price;
      priceSet = true;
    }
  }

  return {
    groups,
    price,
    chosen,
    label: chosen.map((pick) => `${pick.name}: ${pick.value}`).join(", "),
    key: chosen.map((pick) => `${pick.name}=${pick.value}`).join("|"),
    missingGroup,
    invalidGroup,
  };
};
