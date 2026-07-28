import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../hooks/useAuth'
import { Package, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { CartItem } from '../../types/cart'

interface Order {
  id:              string
  created_at:      string
  customer_name:   string
  customer_phone:  string
  amount:          number
  status:          string
  order_items:     CartItem[]
  total_items:     number
  pincode:         string
  full_address:    string
}

// Status badge color map
const STATUS_STYLE: Record<string, string> = {
  pending:    'bg-yellow-100 text-yellow-800',
  confirmed:  'bg-blue-100   text-blue-800',
  shipped:    'bg-purple-100 text-purple-800',
  delivered:  'bg-green-100  text-green-800',
  cancelled:  'bg-red-100    text-red-800',
}

export default function OrdersPage() {
  const { user }                      = useAuth()
  const [orders,  setOrders]          = useState<Order[]>([])
  const [loading, setLoading]         = useState(true)
  const [expanded, setExpanded]       = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    const fetchOrders = async () => {
      // Match orders by user email's phone stored at checkout
      // or by user_id if you store it
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) setOrders(data as Order[])
      setLoading(false)
    }
    fetchOrders()
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200/80 p-10 text-center shadow-sm">
        <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="font-black text-gray-900 text-lg mb-1">No orders yet</h3>
        <p className="text-sm text-gray-500">
          Your COD orders will appear here after checkout.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <h2 className="text-lg font-black text-gray-900">
        My Orders
        <span className="ml-2 text-sm font-semibold text-gray-400">
          ({orders.length})
        </span>
      </h2>

      {orders.map((order) => (
        <div
          key={order.id}
          className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200/80 overflow-hidden shadow-sm transition-all"
        >
          {/* Order summary row */}
          <button
            onClick={() =>
              setExpanded(expanded === order.id ? null : order.id)
            }
            className="w-full text-left p-4 sm:p-5 flex items-start justify-between gap-4 hover:bg-gray-50/70 transition-colors"
          >
            <div className="flex-1 min-w-0">
              {/* Order ID + Date */}
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  #{order.id.slice(0, 8).toUpperCase()}
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full capitalize ${
                    STATUS_STYLE[order.status] ?? 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {order.status}
                </span>
              </div>

              {/* Items preview */}
              <p className="text-sm font-bold text-gray-900 truncate">
                {Array.isArray(order.order_items) && order.order_items.length > 0
                  ? `${order.order_items[0]?.name}${order.order_items.length > 1 ? ` +${order.order_items.length - 1} more` : ''}`
                  : 'Order items'
                }
              </p>

              {/* Date */}
              <p className="text-xs font-medium text-gray-400 mt-1">
                {new Date(order.created_at).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric'
                })}
              </p>
            </div>

            {/* Total + chevron */}
            <div className="text-right shrink-0 flex flex-col items-end gap-2">
              <span className="text-base sm:text-lg font-black text-gray-900">
                ₹{Math.round(order.amount || 0).toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-gray-500 font-bold bg-gray-100 px-2 py-0.5 rounded-md">COD</span>
              {expanded === order.id
                ? <ChevronUp   className="w-4 h-4 text-gray-400 mt-1" />
                : <ChevronDown className="w-4 h-4 text-gray-400 mt-1" />
              }
            </div>
          </button>

          {/* Expanded detail */}
          {expanded === order.id && (
            <div className="border-t border-gray-100 p-4 sm:p-5 bg-gray-50/80 space-y-4">

              {/* Item list */}
              {Array.isArray(order.order_items) && order.order_items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-2xs">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-14 h-14 rounded-xl object-cover border border-gray-200/60 bg-white shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {item.name}
                    </p>
                    {(item.size || item.color) && (
                      <p className="text-xs text-gray-500 mt-0.5 font-medium">
                        {[item.size && `Size: ${item.size}`, item.color && `Color: ${item.color}`]
                          .filter(Boolean).join(' · ')}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 font-semibold mt-0.5">
                      Qty: {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-black text-gray-900 shrink-0">
                    ₹{Math.round((item.price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}
                  </p>
                </div>
              ))}

              {/* Delivery address */}
              <div className="pt-2 border-t border-gray-200/80">
                <p className="text-xs font-bold uppercase text-gray-500 mb-1">
                  Delivery Address
                </p>
                <p className="text-sm text-gray-800 font-medium">
                  {order.full_address || 'Address on file'} {order.pincode ? `— ${order.pincode}` : ''}
                </p>
                {order.customer_phone && (
                  <p className="text-xs text-gray-500 mt-0.5">Phone: {order.customer_phone}</p>
                )}
              </div>

              {/* Total */}
              <div className="flex justify-between items-center pt-3 border-t border-gray-200/80">
                <span className="text-sm font-bold text-gray-700">
                  Total (Cash on Delivery)
                </span>
                <span className="text-lg font-black text-gray-900">
                  ₹{Math.round(order.amount || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
