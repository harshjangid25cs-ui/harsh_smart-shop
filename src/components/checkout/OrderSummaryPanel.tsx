import React from 'react';
import { CartItem } from '../../types/cart';
import { Lock, ShieldCheck, RotateCcw } from 'lucide-react';
import { STORE_CONFIG } from '../../config';

interface OrderSummaryPanelProps {
  items: CartItem[];
  deliveryCharge?: number;
  className?: string;
}

export default function OrderSummaryPanel({
  items,
  deliveryCharge = 0,
  className = ''
}: OrderSummaryPanelProps) {
  if (!items || items.length === 0) {
    return null;
  }

  // Calculate subtotal in raw units (paise in this platform)
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Calculate savings if originalPrice is provided and greater than sale price
  const totalSavings = items.reduce((sum, item) => {
    if (item.originalPrice && item.originalPrice > item.price) {
      return sum + (item.originalPrice - item.price) * item.quantity;
    }
    return sum;
  }, 0);

  const grandTotal = subtotal + deliveryCharge;

  // Formatting helper for currency display (converts paise to Rupees)
  const formatINR = (val: number) => Math.round(val / 100).toLocaleString('en-IN');

  return (
    <div className={`w-full text-gray-800 flex flex-col justify-between ${className}`}>
      {/* Items List */}
      <div className="space-y-4 max-h-[40vh] sm:max-h-[320px] overflow-y-auto pr-1 no-scrollbar border-b border-gray-100 pb-4">
        {items.map((item) => {
          const itemTotal = item.price * item.quantity;
          const hasDiscount = item.originalPrice && item.originalPrice > item.price;
          const itemOriginalTotal = hasDiscount ? (item.originalPrice! * item.quantity) : 0;

          return (
            <div key={item.id} className="flex gap-3 items-start justify-between">
              <img
                src={item.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800'}
                alt={item.name}
                className="w-12 h-12 rounded-lg object-cover bg-gray-50 border border-gray-200 shrink-0"
                loading="lazy"
              />
              <div className="flex-1 min-w-0 pr-2">
                <h4 className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-2 leading-tight">
                  {item.name}
                </h4>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {(item.size || item.color) && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700">
                      {[item.size && `Size: ${item.size}`, item.color && `${item.color}`].filter(Boolean).join(' · ')}
                    </span>
                  )}
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                    Qty: {item.quantity}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs sm:text-sm font-extrabold text-gray-900">
                  {STORE_CONFIG.symbol || '₹'}{formatINR(itemTotal)}
                </div>
                {hasDiscount && (
                  <div className="text-[11px] font-semibold text-gray-400 line-through">
                    {STORE_CONFIG.symbol || '₹'}{formatINR(itemOriginalTotal)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Price Breakdown */}
      <div className="py-4 space-y-2.5 text-xs sm:text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal ({items.reduce((acc, i) => acc + i.quantity, 0)} items)</span>
          <span className="font-bold text-gray-900">{STORE_CONFIG.symbol || '₹'}{formatINR(subtotal)}</span>
        </div>

        <div className="flex justify-between text-gray-600">
          <span>Delivery</span>
          <span className="font-extrabold text-green-600">
            {deliveryCharge === 0 ? 'FREE' : `${STORE_CONFIG.symbol || '₹'}${formatINR(deliveryCharge)}`}
          </span>
        </div>

        {totalSavings > 0 && (
          <div className="flex justify-between text-green-700 bg-green-50 px-2.5 py-1.5 rounded-lg font-bold">
            <span>Total Savings</span>
            <span>You save {STORE_CONFIG.symbol || '₹'}{formatINR(totalSavings)}</span>
          </div>
        )}

        <div className="pt-3 border-t border-gray-200 flex justify-between items-baseline">
          <span className="text-sm sm:text-base font-extrabold text-gray-900">Grand Total</span>
          <span className="text-lg sm:text-xl font-black text-gray-900">{STORE_CONFIG.symbol || '₹'}{formatINR(grandTotal)}</span>
        </div>
      </div>

      {/* Trust Badge Row */}
      <div className="mt-2 pt-3 border-t border-gray-100 flex items-center justify-center gap-1.5 text-[11px] font-bold text-gray-500 text-center">
        <Lock className="w-3.5 h-3.5 text-gray-600 shrink-0" />
        <span>100% Secure • Cash on Delivery • Easy Returns</span>
      </div>
    </div>
  );
}
