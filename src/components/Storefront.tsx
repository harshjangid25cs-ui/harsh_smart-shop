import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Product } from '../types';
import CODCheckout from './CODCheckout';
import { ArrowLeft, Star, ShieldCheck, Truck, ShoppingCart, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { STORE_CONFIG } from '../config';
import { Link, useParams, useNavigate } from 'react-router-dom';

const SAMPLE_FALLBACKS: Record<string, Product> = {
  '1': { id: '1', name: 'iPhone 15 Pro (128GB, Natural Titanium)', price: 12990000, category: 'electronics', brand: 'Apple', description: 'Forged in titanium with an A17 Pro chip, completely customizable Action button and versatile Pro camera system. Aerospace-grade titanium design makes it our lightest Pro models ever.', is_active: true, discount_percent: 8, rating: 4.9, review_count: 1420, image_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=800', created_at: new Date().toISOString() },
  '2': { id: '2', name: 'Nike Air Max Pulse Mens Running Shoes', price: 899900, category: 'fashion', brand: 'Nike', description: 'Drawing inspiration from the London music scene, bringing an underground touch to the iconic Air Max lineup. Incredible cushioning for streetwear style and endurance.', is_active: true, discount_percent: 15, rating: 4.7, review_count: 512, image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800', created_at: new Date().toISOString() },
  '3': { id: '3', name: 'Sony WH-1000XM5 Wireless Headphones', price: 2999000, category: 'electronics', brand: 'Sony', description: 'Industry-leading noise cancellation with two processors and 8 microphones for unprecedented sound quality and crystal clear hands-free calling.', is_active: true, discount_percent: 12, rating: 4.8, review_count: 890, image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800', created_at: new Date().toISOString() },
  '4': { id: '4', name: 'MacBook Air 13-inch (M3 Chip, 8GB, 256GB)', price: 11490000, category: 'electronics', brand: 'Apple', description: 'Super lightweight and nearly half an inch thin with all-day battery life and Liquid Retina display. Supercharged by M3 chip for effortless performance.', is_active: true, discount_percent: 5, rating: 4.9, review_count: 740, image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=800', created_at: new Date().toISOString() },
  '5': { id: '5', name: 'Dyson V15 Detect Cordless Vacuum Cleaner', price: 5590000, category: 'home', brand: 'Dyson', description: 'Intelligent cordless vacuum with laser illumination to reveal microscopic dust and hygienic bin emptying. Automatically adapts suction power based on floor type.', is_active: true, discount_percent: 10, rating: 4.6, review_count: 320, image_url: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&q=80&w=800', created_at: new Date().toISOString() },
  '6': { id: '6', name: 'Estée Lauder Advanced Night Repair Serum', price: 850000, category: 'beauty', brand: 'Estée Lauder', description: 'Deep- and fast-penetrating face serum that reduces multiple signs of aging for a smoother, younger-looking radiance and long lasting skin defense.', is_active: true, discount_percent: 0, rating: 4.8, review_count: 620, image_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800', created_at: new Date().toISOString() }
};

export default function Storefront() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        if (id) {
          const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

          if (!error && data) {
            setProduct(data as Product);
            setLoading(false);
            return;
          }
        } else {
          const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (!error && data) {
            setProduct(data as Product);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Falling back to local demo catalog for details:", err);
      }

      // Offline / Demo Fallback
      if (id && SAMPLE_FALLBACKS[id]) {
        setProduct(SAMPLE_FALLBACKS[id]);
      } else {
        setProduct(SAMPLE_FALLBACKS['1']);
      }
      setLoading(false);
    };

    fetchProduct();
  }, [id]);

  const addToCart = () => {
    if (!product) return;
    const sessionId = localStorage.getItem('session_id') || crypto.randomUUID();
    localStorage.setItem('session_id', sessionId);

    const localCart = JSON.parse(localStorage.getItem('local_cart_items') || '[]');
    const existingIndex = localCart.findIndex((item: any) => item.product_id === product.id);
    if (existingIndex > -1) {
      localCart[existingIndex].quantity += 1;
    } else {
      localCart.push({
        id: crypto.randomUUID(),
        product_id: product.id,
        quantity: 1,
        product: product
      });
    }
    localStorage.setItem('local_cart_items', JSON.stringify(localCart));
    window.dispatchEvent(new Event('storage'));
    
    setToast(`Added ${product.name} to your Cart!`);
    setTimeout(() => setToast(null), 3500);

    supabase.from('cart_items').upsert({
      session_id: sessionId,
      product_id: product.id,
      quantity: existingIndex > -1 ? localCart[existingIndex].quantity : 1
    }, { onConflict: 'session_id,product_id' }).catch(() => {});
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6f8]">
        <div className="animate-spin w-8 h-8 border-4 border-black border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f6f8] p-6 text-center">
        <h2 className="text-2xl font-black text-gray-900 mb-2">Product Not Found</h2>
        <p className="text-gray-500 text-sm mb-6">This item may be out of stock or discontinued.</p>
        <Link to="/" className="bg-black text-white px-6 py-3 rounded-2xl font-bold text-sm">Back to Storefront</Link>
      </div>
    );
  }

  const priceInRupees = Math.round(product.price / 100);
  const discount = product.discount_percent || 0;
  const originalPrice = discount > 0 ? Math.round(priceInRupees * (1 + discount / 100)) : priceInRupees;
  const displayImage = product.image_url || product.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800';
  // Build de-duplicated image list for the slider
  const allImages: string[] = Array.from(new Set([
    ...(product.image_url ? [product.image_url] : []),
    ...(product.images || [])
  ])).filter(Boolean);
  if (allImages.length === 0) allImages.push(displayImage);

  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-black text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-black">
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
          <span className="font-medium text-sm">{toast}</span>
          <Link to="/cart" className="ml-2 text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors">
            View Cart
          </Link>
        </div>
      )}

      {/* HEADER */}
      <header className="bg-white border-b border-gray-100 py-4 px-6 sticky top-0 z-50 shadow-xs">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-extrabold text-gray-700 hover:text-black transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to All Products
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/cart" className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors">
              <ShoppingCart className="w-4 h-4" /> View Cart
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          
          {/* PRODUCT VISUALS — Full Image Slider */}
          <div className="space-y-4 sticky top-24">
            <ImageSlider
              images={allImages}
              productName={product.name}
              discount={discount}
            />
          </div>

          {/* PRODUCT DETAILS OR CHECKOUT */}
          <div>
            {!showCheckout ? (
              <div className="bg-white p-6 sm:p-10 rounded-3xl border border-gray-100/80 shadow-xs space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black tracking-wider uppercase text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                    {product.brand || product.category || 'Featured'}
                  </span>
                  <div className="flex items-center gap-1.5 bg-green-700 text-white font-bold px-2.5 py-1 rounded-xl text-xs shadow-2xs">
                    <span>{product.rating || '4.8'}</span>
                    <Star className="w-3 h-3 fill-current" />
                    <span className="opacity-80">({product.review_count || 1200} reviews)</span>
                  </div>
                </div>
                
                <h1 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight leading-tight">
                  {product.name}
                </h1>
                
                <div className="flex items-baseline gap-3 pt-1">
                  <span className="text-3xl sm:text-4xl font-black text-gray-900">
                    {STORE_CONFIG.symbol}{priceInRupees.toLocaleString('en-IN')}
                  </span>
                  {discount > 0 && (
                    <>
                      <span className="text-lg font-semibold text-gray-400 line-through">
                        {STORE_CONFIG.symbol}{originalPrice.toLocaleString('en-IN')}
                      </span>
                      <span className="text-sm font-extrabold text-green-600">
                        Save {discount}% Today
                      </span>
                    </>
                  )}
                </div>
                
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed border-t border-gray-100 pt-6">
                  {product.description}
                </p>

                <div className="bg-gray-50/80 rounded-2xl p-5 border border-gray-200/60 space-y-3.5">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-700 shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm">100% Secure Email OTP Verification</div>
                      <div className="text-xs text-gray-500">No pre-payment required. Verify order instantly via email</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-700 shrink-0">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm">Free Express Shipping</div>
                      <div className="text-xs text-gray-500">2-4 business days delivery across all serviceable pincodes</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button 
                    onClick={addToCart}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-4 rounded-2xl font-extrabold text-base transition-all flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-5 h-5" /> Add to Cart
                  </button>
                  <button 
                    onClick={() => setShowCheckout(true)}
                    className="w-full bg-black hover:bg-gray-800 text-white py-4 rounded-2xl font-black text-base transition-all flex items-center justify-center shadow-lg hover:shadow-xl active:scale-98"
                  >
                    Buy Now via COD
                  </button>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                <button onClick={() => setShowCheckout(false)} className="text-xs font-extrabold text-gray-500 hover:text-black mb-4 flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-gray-200/80 shadow-2xs">
                  ← Back to Product Description
                </button>
                <CODCheckout product={product} />
              </div>
            )}
          </div>
          
        </div>
      </main>
    </div>
  );
}

// ─── Image Slider Component ─────────────────────────────────────────────────
function ImageSlider({
  images,
  productName,
  discount,
}: {
  images: string[];
  productName: string;
  discount: number;
}) {
  const [current, setCurrent] = React.useState(0);
  const touchStartX = useRef<number | null>(null);
  const total = images.length;

  const prev = () => setCurrent(c => (c - 1 + total) % total);
  const next = () => setCurrent(c => (c + 1) % total);

  // Keyboard arrow navigation
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [total]);

  // Touch/swipe handlers
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) delta < 0 ? next() : prev();
    touchStartX.current = null;
  };

  return (
    <div className="space-y-3">
      {/* Main slide */}
      <div
        className="relative aspect-square bg-white rounded-3xl overflow-hidden border border-gray-200/80 shadow-sm select-none"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {images.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={`${productName} – image ${i + 1}`}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-400 ${
              i === current ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
            draggable={false}
          />
        ))}

        {/* Discount badge */}
        {discount > 0 && (
          <span className="absolute top-4 left-4 z-20 bg-red-600 text-white text-xs font-black uppercase px-3 py-1.5 rounded-xl shadow-md">
            {discount}% OFF
          </span>
        )}

        {/* Prev / Next arrows — only shown when there are multiple images */}
        {total > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 shadow-md flex items-center justify-center hover:bg-white active:scale-90 transition-all"
            >
              <ChevronLeft className="w-5 h-5 text-gray-800" />
            </button>
            <button
              onClick={next}
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 shadow-md flex items-center justify-center hover:bg-white active:scale-90 transition-all"
            >
              <ChevronRight className="w-5 h-5 text-gray-800" />
            </button>

            {/* Dot indicators */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  aria-label={`Go to image ${i + 1}`}
                  className={`rounded-full transition-all duration-300 ${
                    i === current
                      ? 'w-5 h-2 bg-black'
                      : 'w-2 h-2 bg-black/30 hover:bg-black/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail strip — only shown when there are multiple images */}
      {total > 1 && (
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`View image ${i + 1}`}
              className={`shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 transition-all ${
                i === current
                  ? 'border-black scale-105 shadow-md'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <img src={src} alt="" className="w-full h-full object-cover" draggable={false} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
