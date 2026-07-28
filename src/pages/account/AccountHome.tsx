import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  User, Package, Tag,
  MapPin, Heart, Bell
} from 'lucide-react'

const TILES = [
  { to: '/account/profile',       icon: User,    label: 'My Profile',      desc: 'Edit name & phone'         },
  { to: '/account/orders',        icon: Package, label: 'My Orders',       desc: 'Track & view orders'       },
  { to: '/account/coupons',       icon: Tag,     label: 'Coupons',         desc: 'View discount codes'       },
  { to: '/account/addresses',     icon: MapPin,  label: 'Saved Addresses', desc: 'Manage delivery addresses' },
  { to: '/account/wishlist',      icon: Heart,   label: 'Wishlist',        desc: 'Your saved products'       },
  { to: '/account/notifications', icon: Bell,    label: 'Notifications',   desc: 'Order & offer updates'     },
]

export default function AccountHome() {
  const { user } = useAuth()

  return (
    <div className="space-y-4">
      {/* Welcome card */}
      <div className="bg-black text-white rounded-2xl sm:rounded-3xl p-6 shadow-sm">
        <p className="text-sm text-gray-400 mb-1">Welcome back</p>
        <h2 className="text-xl sm:text-2xl font-black tracking-tight">
          {user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Customer'}
        </h2>
        <p className="text-xs text-gray-400 mt-1">{user?.email}</p>
      </div>

      {/* Feature tiles grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {TILES.map(({ to, icon: Icon, label, desc }) => (
          <Link
            key={to}
            to={to}
            className="bg-white border border-gray-200/80 rounded-2xl p-4 sm:p-5 hover:border-black hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mb-3.5 group-hover:bg-black transition-colors">
                <Icon className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" />
              </div>
              <p className="font-bold text-gray-900 text-sm sm:text-base">{label}</p>
              <p className="text-xs text-gray-500 mt-1">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
