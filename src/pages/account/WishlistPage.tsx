import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../hooks/useAuth'
import { Heart, ShoppingCart, Trash2, Loader2, Check } from 'lucide-react'

interface WishlistItem {
  id:            string
  product_id:    string
  product_name:  string
  product_image: string
  product_price: number
  added_at:      string
}

export default function WishlistPage() {
  const { user }                  = useAuth()
  const [items,   setItems]       = useState<WishlistItem[]>([])
  const [loading, setLoading]     = useState(true)
  const [removing, setRemoving]   = useState<string | null>(null)
  const [addedToast, setAddedToast] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    const fetchWishlist = async () => {
      try {
        const { data } = await supabase
          .from('wishlist')
          .select('*')
          .eq('user_id', user.id)
          .order('added_at', { ascending: false })
        setItems((data as WishlistItem[]) ?? [])
      } catch (err) {
        console.warn('Error loading wishlist:', err);
      } finally {
        setLoading(false)
      }
    }
    fetchWishlist()
  }, [user])

  const handleRemove = async (id: string) => {
    setRemoving(id)
    try {
      await supabase.from('wishlist').delete().eq('id', id)
      setItems(prev => prev.filter(i => i.id !== id))
    } catch (err) {
      console.warn('Error removing wishlist item:', err);
    } finally {
      setRemoving(null)
    }
  }

  const handleAddToCart = (item: WishlistItem) => {
    // Read existing cart, add item, write back
    const existing = JSON.parse(localStorage.getItem('local_cart_items') ?? '[]')
    const found    = existing.find((c: any) => c.product_id === item.product_id || c.id === item.product_id)
    if (found) {
      found.quantity += 1
    } else {
      existing.push({
        id:          crypto.randomUUID(),
        product_id:  item.product_id,
        name:        item.product_name,
        price:       item.product_price,
        image:       item.product_image,
        quantity:    1,
        product: {
          id:        item.product_id,
          name:      item.product_name,
          price:     item.product_price,
          image_url: item.product_image
        }
      })
    }
    localStorage.setItem('local_cart_items', JSON.stringify(existing))
    window.dispatchEvent(new Event('storage'))
    
    setAddedToast(`${item.product_name} added to cart!`)
    setTimeout(() => setAddedToast(null), 3000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200/80 p-10 text-center shadow-sm">
        <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="font-black text-gray-900 mb-1 text-lg">Your wishlist is empty</h3>
        <p className="text-sm text-gray-500 mb-6">
          Save products you love to buy later or compare easily.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center bg-black text-white px-6 py-3 rounded-xl text-sm font-black hover:bg-gray-800 transition-all shadow-sm min-h-11"
        >
          Browse Products
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {addedToast && (
        <div className="fixed bottom-6 right-4 left-4 sm:left-auto sm:right-6 sm:w-auto z-[100] bg-black text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-black shrink-0">
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
          <span className="font-medium text-sm flex-1 truncate">{addedToast}</span>
          <Link to="/cart" className="ml-2 text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors shrink-0">
            View Cart
          </Link>
        </div>
      )}

      <h2 className="text-lg font-black text-gray-900">
        Wishlist
        <span className="ml-2 text-sm font-semibold text-gray-400">
          ({items.length})
        </span>
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200/80 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              {/* Product image */}
              <Link to={`/product/${item.product_id}`} className="block aspect-square bg-gray-50 overflow-hidden relative group">
                <img
                  src={item.product_image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800'}
                  alt={item.product_name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                />
              </Link>

              <div className="p-3 sm:p-4">
                <Link to={`/product/${item.product_id}`} className="hover:text-blue-600 transition-colors">
                  <p className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-2 mb-1 min-h-[2.25rem]">
                    {item.product_name}
                  </p>
                </Link>
                <p className="text-sm sm:text-base font-black text-gray-900 mb-3">
                  ₹{Math.round(item.product_price || 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="p-3 sm:p-4 pt-0 border-t border-gray-100 mt-2">
              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleAddToCart(item)}
                  className="flex-1 bg-black text-white text-xs font-black py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 hover:bg-gray-800 transition-all active:scale-95 min-h-10 shadow-2xs"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Add to Cart
                </button>
                <button
                  onClick={() => handleRemove(item.id)}
                  disabled={removing === item.id}
                  className="w-10 h-10 rounded-xl border border-gray-200/80 flex items-center justify-center text-red-500 hover:bg-red-50 hover:border-red-200 transition-all active:scale-95 disabled:opacity-50 shrink-0"
                  title="Remove from wishlist"
                >
                  {removing === item.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Trash2  className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
