import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { CartItem } from '../types/cart';
import { CheckCircle2, Truck, Lock, ArrowRight, ShoppingBag } from 'lucide-react';
import { STORE_CONFIG } from '../config';

export default function OrderSuccess() {
  const location = useLocation();
  const { 
    orderId = crypto.randomUUID().slice(0, 8).toUpperCase(), 
    items = [], 
    totalAmount = 0, 
    customerName = 'Valued Customer', 
    phone = '',
    address = '',
    pincode = '' 
  } = location.state ?? {};

  const displayTotalINR = Math.round(totalAmount / 100).toLocaleString('en-IN');

  return (
    <div className="min-h-screen bg-[#f5f6f8] py-8 sm:py-12 px-4 sm:px-6 flex items-center justify-center">
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100 p-6 sm:p-10 max-w-xl w-full text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Success Header */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto relative shadow-inner">
          <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20"></div>
          <CheckCircle2 className="w-11 h-11 text-green-600 relative z-10 stroke-[2.5]" />
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Order Placed Successfully!
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm font-medium mt-1.5">
            Order ID: <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg ml-1">{orderId?.toString().slice(0, 8).toUpperCase()}</span>
          </p>
        </div>

        {/* ── Mini Receipt ── */}
        {items.length > 0 && (
          <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-4 sm:p-5 text-left shadow-2xs">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 mb-3.5 pb-2.5 border-b border-gray-200 flex items-center justify-between">
              <span>Order Summary</span>
              <span>{items.length} item{items.length !== 1 ? 's' : ''}</span>
            </h3>
            <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
              {items.map((item: CartItem) => (
                <div key={item.id} className="flex items-center gap-3">
                  <img
                    src={item.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800'}
                    alt={item.name}
                    className="w-12 h-12 rounded-xl object-cover border border-gray-200 bg-white shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">{item.name}</p>
                    {(item.size || item.color) && (
                      <p className="text-[11px] font-semibold text-gray-500 mt-0.5">
                        {[item.size && `Size: ${item.size}`, item.color && `Color: ${item.color}`].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    <p className="text-[11px] font-bold text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-xs sm:text-sm font-extrabold text-gray-900 shrink-0">
                    {STORE_CONFIG.symbol || '₹'}{Math.round((item.price * item.quantity) / 100).toLocaleString('en-IN')}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3.5 border-t border-gray-200 flex justify-between items-baseline">
              <span className="text-sm font-extrabold text-gray-900">Total to Pay (COD)</span>
              <span className="text-lg sm:text-xl font-black text-green-700">
                {STORE_CONFIG.symbol || '₹'}{displayTotalINR}
              </span>
            </div>
          </div>
        )}

        {/* Delivery Details Snapshot */}
        {address && (
          <div className="bg-white border border-gray-100 rounded-2xl p-4 text-left text-xs sm:text-sm space-y-2 text-gray-700 shadow-2xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Customer:</span>
              <span className="font-bold text-gray-900">{customerName} {phone ? `(+91 ${phone})` : ''}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Shipping Address:</span>
              <span className="font-medium text-right text-gray-800 max-w-[220px] truncate">{address} {pincode ? `- ${pincode}` : ''}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-gray-50">
              <span className="text-gray-500">Payment Mode:</span>
              <span className="font-extrabold text-black">Cash / UPI on Delivery</span>
            </div>
          </div>
        )}

        {/* ── What Happens Next — COD Timeline ── */}
        <div className="text-left bg-gray-50 border border-gray-200/80 rounded-2xl p-4 sm:p-5">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 mb-4">What happens next?</h3>
          <div className="space-y-3.5">
            {[
              { icon: '📞', step: 'Order Confirmation', desc: 'Our customer care team will message or call to confirm within 24 hours.' },
              { icon: '📦', step: 'Packing & Dispatch', desc: 'Your package is inspected, packed and dispatched in 1–2 business days.' },
              { icon: '🚚', step: 'Out for Delivery', desc: 'You\'ll receive SMS & WhatsApp tracking updates once out for delivery.' },
              { icon: '💵', step: 'Pay on Arrival', desc: `Pay ${STORE_CONFIG.symbol || '₹'}${displayTotalINR} in cash or UPI directly to the courier agent.` },
            ].map((s, i) => (
              <div key={i} className="flex gap-3.5 items-start">
                <span className="text-lg sm:text-xl shrink-0 mt-0.5">{s.icon}</span>
                <div>
                  <p className="text-xs sm:text-sm font-extrabold text-gray-900">{s.step}</p>
                  <p className="text-[11px] sm:text-xs text-gray-500 leading-relaxed mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── WhatsApp Share & CTA Buttons ── */}
        <div className="space-y-3 pt-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(
              `✅ Order Confirmed!\n\nHi ${customerName}, your order #${orderId?.toString().slice(0, 8).toUpperCase()} for ₹${displayTotalINR} has been placed successfully!\n\nYou'll pay ₹${displayTotalINR} in cash or UPI at the time of delivery.\n\nThank you for shopping with us! 🛍️`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-11 flex items-center justify-center gap-2.5 w-full bg-[#25D366] hover:bg-[#20b858] active:scale-95 text-white font-black py-4 rounded-2xl shadow-lg transition-all text-sm sm:text-base"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            <span>Share on WhatsApp</span>
          </a>

          <Link
            to="/"
            className="min-h-11 w-full bg-black hover:bg-gray-800 active:scale-95 text-white py-4 rounded-2xl font-black text-sm sm:text-base transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Continue Shopping</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="pt-2 border-t border-gray-100 flex items-center justify-center gap-1.5 text-[11px] font-bold text-gray-400">
          <Lock className="w-3 h-3" />
          <span>100% Verified Order • Flipkart-Scale Logistics Enabled</span>
        </div>
      </div>
    </div>
  );
}
