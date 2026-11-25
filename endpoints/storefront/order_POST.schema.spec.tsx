import { describe, expect, it } from "vitest";
import { schema } from "./order_POST.schema";

const validOrder = {
  slug: "sample-shop",
  customerName: "Ada",
  customerPhone: "08031234567",
  items: [{ productId: "00000000-0000-4000-8000-000000000001", quantity: 1 }],
};

describe("storefront order schema", () => {
  it("accepts a valid optional customer email", () => {
    expect(schema.parse({ ...validOrder, customerEmail: "ada@example.com" }).customerEmail)
      .toBe("ada@example.com");
  });

  it("normalizes an empty optional email to null", () => {
    expect(schema.parse({ ...validOrder, customerEmail: "  " }).customerEmail).toBeNull();
  });

  it("normalizes an omitted optional email to null", () => {
    expect(schema.parse(validOrder).customerEmail).toBeNull();
  });

  it("rejects a malformed customer email", () => {
    expect(schema.safeParse({ ...validOrder, customerEmail: "not-an-email" }).success)
      .toBe(false);
  });

  it("rejects an email that exceeds the supported length", () => {
    const email = `${"a".repeat(110)}@example.com`;
    expect(schema.safeParse({ ...validOrder, customerEmail: email }).success).toBe(false);
  });
});
