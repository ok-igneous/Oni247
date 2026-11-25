import { describe, expect, it } from "vitest";
import { schema } from "./save_POST.schema";

const validProduct = {
  name: "T-Shirt",
  price: 1000,
  available: true,
  featured: false,
  sortOrder: 0,
};

describe("product save schema variants", () => {
  it("rejects duplicate option values within the same group", () => {
    const result = schema.safeParse({
      ...validProduct,
      variants: [
        { name: "Size", value: "Large", price: 1200 },
        { name: "size", value: "large", price: 1400 },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) =>
        issue.message.includes("must be unique"),
      )).toBe(true);
    }
  });

  it("allows the same option value in different groups", () => {
    const result = schema.safeParse({
      ...validProduct,
      variants: [
        { name: "Size", value: "Standard", price: null },
        { name: "Packaging", value: "Standard", price: 100 },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("allows distinct values in one group", () => {
    const result = schema.safeParse({
      ...validProduct,
      variants: [
        { name: "Size", value: "Small", price: null },
        { name: "Size", value: "Large", price: 1200 },
      ],
    });

    expect(result.success).toBe(true);
  });
});
