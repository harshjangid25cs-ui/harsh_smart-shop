import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Product } from '../types';
import { Search, ShoppingCart, Star, Check, Sparkles, SlidersHorizontal, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { STORE_CONFIG } from '../config';
import HeaderAccountMenu from './HeaderAccountMenu';

interface Filters {
  category: string;
  minPrice: number;
  maxPrice: number;
  sortBy: 'price_asc' | 'price_desc' | 'newest' | 'popular';
}

export default function ProductGrid() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Filters>({
    category: 'all',
    minPrice: 0,
    maxPrice: 50000000,
    sortBy: 'popular'
  });
  const [cartCount, setCartCount] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Initialize Cart count from localStorage or DB
  useEffect(() => {
    updateCartCount();
    const handleStorageChange = () => updateCartCount();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const updateCartCount = () => {
    try {
      const localCart = JSON.parse(localStorage.getItem('local_cart_items') || '[]');
      const count = localCart.reduce((acc: number, item: any) => acc + item.quantity, 0);
      setCartCount(count);
    } catch (e) {
      setCartCount(0);
    }
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  // Infinite Scroll Fetch
  const fetchProducts = useCallback(async (reset = false) => {
    setLoading(true);
    const currentPage = reset ? 0 : page;
    const limit = 20;

    try {
      let query = supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .range(currentPage * limit, (currentPage + 1) * limit - 1);

      // Apply filters
      if (filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }
      query = query.gte('price', filters.minPrice).lte('price', filters.maxPrice);

      // Apply sorting
      switch (filters.sortBy) {
        case 'price_asc': query = query.order('price', { ascending: true }); break;
        case 'price_desc': query = query.order('price', { ascending: false }); break;
        case 'newest': query = query.order('created_at', { ascending: false }); break;
        default: query = query.order('rating', { ascending: false });
      }

      const { data, error } = await query;

      if (error || !data || data.length === 0) {
        // Fallback to sample data for development if table empty or DB offline
        let filteredFallback = [...FALLBACK_PRODUCTS];
        if (filters.category !== 'all') {
          filteredFallback = filteredFallback.filter(p => p.category?.toLowerCase() === filters.category);
        }
        if (filters.sortBy === 'price_asc') filteredFallback.sort((a, b) => a.price - b.price);
        if (filters.sortBy === 'price_desc') filteredFallback.sort((a, b) => b.price - a.price);
        if (filters.sortBy === 'popular') filteredFallback.sort((a, b) => (b.rating || 0) - (a.rating || 0));

        setProducts(filteredFallback);
        setHasMore(false);
        setLoading(false);
        return;
      }

      if (reset) {
        setProducts(data);
        setPage(1);
      } else {
        setProducts(prev => [...prev, ...data]);
        setPage(prev => prev + 1);
      }

      setHasMore(data.length === limit);
    } catch (err) {
      console.warn("Using offline demo product dataset:", err);
      setProducts(FALLBACK_PRODUCTS);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  // Search with Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery);
      } else {
        fetchProducts(true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, filters]);

  const performSearch = async (query: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .textSearch('name', query, { type: 'websearch' })
        .limit(20);

      if (error || !data || data.length === 0) {
        // Fallback search filter
        const filtered = FALLBACK_PRODUCTS.filter(p =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.brand?.toLowerCase().includes(query.toLowerCase()) ||
          p.category?.toLowerCase().includes(query.toLowerCase())
        );
        setProducts(filtered);
      } else {
        setProducts(data);
      }
    } catch (e) {
      const filtered = FALLBACK_PRODUCTS.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase())
      );
      setProducts(filtered);
    } finally {
      setLoading(false);
    }
  };

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchProducts();
        }
      },
      { threshold: 0.1 }
    );

    const sentinel = document.getElementById('scroll-sentinel');
    if (sentinel) observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasMore, loading]);

  const addToCart = (product: Product) => {
    const sessionId = localStorage.getItem('session_id') || crypto.randomUUID();
    localStorage.setItem('session_id', sessionId);

    // Save to local storage for immediate offline/dev compatibility
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
    updateCartCount();
    showToast(`Added ${product.name} to Cart`);

    // Add to supabase cart table (async best effort)
    supabase.from('cart_items').upsert({
      session_id: sessionId,
      product_id: product.id,
      quantity: existingIndex > -1 ? localCart[existingIndex].quantity : 1
    }, { onConflict: 'session_id,product_id' }).then(undefined, err => console.log("DB sync paused in offline dev:", err));
  };

  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-4 left-4 sm:left-auto sm:right-6 sm:w-auto z-[100] bg-black text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-black shrink-0">
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
          <span className="font-medium text-sm flex-1 truncate">{toast}</span>
          <Link to="/cart" className="ml-2 text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors shrink-0">
            View Cart
          </Link>
        </div>
      )}

      {/* 
        ═══════════════════════════════════════════════════════
        FIX: Header + Filter Bar merged into ONE sticky wrapper.
        This eliminates the fragile magic-number offset 
        (top-[57px] / top-[65px]) entirely — the filter bar 
        now naturally flows directly below the header inside 
        the SAME sticky container, on every screen size, 
        forever, with zero manual pixel calculation needed.
        ═══════════════════════════════════════════════════════
      */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-xs border-b border-gray-100">
        {/* Header Row */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-3 sm:gap-6">
            <Link to="/" className="flex items-center gap-2 group shrink-0">
              <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center text-white font-black text-xl group-hover:bg-gray-800 transition-colors">
                S
              </div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 hidden sm:block">{STORE_CONFIG.name || 'SmartShop'}</h1>
            </Link>

            <div className="flex-1 max-w-2xl relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search products, mobile, beauty & brands..."
                className="w-full pl-11 pr-4 py-2.5 bg-gray-100/80 border border-transparent rounded-2xl text-sm focus:bg-white focus:border-gray-300 focus:outline-none transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <HeaderAccountMenu />
              <Link
                to="/cart"
                className="relative min-w-11 min-h-11 px-2.5 sm:px-3 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200/80 text-gray-800 transition-all flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="text-sm font-bold hidden sm:inline-block">Cart</span>
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shadow-md animate-in zoom-in">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>

        {/* Filters & Sorting Row — now part of the SAME sticky container as header */}
        <div className="border-t border-gray-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
              {['All', 'Electronics', 'Fashion', 'Home', 'Beauty'].map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    setFilters({ ...filters, category: cat.toLowerCase() });
                    setPage(0);
                  }}
                  className={`min-h-11 px-4 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                    filters.category === cat.toLowerCase()
                      ? 'bg-black text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <SlidersHorizontal className="w-4 h-4 text-gray-500 hidden sm:inline-block" />
              <select
                value={filters.sortBy}
                onChange={(e: any) => setFilters({ ...filters, sortBy: e.target.value })}
                className="min-h-11 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-700 focus:outline-none focus:border-black cursor-pointer"
              >
                <option value="popular">Sort: Popular / Rating</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="newest">Newest First</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Banner (Discovery Loop Enhancement) */}
      <div className="bg-gradient-to-r from-gray-900 via-black to-gray-800 text-white border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-2 text-center md:text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-yellow-300 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5" /> Flipkart-Scale COD Engine Active
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Top Deals & Verified COD Marketplace</h2>
            <p className="text-gray-400 text-sm max-w-xl">Experience lightning fast checkout with zero pre-payment required across thousands of quality products.</p>
          </div>
          <div className="flex gap-4">
            <div className="px-4 py-2.5 bg-white/5 rounded-2xl border border-white/10 text-center">
              <div className="text-xl font-black text-white">100%</div>
              <div className="text-xs text-gray-400">Secure COD</div>
            </div>
            <div className="px-4 py-2.5 bg-white/5 rounded-2xl border border-white/10 text-center">
              <div className="text-xl font-black text-white">2-4 Days</div>
              <div className="text-xs text-gray-400">Express Delivery</div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {products.length === 0 && !loading ? (
          <div className="bg-white rounded-3xl p-8 sm:p-12 text-center shadow-xs border border-gray-100 max-w-md mx-auto my-12">
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Products Found</h3>
            <p className="text-gray-500 text-sm mb-6">We couldn't find any items matching your search or filters.</p>
            <button
              onClick={() => { setSearchQuery(''); setFilters({ ...filters, category: 'all' }); }}
              className="min-h-11 px-6 py-2.5 bg-black text-white text-sm font-bold rounded-xl hover:bg-gray-800"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={addToCart}
              />
            ))}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-black border-t-transparent rounded-full" />
          </div>
        )}

        <div id="scroll-sentinel" className="h-8" />
      </div>
    </div>
  );
}

// Individual Product Card (Premium Flipkart-Scale Aesthetics)
function ProductCard({ product, onAddToCart }: {
  product: any;
  onAddToCart: (p: any) => void
}) {
  const [shareLabel, setShareLabel] = React.useState<'share' | 'copied'>('share');
  const discount = product.discount_percent || 0;
  const priceInRupees = Math.round(product.price / 100);
  const originalPrice = discount > 0 ? Math.round(priceInRupees * (1 + discount / 100)) : priceInRupees;
  const displayImage = product.image_url || (product.images && product.images[0]) || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800';

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const productUrl = `${window.location.origin}/product/${product.id}`;
    const shareData = {
      title: product.name,
      text: `Check out ${product.name} for ${STORE_CONFIG.symbol}${priceInRupees.toLocaleString('en-IN')} — Cash on Delivery available!`,
      url: productUrl,
    };
    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(productUrl);
        setShareLabel('copied');
        setTimeout(() => setShareLabel('share'), 2500);
      }
    } catch (err) {
      // User dismissed the share sheet — silently ignore
    }
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_30px_rgb(0,0,0,0.1)] border border-gray-100/80 transition-all duration-300 flex flex-col overflow-hidden group">
      <Link to={`/product/${product.id}`} className="block relative overflow-hidden bg-gray-50 aspect-square">
        <img
          src={displayImage}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
        />
        {discount > 0 && (
          <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg shadow-sm">
            {discount}% OFF
          </span>
        )}
      </Link>

      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider truncate">
              {product.brand || product.category || 'Brand'}
            </span>
            <div className="flex items-center gap-1 bg-green-700 text-white text-[11px] font-bold px-1.5 py-0.5 rounded shadow-2xs">
              <span>{product.rating || '4.5'}</span>
              <Star className="w-2.5 h-2.5 fill-current" />
            </div>
          </div>

          <Link to={`/product/${product.id}`} className="hover:text-blue-600 transition-colors">
            <h3 className="font-bold text-gray-900 text-sm sm:text-base line-clamp-2 leading-snug min-h-[2.5rem]">
              {product.name}
            </h3>
          </Link>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col gap-3">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-lg sm:text-xl font-black text-gray-900">
              {STORE_CONFIG.symbol}{priceInRupees.toLocaleString('en-IN')}
            </span>
            {discount > 0 && (
              <span className="text-xs font-semibold text-gray-400 line-through">
                {STORE_CONFIG.symbol}{originalPrice.toLocaleString('en-IN')}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleShare}
              className="min-h-11 w-full text-center bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-800 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5"
            >
              {shareLabel === 'copied' ? (
                <><Check className="w-3.5 h-3.5 text-green-600 stroke-[2.5]" /> Copied!</>
              ) : (
                <><Share2 className="w-3.5 h-3.5" /> Share</>
              )}
            </button>
            <button
              onClick={() => onAddToCart(product)}
              className="min-h-11 w-full bg-black hover:bg-gray-800 active:scale-95 text-white py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
