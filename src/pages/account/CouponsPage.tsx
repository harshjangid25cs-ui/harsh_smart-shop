import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Tag, Copy, CheckCircle2, Loader2 } from 'lucide-react'

interface Coupon {
  id:              string
  code:            string
  description:     string
  discount_type:   'percentage' | 'flat'
  discount_value:  number
  min_order_value: number
  valid_until:     string | null
}

export default function CouponsPage() {
  const [coupons,  setCoupons]  = useState<Coupon[]>([])
  const [loading,  setLoading]  = useState(true)
  const [copied,   setCopied]   = useState<string | null>(null)

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const { data } = await supabase
          .from('coupons')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
        setCoupons((data as Coupon[]) ?? [])
      } catch (err) {
        console.warn('Could not load coupons:', err);
      } finally {
        setLoading(false)
      }
    }
    fetchCoupons()
  }, [])

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (coupons.length === 0) {
    return (
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200/80 p-10 text-center shadow-sm">
        <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="font-black text-gray-900 mb-1 text-lg">No coupons available</h3>
        <p className="text-sm text-gray-500">Check back soon for new offers and discount codes!</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <h2 className="text-lg font-black text-gray-900">Available Coupons</h2>

      {coupons.map((coupon) => (
        <div
          key={coupon.id}
          className="bg-white rounded-2xl sm:rounded-3xl border-2 border-dashed border-gray-200 p-4 sm:p-5 hover:border-black transition-colors shadow-sm"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Discount badge */}
              <span className="inline-block bg-black text-white text-xs font-black px-3 py-1 rounded-full mb-2 shadow-2xs">
                {coupon.discount_type === 'percentage'
                  ? `${coupon.discount_value}% OFF`
                  : `₹${coupon.discount_value} OFF`
                }
              </span>

              {/* Description */}
              <p className="text-sm font-bold text-gray-900">
                {coupon.description}
              </p>

              {/* Min order */}
              {coupon.min_order_value > 0 && (
                <p className="text-xs font-semibold text-gray-500 mt-1">
                  Min. order: ₹{coupon.min_order_value.toLocaleString('en-IN')}
                </p>
              )}

              {/* Expiry */}
              {coupon.valid_until && (
                <p className="text-xs text-gray-400 font-medium mt-0.5">
                  Valid until:{' '}
                  {new Date(coupon.valid_until).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric'
                  })}
                </p>
              )}
            </div>

            {/* Copy button */}
            <div className="w-full sm:w-auto shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100">
              <p className="font-mono font-black text-gray-900 text-sm sm:mb-2 bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200/80">
                {coupon.code}
              </p>
              <button
                onClick={() => handleCopy(coupon.code)}
                className="flex items-center gap-1.5 text-xs font-black bg-black text-white px-3.5 py-2 rounded-xl hover:bg-gray-800 transition-colors active:scale-95 min-h-9"
              >
                {copied === coupon.code
                  ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> Copied!</>
                  : <><Copy className="w-3.5 h-3.5" /> Copy Code</>
                }
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
