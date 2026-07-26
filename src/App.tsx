import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ProductGrid from './components/ProductGrid';
import Storefront from './components/Storefront';
import Cart from './pages/Cart';
import CODCheckout from './components/CODCheckout';
import AdminDashboard from './components/AdminDashboard';
import { ShieldCheck, Truck, HeadphonesIcon, RotateCcw } from 'lucide-react';
import { STORE_CONFIG } from './config';

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
            <Route path="/checkout" element={<CODCheckout />} />
            <Route path="/product/:id" element={<Storefront />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
