import { useMemo } from 'react';
import { CartItem, CheckoutProduct } from '../types/cart';

interface UseCartCheckoutProps {
  singleProduct?: CheckoutProduct | null;
  singleQuantity?: number;
}

export function useCartCheckout({ singleProduct, singleQuantity = 1 }: UseCartCheckoutProps = {}) {
  const items: CartItem[] = useMemo(() => {
    // Step 1: Try reading from localStorage
    try {
      const raw = localStorage.getItem('checkout_cart');
      if (raw) {
        const parsed = JSON.parse(raw);
        const sourceArray = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.items) ? parsed.items : null);
        if (sourceArray && sourceArray.length > 0) {
          return sourceArray.map((item: any) => ({
            id: item.id || item.product_id || crypto.randomUUID(),
            name: item.name || 'Verified Product',
            price: item.price || 0,
            originalPrice: item.originalPrice ?? item.mrp ?? undefined,
            quantity: item.quantity || 1,
            image: item.image ?? item.image_url ?? item.images?.[0] ?? 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800',
            size: item.size ?? item.selectedSize ?? undefined,
            color: item.color ?? item.selectedColor ?? undefined,
          })) as CartItem[];
        }
      }
    } catch (e) {
      console.error('Cart parse error:', e);
    }

    // Step 2: Fallback to single product prop (Buy Now flow)
    if (singleProduct) {
      const displayImage = singleProduct.image ?? singleProduct.image_url ?? singleProduct.images?.[0] ?? 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800';
      const origPrice = singleProduct.originalPrice ?? (singleProduct.discount_percent && singleProduct.discount_percent > 0 ? Math.round(singleProduct.price * (1 + singleProduct.discount_percent / 100)) : undefined);

      return [{
        id: singleProduct.id,
        name: singleProduct.name,
        price: singleProduct.price,
        originalPrice: origPrice,
        quantity: singleQuantity,
        image: displayImage,
      }];
    }

    return [];
  }, [singleProduct, singleQuantity]);

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const isMultiItem = items.length > 1;

  return { items, totalAmount, totalItems, isMultiItem };
}
