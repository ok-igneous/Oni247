import type { Transaction } from "kysely";
import type { DB } from "./schema";

type StockLine = { productId: string; quantity: number };

type Mode =
  /** Storefront sale: refuse when there is not enough stock. */
  | "take"
  /** Owner-recorded sale or reactivation: reduce, but never below zero. */
  | "takeClamped"
  /** Cancelled order: put the stock back. */
  | "give";

/**
 * Moves stock for a set of order lines inside the caller's transaction. Only
 * products that track stock (stock_quantity is not null) are touched. Rows are
 * locked first, so two customers can never both buy the last item. Backend only.
 */
export const adjustProductStock = async (
  trx: Transaction<DB>,
  businessId: string,
  lines: StockLine[],
  mode: Mode,
): Promise<void> => {
  const totals = new Map<string, number>();
  for (const line of lines) {
    totals.set(line.productId, (totals.get(line.productId) ?? 0) + line.quantity);
  }
  if (totals.size === 0) return;

  const rows = await trx
    .selectFrom("products")
    .select(["id", "name", "stockQuantity"])
    .where("businessId", "=", businessId)
    .where("id", "in", [...totals.keys()])
    .forUpdate()
    .execute();

  for (const row of rows) {
    if (row.stockQuantity === null) continue;
    const quantity = totals.get(row.id) ?? 0;
    let next: number;
    if (mode === "give") {
      next = row.stockQuantity + quantity;
    } else if (mode === "takeClamped") {
      next = Math.max(0, row.stockQuantity - quantity);
    } else {
      if (row.stockQuantity < quantity) {
        throw new Error(
          row.stockQuantity === 0
            ? `${row.name} just sold out.`
            : `Only ${row.stockQuantity} left of ${row.name}.`,
        );
      }
      next = row.stockQuantity - quantity;
    }
    await trx
      .updateTable("products")
      .set({ stockQuantity: next, updatedAt: new Date() })
      .where("id", "=", row.id)
      .where("businessId", "=", businessId)
      .execute();
  }
};
