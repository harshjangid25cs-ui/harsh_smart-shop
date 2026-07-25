import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Product } from '../types';
import CODCheckout from './CODCheckout';
import { ArrowRight, Star, ShieldCheck, Truck } from 'lucide-react';
import { STORE_CONFIG } from '../config';

export default function Storefront() {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    const fetchLatestProduct = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .gt('stock', 0)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (error) {
          if (error.code !== 'PGRST116') throw error; // No rows found
        } else if (data) {
          setProduct(data as Product);
        }
      } catch (err) {
        console.error('Error fetching product:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestProduct();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-pulse text-gray-400">Loading store...</div></div>;
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Products Available</h2>
          <p className="text-gray-500">Check back later or visit the Admin dashboard to add inventory.</p>
        </div>
      </div>
    );
  }

  const priceInRupees = Math.round(product.price / 100);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-100 py-4 px-6 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <h1 className="font-bold text-xl tracking-tighter">{STORE_CONFIG.name}</h1>
          <div className="flex gap-4 text-sm font-medium text-gray-600 hidden md:flex">
            <span>Free Shipping</span>
            <span>•</span>
            <span>COD Available</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          
          {/* PRODUCT VISUALS */}
          <div className="space-y-6">
            <div className="aspect-[4/5] bg-gray-100 rounded-3xl overflow-hidden border border-gray-200">
              {product.images?.[0] ? (
                <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
              )}
            </div>
            {product.images?.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-2">
                {product.images.slice(1).map((img, i) => (
                  <div key={i} className="w-24 h-24 shrink-0 bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                    <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PRODUCT DETAILS OR CHECKOUT */}
          <div>
            {!showCheckout ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex text-yellow-400"><Star className="w-5 h-5 fill-current"/><Star className="w-5 h-5 fill-current"/><Star className="w-5 h-5 fill-current"/><Star className="w-5 h-5 fill-current"/><Star className="w-5 h-5 fill-current"/></div>
                  <span className="text-sm font-medium text-gray-600">(4.9/5 from 1,200+ reviews)</span>
                </div>
                
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight leading-tight mb-6">
                  {product.name}
                </h1>
                
                <div className="text-3xl font-black text-gray-900 mb-6">
                  {STORE_CONFIG.symbol}{priceInRupees}
                </div>
                
                <p className="text-lg text-gray-600 leading-relaxed mb-8">
                  {product.description}
                </p>

                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-8 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-green-600" /></div>
                    <div><div className="font-bold text-gray-900">100% Secure COD</div><div className="text-sm text-gray-500">Pay only when you receive it</div></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center"><Truck className="w-5 h-5 text-blue-600" /></div>
                    <div><div className="font-bold text-gray-900">Free Express Delivery</div><div className="text-sm text-gray-500">2-4 days across India</div></div>
                  </div>
                </div>

                <button 
                  onClick={() => setShowCheckout(true)}
                  className="w-full bg-black text-white py-5 rounded-2xl font-bold text-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:-translate-y-1"
                >
                  Buy Now - Cash on Delivery <ArrowRight className="w-6 h-6" />
                </button>
                <p className="text-center text-sm font-medium text-gray-500 mt-4">Hurry! Only {product.stock} units left in stock.</p>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                <button onClick={() => setShowCheckout(false)} className="text-sm font-medium text-gray-500 hover:text-black mb-6 flex items-center gap-2">
                  ← Back to Product
                </button>
                {/* We pass product down so CODCheckout uses the latest state */}
                <CODCheckout product={product} />
              </div>
            )}
          </div>
          
        </div>
      </main>
    </div>
  );
}
