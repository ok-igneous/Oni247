import { describe, expect, it } from "vitest";
import { resolveVariantSelection, type ProductVariant } from "./resolveVariantSelection";

const variants: ProductVariant[] = [
  { name: "Size", value: "Small", price: null },
  { name: "Size", value: "Large", price: 1250 },
  { name: "Colour", value: "Black", price: null },
  { name: "Colour", value: "Blue", price: 1500 },
];

describe("resolveVariantSelection", () => {
  it("groups options and requires one valid choice from every group", () => {
    const result = resolveVariantSelection(1000, variants, { Size: "Large" });

    expect(result.missingGroup).toBe("Colour");
    expect(result.invalidGroup).toBeNull();
    expect(result.chosen).toEqual([{ name: "Size", value: "Large" }]);
  });

  it("uses the first selected option carrying an override price", () => {
    const result = resolveVariantSelection(1000, variants, {
      Size: "Large",
      Colour: "Blue",
    });

    expect(result.price).toBe(1250);
    expect(result.label).toBe("Size: Large, Colour: Blue");
    expect(result.key).toBe("Size=Large|Colour=Blue");
    expect(result.missingGroup).toBeNull();
    expect(result.invalidGroup).toBeNull();
  });

  it("rejects a value that is not an option in its group", () => {
    const result = resolveVariantSelection(1000, variants, {
      Size: "Extra Large",
      Colour: "Black",
    });

    expect(result.invalidGroup).toBe("Size");
    expect(result.chosen).toEqual([{ name: "Colour", value: "Black" }]);
  });

  it("keeps the base price when selected options have no price override", () => {
    const result = resolveVariantSelection(1000, variants, {
      Size: "Small",
      Colour: "Black",
    });

    expect(result.price).toBe(1000);
  });

  it("supports products with no variant groups", () => {
    const result = resolveVariantSelection(1000, [], {});

    expect(result.price).toBe(1000);
    expect(result.missingGroup).toBeNull();
    expect(result.invalidGroup).toBeNull();
    expect(result.chosen).toEqual([]);
  });
});
