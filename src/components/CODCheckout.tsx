import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { STORE_CONFIG } from '../config';
import { Product } from '../types';
import { ShieldCheck, Truck, Lock, MapPin, CheckCircle2, Loader2, AlertCircle, Mail } from 'lucide-react';

const STAGES = {
  PINCODE_CHECK: 'pincode',
  USER_DETAILS: 'details',
  CONFIRMATION: 'confirmation'
};

export default function CODCheckout({ product }: { product: Product }) {
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
    deliveryDays: null,
    riskWarning: null as string | null
  });
  
  const [orderId, setOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const { data, error } = await supabase.functions.invoke('cod-workflow', {
        body: {
          phone: formData.phone,
          name: formData.name,
          address: formData.address,
          pincode: formData.pincode,
          email: formData.email,
          product_id: product.id,
          product_name: product.name,
          amount: product.price,
          device_id: navigator.userAgent
        }
      });
      
      if (error) throw error;

      if (!data?.order_id || typeof data.order_id !== 'string') {
        throw new Error("Invalid order ID received from server");
      }
      
      setOrderId(data.order_id);

      // ✅ Directly confirm order (no OTP)
      setStage(STAGES.CONFIRMATION);
      
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

  const priceInRupees = Math.round(product.price / 100);

  return (
    <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100 overflow-hidden">
      {/* Progress Header */}
      <div className="bg-gray-50 border-b border-gray-100 p-4 sm:p-6 flex justify-between items-center">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-green-600" />
          Secure COD Checkout
        </h2>
        <div className="flex gap-1.5">
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

        {/* STAGE 1: PINCODE */}
        {stage === STAGES.PINCODE_CHECK && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h3 className="text-xl font-semibold mb-2">Check COD Availability</h3>
              <p className="text-gray-500 text-sm">
                Enter your 6-digit Pincode to check serviceability.
              </p>
            </div>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="000000"
                maxLength={6}
                value={formData.pincode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setFormData({...formData, pincode: val});
                }}
                disabled={loading}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-black outline-none transition-all text-xl tracking-widest font-bold"
              />
            </div>
            {loading && (
              <div className="text-sm text-gray-500 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> 
                Checking courier partners...
              </div>
            )}
          </div>
        )}

        {/* STAGE 2: DETAILS */}
        {stage === STAGES.USER_DETAILS && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Delivery Details</h3>
              <button 
                onClick={() => setStage(STAGES.PINCODE_CHECK)}
                className="text-sm text-blue-600 font-medium hover:underline"
              >
                {formData.pincode} (Change)
              </button>
            </div>

            {validation.riskWarning && (
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-xl text-yellow-800 text-sm flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{validation.riskWarning}</p>
              </div>
            )}
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Full Name (e.g. Rahul Kumar)"
                className="w-full px-4 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-black outline-none transition-all"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
              <input
                type="tel"
                placeholder="10-digit Mobile Number"
                maxLength={10}
                className="w-full px-4 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-black outline-none transition-all"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})}
              />
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  placeholder="Email Address (for order updates)"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-black outline-none transition-all"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <textarea
                placeholder="Complete Address (House No, Building, Street, Landmark)"
                rows={3}
                className="w-full px-4 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-black outline-none transition-all resize-none"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              />
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-xl p-5">
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-600 font-medium">Product</span>
                <span className="text-gray-900 font-semibold">{product.name}</span>
              </div>
              <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between items-center">
                <span className="text-black font-bold">To Pay on Delivery</span>
                <span className="text-2xl font-black text-black">
                  {STORE_CONFIG.symbol}{priceInRupees}
                </span>
              </div>
            </div>

            <button 
              onClick={initiateCOD}
              disabled={
                loading || 
                formData.name.length < 3 || 
                !/^[6-9]\d{9}$/.test(formData.phone) || 
                formData.address.length < 10
              }
              className="w-full bg-black text-white py-4 rounded-2xl font-bold text-lg hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Place Order'
              )}
            </button>

            <p className="text-xs text-gray-400 text-center">
              By placing order, you agree to pay {STORE_CONFIG.symbol}{priceInRupees} to the delivery partner upon arrival.
            </p>
          </div>
        )}

        {/* STAGE 3: SUCCESS */}
        {stage === STAGES.CONFIRMATION && (
          <div className="text-center space-y-6 animate-in fade-in zoom-in-95 duration-500 py-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2 relative">
              <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20"></div>
              <CheckCircle2 className="w-10 h-10 text-green-600 relative z-10" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Order Placed Successfully!
              </h3>
              <p className="text-gray-500">
                Order ID: <span className="font-mono font-bold text-black">
                  {orderId?.slice(0, 8).toUpperCase()}
                </span>
              </p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-6 text-sm text-gray-700 border border-gray-200 text-left space-y-3 font-medium">
              <p className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0"/>
                Order confirmed for {formData.name}
              </p>
              <p className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600 shrink-0"/>
                Dispatching within 24 hours to {formData.pincode}
              </p>
              <p className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-gray-500 shrink-0"/>
                Pay {STORE_CONFIG.symbol}{priceInRupees} on delivery
              </p>
              {formData.email && (
                <p className="text-gray-500 text-xs mt-2">
                  Order confirmation sent to {formData.email}
                </p>
              )}
            </div>
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
              className="w-full bg-gray-100 text-gray-800 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              Place Another Order
            </button>
          </div>
        )}
      </div>
    </div>
  );
}