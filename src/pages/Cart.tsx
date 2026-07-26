import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, ShieldCheck, Truck, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { STORE_CONFIG } from '../config';
import { CartItem } from '../types';

export default function Cart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    setLoading(true);
    const sessionId = localStorage.getItem('session_id');

    // Load first from local_cart_items for instant rendering / dev support
    const localCart = JSON.parse(localStorage.getItem('local_cart_items') || '[]');
    setItems(localCart);

    if (sessionId) {
      try {
        const { data, error } = await supabase
          .from('cart_items')
          .select(`
            id,
            quantity,
            product:product_id (
              id,
              name,
              price,
              image_url,
              images,
              brand,
              category
            )
          `)
          .eq('session_id', sessionId);

        if (!error && data && data.length > 0) {
          const formatted: any = data.map((item: any) => ({
            id: item.id,
            product_id: item.product?.id || item.id,
            quantity: item.quantity,
            product: {
              ...item.product,
              image_url: item.product.image_url || (item.product.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800')
            }
          }));
          setItems(formatted);
          localStorage.setItem('local_cart_items', JSON.stringify(formatted));
        }
      } catch (e) {
        console.warn('Sync with remote cart paused, using local storage:', e);
      }
    }
    setLoading(false);
  };

  const updateQuantity = async (productId: string, delta: number) => {
    const updated = items.map(item => {
      if (item.product_id === productId || item.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    });

    setItems(updated);
    localStorage.setItem('local_cart_items', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));

    // Try background Supabase update
    const sessionId = localStorage.getItem('session_id');
    if (sessionId) {
      const item = updated.find(i => i.product_id === productId || i.id === productId);
      if (item) {
        await supabase.from('cart_items').upsert({
          session_id: sessionId,
          product_id: item.product_id,
          quantity: item.quantity
        }, { onConflict: 'session_id,product_id' }).catch(() => {});
      }
    }
  };

  const removeItem = async (productId: string) => {
    const filtered = items.filter(item => item.product_id !== productId && item.id !== productId);
    setItems(filtered);
    localStorage.setItem('local_cart_items', JSON.stringify(filtered));
    window.dispatchEvent(new Event('storage'));

    const sessionId = localStorage.getItem('session_id');
    if (sessionId) {
      await supabase.from('cart_items')
        .delete()
        .eq('session_id', sessionId)
        .eq('product_id', productId)
        .catch(() => {});
    }
  };

  const totalAmount = items.reduce((sum, item) => 
    sum + ((item.product?.price || 0) * item.quantity), 0
  );

  const proceedToCheckout = () => {
    // Store cart summary for multi-item COD checkout
    localStorage.setItem('checkout_cart', JSON.stringify({
      items: items.map(i => ({
        product_id: i.product?.id || i.product_id,
        name: i.product?.name || 'Product',
        quantity: i.quantity,
        price: i.product?.price || 0,
        image_url: i.product?.image_url || i.product?.images?.[0]
      })),
      total: totalAmount
    }));
    
    navigate('/checkout');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-black border-t-transparent rounded-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-10 rounded-3xl shadow-xs border border-gray-100 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 text-sm mb-6">Looks like you haven't added anything to your cart yet. Discover our top deals now!</p>
          <Link 
            to="/" 
            className="w-full bg-black text-white py-3.5 rounded-2xl font-bold hover:bg-gray-800 transition-all block text-center"
          >
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f6f8] py-8 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-600 hover:text-black mb-2">
              <ArrowLeft className="w-4 h-4" /> Continue Shopping
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Shopping Cart ({items.reduce((a, b) => a + b.quantity, 0)} items)</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Cart Items List */}
          <div className="lg:col-span-2 space-y-4">
            {items.map(item => {
              const product = item.product || {};
              const priceInRupees = Math.round((product.price || 0) / 100);
              const imgUrl = product.image_url || product.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800';

              return (
                <div key={item.id} className="flex gap-4 sm:gap-6 bg-white p-4 sm:p-6 rounded-3xl shadow-xs border border-gray-100/80 items-center">
                  <img 
                    src={imgUrl} 
                    alt={product.name}
                    className="w-20 h-20 sm:w-28 sm:h-28 object-cover rounded-2xl bg-gray-50 border border-gray-100 shrink-0"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                      {product.brand || 'Verified Product'}
                    </span>
                    <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate mt-0.5">{product.name}</h3>
                    <p className="text-gray-700 font-extrabold text-sm mt-1">{STORE_CONFIG.symbol}{priceInRupees.toLocaleString('en-IN')}</p>
                    
                    <div className="flex items-center gap-3 mt-4">
                      <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
                        <button 
                          onClick={() => updateQuantity(item.product_id || item.id, -1)}
                          className="p-2 hover:bg-gray-200 transition-colors text-gray-700"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-gray-900">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.product_id || item.id, 1)}
                          className="p-2 hover:bg-gray-200 transition-colors text-gray-700"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      <button 
                        onClick={() => removeItem(item.product_id || item.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors ml-auto sm:ml-0"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-right font-black text-base sm:text-lg text-gray-900 hidden sm:block shrink-0">
                    {STORE_CONFIG.symbol}{Math.round(((product.price || 0) * item.quantity) / 100).toLocaleString('en-IN')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Checkout Summary Card */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 sticky top-24 space-y-6">
            <h3 className="font-black text-xl text-gray-900 pb-4 border-b border-gray-100">Order Summary</h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({items.reduce((a, b) => a + b.quantity, 0)} items)</span>
                <span className="font-bold text-gray-900">{STORE_CONFIG.symbol}{Math.round(totalAmount / 100).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>COD Verification Fee</span>
                <span className="font-bold text-green-600">FREE</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className="font-bold text-green-600">FREE</span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-between items-baseline">
              <span className="text-base font-extrabold text-gray-900">Total to Pay</span>
              <span className="text-2xl font-black text-gray-900">{STORE_CONFIG.symbol}{Math.round(totalAmount / 100).toLocaleString('en-IN')}</span>
            </div>

            <button
              onClick={proceedToCheckout}
              className="w-full bg-black text-white py-4 rounded-2xl font-bold text-lg hover:bg-gray-800 shadow-lg transition-all flex items-center justify-center gap-2 group"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="pt-4 space-y-3 bg-gray-50/80 p-4 rounded-2xl text-xs text-gray-600 font-medium">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
                <span>Zero Advance Pay • Cash / UPI on Delivery</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Dispatched within 24 hours across India</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
