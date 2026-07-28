import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import AccountGuard from '../../components/AccountGuard'
import {
  User, Package, Tag, MapPin,
  Heart, Bell, LogOut, ArrowLeft
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { STORE_CONFIG } from '../../config'

const NAV_LINKS = [
  { to: '/account/profile',       icon: User,    label: 'My Profile'     },
  { to: '/account/orders',        icon: Package, label: 'My Orders'      },
  { to: '/account/coupons',       icon: Tag,     label: 'Coupons'        },
  { to: '/account/addresses',     icon: MapPin,  label: 'Saved Addresses'},
  { to: '/account/wishlist',      icon: Heart,   label: 'Wishlist'       },
  { to: '/account/notifications', icon: Bell,    label: 'Notifications'  },
]

export default function AccountLayout() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <AccountGuard>
      <div className="min-h-screen bg-[#f5f6f8]">
        {/* Header navigation bar */}
        <header className="bg-white border-b border-gray-100 py-3 px-4 sm:px-6 sticky top-0 z-50 shadow-sm">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-black transition-colors min-h-11">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Store</span>
            </Link>
            <Link to="/" className="text-sm sm:text-base font-black text-gray-900 tracking-tight">
              {STORE_CONFIG.name || 'SmartShop'} Account
            </Link>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">

          {/* Page heading */}
          <div className="mb-6">
            <h1 className="text-2xl font-black text-gray-900">My Account</h1>
            <p className="text-sm text-gray-500 mt-0.5">{user?.email}</p>
          </div>

          <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-6 items-start">

            {/* ── Desktop Sidebar ── */}
            <aside className="hidden lg:block bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="p-5 border-b border-gray-100 bg-gray-50">
                <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center font-black text-lg mb-2">
                  {user?.email?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <p className="font-bold text-gray-900 text-sm truncate">{user?.email}</p>
              </div>

              <nav className="p-2">
                <NavLink
                  to="/account"
                  end
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-black text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <User className="w-4 h-4 shrink-0" />
                  Account Hub
                </NavLink>

                {NAV_LINKS.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                        isActive
                          ? 'bg-black text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {label}
                  </NavLink>
                ))}

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors mt-1"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  Logout
                </button>
              </nav>
            </aside>

            {/* ── Main Content ── */}
            <main className="min-w-0">
              {/* Mobile nav tabs (scrollable) */}
              <div className="lg:hidden flex gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
                <NavLink
                  to="/account"
                  end
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors shrink-0 min-h-9 ${
                      isActive
                        ? 'bg-black text-white'
                        : 'bg-white text-gray-700 border border-gray-200'
                    }`
                  }
                >
                  Hub
                </NavLink>
                {NAV_LINKS.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors shrink-0 min-h-9 ${
                        isActive
                          ? 'bg-black text-white'
                          : 'bg-white text-gray-700 border border-gray-200'
                      }`
                    }
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {label}
                  </NavLink>
                ))}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap bg-red-50 text-red-600 border border-red-100 shrink-0 min-h-9"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </div>

              {/* Nested route content renders here */}
              <Outlet />
            </main>

          </div>
        </div>
      </div>
    </AccountGuard>
  )
}
