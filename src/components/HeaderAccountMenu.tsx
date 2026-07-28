import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import {
  User, Package, Tag, MapPin, Heart, Bell, LogOut, ChevronDown, UserCheck, LogIn
} from 'lucide-react';

export default function HeaderAccountMenu() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch unread notification count
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    const fetchUnread = async () => {
      try {
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false);
        setUnreadCount(count ?? 0);
      } catch (err) {
        console.warn('Could not check unread notification count:', err);
      }
    };
    fetchUnread();

    // Subscribe to real-time notification changes if enabled
    const channel = supabase
      .channel('header-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const ACCOUNT_MENU = [
    { to: '/account/profile',       icon: User,    label: 'My Profile',      badge: undefined },
    { to: '/account/orders',        icon: Package, label: 'My Orders',       badge: undefined },
    { to: '/account/coupons',       icon: Tag,     label: 'Coupons',         badge: undefined },
    { to: '/account/addresses',     icon: MapPin,  label: 'Saved Addresses', badge: undefined },
    { to: '/account/wishlist',      icon: Heart,   label: 'Wishlist',        badge: undefined },
    {
      to: '/account/notifications',
      icon: Bell,
      label: 'Notifications',
      badge: unreadCount  // ← shows red dot if > 0
    },
  ];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className={`relative min-w-11 min-h-11 px-3 sm:px-3.5 py-2 rounded-2xl border transition-all flex items-center gap-2 font-bold text-xs sm:text-sm ${
          dropdownOpen || user
            ? 'bg-black text-white border-black shadow-sm'
            : 'bg-gray-100 hover:bg-gray-200/80 text-gray-800 border-transparent'
        }`}
        title="Account Menu"
      >
        {user ? (
          <>
            <UserCheck className="w-4 h-4 text-green-400 shrink-0" />
            <span className="hidden md:inline font-black">Account</span>
          </>
        ) : (
          <>
            <User className="w-4 h-4 shrink-0" />
            <span className="hidden md:inline">Login / Account</span>
            <span className="md:hidden">Account</span>
          </>
        )}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 opacity-70 ${dropdownOpen ? 'rotate-180' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md border-2 border-white animate-in zoom-in">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown menu */}
      {dropdownOpen && (
        <div className="absolute right-0 top-full mt-2.5 w-64 bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* User info header */}
          {user ? (
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-gray-900 truncate">{user.email}</p>
                <p className="text-[11px] font-semibold text-green-600 flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  COD Store Account Active
                </p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center font-black text-xs shrink-0">
                {user.email?.[0]?.toUpperCase() ?? 'U'}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 border-b border-gray-100 text-center">
              <p className="text-xs font-bold text-gray-800 mb-1">Welcome to our Store</p>
              <p className="text-[11px] text-gray-500 mb-3">Sign in to track orders, coupons and addresses</p>
              <Link
                to="/login"
                onClick={() => setDropdownOpen(false)}
                className="w-full bg-black text-white py-2 px-4 rounded-xl text-xs font-black hover:bg-gray-800 transition-all flex items-center justify-center gap-1.5 shadow-xs min-h-9"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In / Register
              </Link>
            </div>
          )}

          {/* Menu items */}
          <div className="p-1.5 space-y-0.5">
            {ACCOUNT_MENU.map(({ to, icon: Icon, label, badge }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-gray-700 hover:bg-gray-100 hover:text-black transition-all group"
              >
                <div className="w-7 h-7 rounded-lg bg-gray-50 group-hover:bg-white flex items-center justify-center border border-gray-100 group-hover:border-gray-200 shrink-0 transition-colors">
                  <Icon className="w-3.5 h-3.5 text-gray-500 group-hover:text-black transition-colors" />
                </div>
                <span className="flex-1 truncate">{label}</span>
                {/* Unread badge */}
                {badge != null && badge > 0 && (
                  <span className="bg-black text-white text-[10px] font-black px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-2xs">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* Logout */}
          {user && (
            <div className="border-t border-gray-100 p-1.5 bg-gray-50/50">
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate('/');
                  setDropdownOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center border border-red-100 shrink-0">
                  <LogOut className="w-3.5 h-3.5 text-red-600" />
                </div>
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
