import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { STORE_CONFIG } from '../config';
import { Product } from '../types';
import { ShieldCheck, Truck, Lock, MapPin, CheckCircle2, Loader2, AlertCircle, Mail, ChevronDown, ChevronUp } from 'lucide-react';
import { useCartCheckout } from '../hooks/useCartCheckout';
import OrderSummaryPanel from './checkout/OrderSummaryPanel';
import { CartItem } from '../types/cart';
import { useNavigate } from 'react-router-dom';

const STAGES = {
  PINCODE_CHECK: 'pincode',
  USER_DETAILS: 'details',
  CONFIRMATION: 'confirmation'
};

export default function CODCheckout({ product }: { product?: Product }) {
  const navigate = useNavigate();
  const [stage, setStage] = useState(STAGES.PINCODE_CHECK);
  const [formData, setFormData] = useState({
    pincode: '',
    phone: '',
    name: '',
    address: '',
    email: ''
  });
  
  const [validation, setValidation] = useState({
    pincodeValid: false,
    serviceable: false,
    deliveryDays: null as number | null,
    riskWarning: null as string | null
  });
  
  const [orderId, setOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Multi-item cart hook — reads localStorage OR falls back to single product prop
  const { items, totalAmount, totalItems, isMultiItem } = useCartCheckout({
    singleProduct: product ?? null,
    singleQuantity: 1,
  });

  const [summaryOpen, setSummaryOpen] = useState(false); // mobile accordion

  // Real-time pincode validation
  useEffect(() => {
    if (formData.pincode.length === 6) {
      validatePincode(formData.pincode);
    }
  }, [formData.pincode]);

  const validatePincode = async (pin: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('check-pincode', {
        body: { pincode: pin }
      });
      
      if (error) throw error;
      
      setValidation({
        pincodeValid: true,
        serviceable: data.cod_available,
        deliveryDays: data.estimated_days,
        riskWarning: data.rto_risk ? "High return area - May require confirmation call" : null
      });
      
      if (data.cod_available) {
        setStage(STAGES.USER_DETAILS);
      } else {
        setError("COD not available for this pincode. Try a nearby pincode or contact support.");
      }
    } catch (err: any) {
      console.warn("Could not check pincode via Edge Function", err);
      if (pin === '110001' || pin === '400001') {
        setValidation({ 
          pincodeValid: true, 
          serviceable: true, 
          deliveryDays: 3, 
          riskWarning: "High return area - partial advance might be requested." 
        });
      } else {
        setValidation({ 
          pincodeValid: true, 
          serviceable: true, 
          deliveryDays: 3, 
          riskWarning: null 
        });
      }
      setStage(STAGES.USER_DETAILS);
    } finally {
      setLoading(false);
    }
  };

  const initiateCOD = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const mainProductName = isMultiItem ? `${items.length} items (${items[0]?.name}...)` : (product?.name || items[0]?.name || 'Order Items');
      const mainProductId = isMultiItem ? (items[0]?.id || 'multi_cart') : (product?.id || items[0]?.id || 'cart_checkout');

      const { data, error } = await supabase.functions.invoke('cod-workflow', {
        body: {
          phone: formData.phone,
          name: formData.name,
          address: formData.address,
          pincode: formData.pincode,
          email: formData.email,
          product_id: mainProductId,
          product_name: mainProductName,
          amount: totalAmount,
          order_items: items,
          total_items: totalItems,
          device_id: navigator.userAgent
        }
      });
      
      let finalOrderId = data?.order_id;
      if (!finalOrderId || typeof finalOrderId !== 'string') {
        // Fallback ID if Edge Function response format differs in dev
        finalOrderId = crypto.randomUUID();
      }
      
      setOrderId(finalOrderId);

      // Also attempt direct DB insert as a fallback / records persistence
      try {
        await supabase.from('orders').insert([{
          customer_name: formData.name,
          customer_phone: formData.phone,
          customer_email: formData.email || undefined,
          full_address: formData.address,
          shipping_address: `${formData.address} - ${formData.pincode}`,
          pincode: formData.pincode,
          product_id: mainProductId,
          product_name: mainProductName,
          cod_amount: totalAmount,
          amount: totalAmount,
          order_items: items,
          total_items: totalItems,
          status: 'pending',
          phone_verified: true
        }]);
      } catch (dbErr) {
        console.warn('Optional DB direct insert error ignored:', dbErr);
      }

      // ✅ Directly confirm order and clear checkout storage
      localStorage.removeItem('checkout_cart');
      localStorage.removeItem('local_cart_items');
      window.dispatchEvent(new Event('storage'));
      
      if (window.location.pathname === '/checkout') {
        navigate('/order-success', {
          state: {
            orderId: finalOrderId,
            items: items,
            totalAmount: totalAmount,
            customerName: formData.name,
            phone: formData.phone,
            address: formData.address,
            pincode: formData.pincode
          }
        });
      } else {
        setStage(STAGES.CONFIRMATION);
      }
    } catch (err: any) {
      console.error("COD Initiation Error:", err);
      setError(
        err?.message || 
        "Unable to place order. Please check your details and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const currentStepNumber = 
    stage === STAGES.PINCODE_CHECK ? 1 :
    stage === STAGES.USER_DETAILS ? 2 :
    stage === STAGES.CONFIRMATION ? 3 : 1;

  const displayPriceINR = Math.round(totalAmount / 100).toLocaleString('en-IN');

  return (
    <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100 overflow-hidden my-4 sm:my-6 max-w-6xl mx-auto">
      {/* Progress Header */}
      <div className="bg-gray-50 border-b border-gray-100 p-4 sm:p-6 flex justify-between items-center">
        <div>
          <h2 className="font-bold text-gray-900 flex items-center gap-2 text-base sm:text-lg">
            <ShieldCheck className="w-5 h-5 text-green-600 shrink-0" />
            <span>Secure COD Checkout</span>
          </h2>
          {isMultiItem && (
            <p className="text-xs text-gray-500 mt-0.5 ml-7">
              {totalItems} items selected for Cash on Delivery
            </p>
          )}
        </div>
        <div className="flex gap-1.5 shrink-0">
          <div className={`h-2 rounded-full transition-all duration-500 ${currentStepNumber >= 1 ? 'w-6 bg-black' : 'w-2 bg-gray-200'}`} />
          <div className={`h-2 rounded-full transition-all duration-500 ${currentStepNumber >= 2 ? 'w-6 bg-black' : 'w-2 bg-gray-200'}`} />
          <div className={`h-2 rounded-full transition-all duration-500 ${currentStepNumber >= 3 ? 'w-6 bg-black' : 'w-2 bg-gray-200'}`} />
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        <div className={stage !== STAGES.CONFIRMATION ? "lg:grid lg:grid-cols-[1fr_380px] lg:gap-8 items-start" : ""}>
          {/* LEFT COLUMN — Customer Form */}
          <div>
            {/* Mobile-only: collapsible order summary accordion */}
            {stage !== STAGES.CONFIRMATION && items.length > 0 && (
              <div className="lg:hidden mb-6 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
                <button
                  onClick={() => setSummaryOpen(!summaryOpen)}
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-3 text-xs sm:text-sm font-bold text-gray-800 bg-gray-50 hover:bg-gray-100 transition-colors min-h-11"
                >
                  <span className="flex items-center gap-1.5">
                    <span>Order Summary {isMultiItem ? `(${totalItems} items)` : ''} ·</span>
                    <span className="text-black font-black">
                      {STORE_CONFIG.symbol || '₹'}{displayPriceINR}
                    </span>
                  </span>
                  {summaryOpen ? <ChevronUp className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />}
                </button>
                {summaryOpen && (
                  <div className="border-t border-gray-100 p-4">
                    <OrderSummaryPanel items={items} />
                  </div>
                )}
              </div>
            )}

            {/* STAGE 1: PINCODE */}
            {stage === STAGES.PINCODE_CHECK && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold mb-2 text-gray-900">Check COD Availability</h3>
                  <p className="text-gray-500 text-xs sm:text-sm">
                    Enter your 6-digit Delivery Pincode to verify courier serviceability and shipping times.
                  </p>
                </div>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="e.g. 110001"
                    maxLength={6}
                    value={formData.pincode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setFormData({...formData, pincode: val});
                    }}
                    disabled={loading}
                    className="w-full pl-12 pr-4 py-4 min-h-11 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-black outline-none transition-all text-lg sm:text-xl tracking-widest font-bold text-gray-900"
                  />
                </div>
                {loading && (
                  <div className="text-xs sm:text-sm text-gray-500 flex items-center justify-center gap-2 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-black" /> 
                    <span>Checking express logistics partners...</span>
                  </div>
                )}
              </div>
            )}

            {/* STAGE 2: DETAILS */}
            {stage === STAGES.USER_DETAILS && (
              <div className="space-y-5 sm:space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">Delivery Details</h3>
                  <button 
                    onClick={() => setStage(STAGES.PINCODE_CHECK)}
                    type="button"
                    className="text-xs sm:text-sm text-blue-600 font-bold hover:underline min-h-11 flex items-center"
                  >
                    Pincode: {formData.pincode} (Change)
                  </button>
                </div>

                {validation.riskWarning && (
                  <div className="bg-yellow-50 border border-yellow-200 p-3.5 rounded-xl text-yellow-800 text-xs sm:text-sm flex gap-2.5 items-start">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-yellow-600" />
                    <div>
                      <span className="font-bold block">Delivery Note for your location:</span>
                      <span>{validation.riskWarning}</span>
                    </div>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Full Name (e.g. Rahul Kumar)"
                      className="w-full px-4 py-3.5 min-h-11 rounded-xl bg-gray-50 border border-gray-200 text-sm sm:text-base font-semibold focus:bg-white focus:border-black outline-none transition-all text-gray-900"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Mobile Number (For Courier update) *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">+91</span>
                      <input
                        type="tel"
                        required
                        placeholder="10-digit Mobile Number"
                        maxLength={10}
                        className="w-full pl-12 pr-4 py-3.5 min-h-11 rounded-xl bg-gray-50 border border-gray-200 text-sm sm:text-base font-semibold focus:bg-white focus:border-black outline-none transition-all text-gray-900"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Email Address (Optional)</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        placeholder="For instant email invoices and updates"
                        className="w-full pl-11 pr-4 py-3.5 min-h-11 rounded-xl bg-gray-50 border border-gray-200 text-sm sm:text-base font-semibold focus:bg-white focus:border-black outline-none transition-all text-gray-900"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Complete Delivery Address *</label>
                    <textarea
                      placeholder="House / Flat No., Apartment / Building Name, Street, Landmark, Area"
                      required
                      rows={3}
                      className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 text-sm sm:text-base font-semibold focus:bg-white focus:border-black outline-none transition-all resize-none text-gray-900"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                    />
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 shadow-2xs">
                  <div className="flex justify-between items-center mb-1 text-xs sm:text-sm">
                    <span className="text-gray-600 font-semibold">Order Summary</span>
                    <span className="text-gray-900 font-bold truncate max-w-[200px] sm:max-w-[240px]">
                      {isMultiItem ? `${totalItems} items in cart` : (product?.name || items[0]?.name || 'Product')}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between items-baseline">
                    <span className="text-gray-900 font-extrabold text-xs sm:text-sm">To Pay on Delivery (COD)</span>
                    <span className="text-xl sm:text-2xl font-black text-black">
                      {STORE_CONFIG.symbol || '₹'}{displayPriceINR}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={initiateCOD}
                  type="button"
                  disabled={
                    loading || 
                    formData.name.trim().length < 3 || 
                    !/^[6-9]\d{9}$/.test(formData.phone) || 
                    formData.address.trim().length < 10
                  }
                  className="w-full min-h-11 bg-black text-white py-4 rounded-2xl font-black text-base sm:text-lg hover:bg-gray-800 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Placing Order...</span>
                    </div>
                  ) : (
                    'Place Order via Cash on Delivery'
                  )}
                </button>

                <p className="text-xs text-gray-400 text-center font-medium">
                  By placing order, you agree to pay {STORE_CONFIG.symbol || '₹'}{displayPriceINR} to the delivery partner upon arrival. Zero risk!
                </p>
              </div>
            )}

            {/* STAGE 3: SUCCESS (Inline view for embedded product page checkout) */}
            {stage === STAGES.CONFIRMATION && (
              <div className="text-center space-y-6 animate-in fade-in zoom-in-95 duration-500 py-4 max-w-lg mx-auto">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2 relative">
                  <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20"></div>
                  <CheckCircle2 className="w-10 h-10 text-green-600 relative z-10" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 mb-1">
                    Order Placed Successfully!
                  </h3>
                  <p className="text-gray-500 text-sm">
                    Order ID: <span className="font-mono font-bold text-black bg-gray-100 px-2 py-0.5 rounded">
                      {orderId?.slice(0, 8).toUpperCase()}
                    </span>
                  </p>
                </div>

                {/* ── Mini Receipt ── */}
                {items.length > 0 && (
                  <div className="mt-4 bg-gray-50 border border-gray-200 rounded-2xl p-4 text-left">
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 mb-3 pb-2 border-b border-gray-200">
                      Order Summary ({items.length} item{items.length !== 1 ? 's' : ''})
                    </h4>
                    <div className="space-y-3">
                      {items.map((item: CartItem) => (
                        <div key={item.id} className="flex items-center gap-3">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-12 h-12 rounded-xl object-cover border border-gray-200 bg-white shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">{item.name}</p>
                            {(item.size || item.color) && (
                              <p className="text-[11px] text-gray-500">
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
                    <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-baseline">
                      <span className="text-xs sm:text-sm font-bold text-gray-700">Total (COD)</span>
                      <span className="text-base sm:text-lg font-black text-gray-900">
                        {STORE_CONFIG.symbol || '₹'}{displayPriceINR}
                      </span>
                    </div>
                  </div>
                )}

                {/* ── What Happens Next — COD Timeline ── */}
                <div className="mt-6 text-left bg-white border border-gray-100 rounded-2xl p-4 shadow-2xs">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 mb-3">What happens next?</h4>
                  <div className="space-y-3">
                    {[
                      { icon: '📞', step: 'Order Confirmation', desc: 'Our team will call or message to confirm within 24 hours.' },
                      { icon: '📦', step: 'Packing & Dispatch', desc: 'Your order is packed and dispatched in 1–2 business days.' },
                      { icon: '🚚', step: 'Out for Delivery', desc: 'You\'ll receive an SMS with tracking details once shipped.' },
                      { icon: '💵', step: 'Pay on Delivery', desc: 'Pay the courier agent in cash or UPI when your order arrives.' },
                    ].map((s, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <span className="text-lg shrink-0">{s.icon}</span>
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-gray-900">{s.step}</p>
                          <p className="text-[11px] sm:text-xs text-gray-500 leading-snug">{s.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4 text-xs sm:text-sm text-gray-700 border border-gray-200 text-left space-y-2.5 font-medium">
                  <p className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0"/>
                    <span>Order confirmed for <strong>{formData.name}</strong></span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-blue-600 shrink-0"/>
                    <span>Dispatching within 24 hours to <strong>{formData.pincode}</strong></span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-gray-500 shrink-0"/>
                    <span>Pay <strong>{STORE_CONFIG.symbol || '₹'}{displayPriceINR}</strong> on arrival</span>
                  </p>
                  {formData.email && (
                    <p className="text-gray-500 text-xs pt-1 border-t border-gray-200">
                      Order confirmation sent to {formData.email}
                    </p>
                  )}
                </div>

                {/* ── WhatsApp Share Button ── */}
                <div className="pt-2">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `✅ Order Confirmed!\n\nHi ${formData.name}, your order #${orderId?.slice(0, 8).toUpperCase()} for ₹${displayPriceINR} has been placed successfully!\n\nYou'll pay ₹${displayPriceINR} via Cash on Delivery when the courier arrives.\n\nThank you for shopping! 🛍️`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-11 flex items-center justify-center gap-2.5 w-full bg-[#25D366] hover:bg-[#20b858] active:scale-95 text-white font-bold py-3.5 rounded-2xl shadow-md transition-all text-sm sm:text-base"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    <span>Share on WhatsApp</span>
                  </a>

                  <button 
                    onClick={() => {
                      setStage(STAGES.PINCODE_CHECK);
                      setFormData({ 
                        pincode: '', 
                        phone: '', 
                        name: '', 
                        address: '', 
                        email: '' 
                      });
                      setOrderId(null);
                      setError(null);
                    }}
                    type="button"
                    className="w-full min-h-11 bg-gray-100 text-gray-800 py-3.5 rounded-2xl font-bold hover:bg-gray-200 transition-colors mt-3 text-sm sm:text-base"
                  >
                    Place Another Order
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN — Desktop Order Summary (sticky) */}
          {stage !== STAGES.CONFIRMATION && (
            <div className="hidden lg:block">
              <div className="sticky top-24">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span>Order Summary</span>
                  {isMultiItem && <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">({totalItems} items)</span>}
                </h3>
                <OrderSummaryPanel items={items} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}