import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Storefront from './components/Storefront';
import AdminDashboard from './components/AdminDashboard';
import { ShieldCheck, Truck, HeadphonesIcon, RotateCcw } from 'lucide-react';
import { STORE_CONFIG } from './config';

function Footer() {
  return (
    <footer className="bg-white py-12 px-6 border-t border-gray-100 text-center text-sm text-gray-500">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="flex flex-col items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-gray-400" />
            <span className="font-medium text-gray-900">Secure Payments</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Truck className="w-8 h-8 text-gray-400" />
            <span className="font-medium text-gray-900">Fast Shipping</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <RotateCcw className="w-8 h-8 text-gray-400" />
            <span className="font-medium text-gray-900">7 Days Return</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <HeadphonesIcon className="w-8 h-8 text-gray-400" />
            <span className="font-medium text-gray-900">24/7 Support</span>
          </div>
        </div>
        
        <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>&copy; {new Date().getFullYear()} {STORE_CONFIG.name}. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/admin" className="hover:text-gray-900 transition-colors">Admin Login</Link>
            <a href="#" className="hover:text-gray-900 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Storefront />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
