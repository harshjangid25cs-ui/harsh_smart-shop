import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ProductGrid from './components/ProductGrid';
import Storefront from './components/Storefront';
import Cart from './pages/Cart';
import CODCheckout from './components/CODCheckout';
import AdminDashboard from './components/AdminDashboard';
import OrderSuccess from './pages/OrderSuccess';
import { ShieldCheck, Truck, HeadphonesIcon, RotateCcw, ArrowLeft, ShoppingCart } from 'lucide-react';
import { STORE_CONFIG } from './config';
import LoginPage from './pages/LoginPage';
import AccountLayout from './pages/account/AccountLayout';
import AccountHome from './pages/account/AccountHome';
import ProfilePage from './pages/account/ProfilePage';
import OrdersPage from './pages/account/OrdersPage';
import CouponsPage from './pages/account/CouponsPage';
import AddressesPage from './pages/account/AddressesPage';
import WishlistPage from './pages/account/WishlistPage';
import HeaderAccountMenu from './components/HeaderAccountMenu';
import AuthCallback from './pages/AuthCallback';
import NotificationsPage from './pages/account/NotificationsPage';

function CheckoutPage() {
  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <header className="bg-white border-b border-gray-100 py-3 px-4 sm:px-6 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link to="/cart" className="inline-flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-black transition-colors min-h-11">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Cart</span>
          </Link>
          <span className="text-sm font-black text-gray-900 tracking-tight">{STORE_CONFIG.name || 'SmartShop'}</span>
          <div className="flex items-center gap-2.5">
            <HeaderAccountMenu />
            <Link to="/cart" className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors min-h-11">
              <ShoppingCart className="w-3.5 h-3.5" /> Cart
            </Link>
          </div>
        </div>
      </header>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <CODCheckout />
      </div>
    </div>
  );
}


function Footer() {
  return (
    <footer className="bg-white py-12 px-6 border-t border-gray-200/70 text-center text-xs sm:text-sm text-gray-500">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          <div className="flex flex-col items-center gap-2 bg-gray-50/70 p-4 rounded-2xl border border-gray-100/80">
            <ShieldCheck className="w-7 h-7 text-green-600" />
            <span className="font-extrabold text-gray-900">100% Secure COD</span>
            <span className="text-[11px] text-gray-400">Email OTP verification</span>
          </div>
          <div className="flex flex-col items-center gap-2 bg-gray-50/70 p-4 rounded-2xl border border-gray-100/80">
            <Truck className="w-7 h-7 text-blue-600" />
            <span className="font-extrabold text-gray-900">Express Shipping</span>
            <span className="text-[11px] text-gray-400">Pan-India delivery SLA</span>
          </div>
          <div className="flex flex-col items-center gap-2 bg-gray-50/70 p-4 rounded-2xl border border-gray-100/80">
            <RotateCcw className="w-7 h-7 text-purple-600" />
            <span className="font-extrabold text-gray-900">Easy Returns</span>
            <span className="text-[11px] text-gray-400">7-day replacement policy</span>
          </div>
          <div className="flex flex-col items-center gap-2 bg-gray-50/70 p-4 rounded-2xl border border-gray-100/80">
            <HeadphonesIcon className="w-7 h-7 text-orange-500" />
            <span className="font-extrabold text-gray-900">24/7 Priority Support</span>
            <span className="text-[11px] text-gray-400">Dedicated assistance team</span>
          </div>
        </div>
        
        <div className="border-t border-gray-100 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-gray-600 font-medium">
          <p>&copy; {new Date().getFullYear()} {STORE_CONFIG.name || 'SmartShop'}. Flipkart-Scale Multi-Product Architecture.</p>
          <div className="flex gap-6 text-xs sm:text-sm">
            <Link to="/admin" className="hover:text-black font-bold transition-colors">Admin Hub</Link>
            <a href="#" className="hover:text-black transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-black transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-[#f5f6f8]">
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<ProductGrid />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/order-success" element={<OrderSuccess />} />
            <Route path="/checkout/success" element={<OrderSuccess />} />
            <Route path="/product/:id" element={<Storefront />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/account" element={<AccountLayout />}>
              <Route index element={<AccountHome />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="coupons" element={<CouponsPage />} />
              <Route path="addresses" element={<AddressesPage />} />
              <Route path="wishlist" element={<WishlistPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
            </Route>
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
