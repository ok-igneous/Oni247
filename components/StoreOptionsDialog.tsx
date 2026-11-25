import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "./Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./Dialog";
import { VariantOptions } from "./VariantOptions";
import { formatMoney } from "../helpers/formatMoney";
import {
  resolveVariantSelection,
  type ProductVariant,
} from "../helpers/resolveVariantSelection";
import type { StoreCartItem } from "../helpers/useStoreCart";

export type OptionsDialogProduct = {
  id: string;
  name: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  variants?: ProductVariant[];
  stockQuantity?: number | null;
};

interface Props {
  product: OptionsDialogProduct | null;
  onClose: () => void;
  onConfirm: (item: StoreCartItem) => void;
}

/** Lets a shopper pick Size/Colour etc. from a product card, on any plan. */
export const StoreOptionsDialog = ({ product, onClose, onConfirm }: Props) => {
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [highlight, setHighlight] = useState<string | null>(null);

  useEffect(() => {
    setSelected({});
    setHighlight(null);
  }, [product?.id]);

  const resolved = useMemo(
    () =>
      product
        ? resolveVariantSelection(product.price, product.variants ?? [], selected)
        : null,
    [product, selected],
  );

  if (!product || !resolved) return null;

  const confirm = () => {
    if (resolved.missingGroup) {
      setHighlight(resolved.missingGroup);
      toast.error(`Choose a ${resolved.missingGroup} first.`);
      return;
    }
    onConfirm({
      productId: product.id,
      name: product.name,
      price: resolved.price,
      currency: product.currency,
      imageUrl: product.imageUrl,
      variants: resolved.chosen,
      variantLabel: resolved.label || null,
      maxQuantity: product.stockQuantity ?? null,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>
            Choose your options · {formatMoney(resolved.price, product.currency)}
          </DialogDescription>
        </DialogHeader>
        <VariantOptions
          groups={resolved.groups}
          selected={selected}
          highlightGroup={highlight}
          currency={product.currency}
          onSelect={(group, value) => {
            setHighlight(null);
            setSelected((current) => ({ ...current, [group]: value }));
          }}
        />
        <DialogFooter>
          <Button onClick={confirm}>Add to cart</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};