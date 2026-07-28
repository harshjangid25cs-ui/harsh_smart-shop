import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../hooks/useAuth'
import { Bell, Package, Tag, Info, CheckCheck, Loader2 } from 'lucide-react'

interface Notification {
  id:         string
  title:      string
  message:    string
  type:       'order' | 'offer' | 'system'
  is_read:    boolean
  created_at: string
}

const TYPE_ICON = {
  order:  Package,
  offer:  Tag,
  system: Info,
}

const TYPE_COLOR = {
  order:  'bg-blue-100   text-blue-600',
  offer:  'bg-green-100  text-green-600',
  system: 'bg-gray-100   text-gray-600',
}

export default function NotificationsPage() {
  const { user }                        = useAuth()
  const [notifs,   setNotifs]           = useState<Notification[]>([])
  const [loading,  setLoading]          = useState(true)
  const [marking,  setMarking]          = useState(false)

  const unreadCount = notifs.filter(n => !n.is_read).length

  useEffect(() => {
    if (!user) return
    const fetchNotifs = async () => {
      try {
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        setNotifs((data as Notification[]) ?? [])
      } catch (err) {
        console.warn('Error loading notifications:', err);
      } finally {
        setLoading(false)
      }
    }
    fetchNotifs()
  }, [user])

  const handleMarkRead = async (id: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
      setNotifs(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      )
    } catch (err) {
      console.warn('Error marking notification read:', err);
    }
  }

  const handleMarkAllRead = async () => {
    if (!user) return
    setMarking(true)
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (err) {
      console.warn('Error marking all read:', err);
    } finally {
      setMarking(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (notifs.length === 0) {
    return (
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200/80 p-10 text-center shadow-sm">
        <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="font-black text-gray-900 mb-1 text-lg">No notifications</h3>
        <p className="text-sm text-gray-500">
          Order updates and exclusive offers will appear here when available.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-gray-900">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 text-xs font-black bg-black text-white px-2.5 py-0.5 rounded-full shadow-2xs">
              {unreadCount} new
            </span>
          )}
        </h2>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={marking}
            className="flex items-center gap-1.5 text-xs font-black bg-white border border-gray-200/80 text-gray-700 hover:text-black hover:border-black px-3 py-1.5 rounded-xl transition-all min-h-9 shadow-2xs"
          >
            {marking
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <CheckCheck className="w-3.5 h-3.5 text-green-600" />
            }
            Mark all read
          </button>
        )}
      </div>

      <div className="space-y-3">
        {notifs.map((notif) => {
          const Icon  = TYPE_ICON[notif.type]  ?? Bell
          const color = TYPE_COLOR[notif.type] ?? 'bg-gray-100 text-gray-600'

          return (
            <button
              key={notif.id}
              onClick={() => !notif.is_read && handleMarkRead(notif.id)}
              className={`w-full text-left bg-white rounded-2xl sm:rounded-3xl border p-4 sm:p-5 flex items-start gap-4 transition-all ${
                notif.is_read
                  ? 'border-gray-200/70 opacity-80'
                  : 'border-black shadow-sm hover:shadow-md bg-white'
              }`}
            >
              {/* Icon */}
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-black truncate ${notif.is_read ? 'text-gray-700 font-bold' : 'text-gray-900'}`}>
                    {notif.title}
                  </p>
                  {!notif.is_read && (
                    <span className="w-2.5 h-2.5 rounded-full bg-black shrink-0 mt-1.5 shadow-2xs" />
                  )}
                </div>
                <p className="text-xs sm:text-sm font-medium text-gray-500 mt-1 leading-relaxed">
                  {notif.message}
                </p>
                <p className="text-[11px] font-bold text-gray-400 mt-2">
                  {new Date(notif.created_at).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
