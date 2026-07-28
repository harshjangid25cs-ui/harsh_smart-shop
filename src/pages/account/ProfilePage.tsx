import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { Loader2, CheckCircle2, User, Phone, Mail } from 'lucide-react'

interface ProfileForm {
  full_name: string
  phone:     string
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [form,    setForm]    = useState<ProfileForm>({ full_name: '', phone: '' })
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  // Load existing profile on mount
  useEffect(() => {
    if (!user) return
    const loadProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .single()

      if (data) {
        setForm({
          full_name: data.full_name ?? '',
          phone:     data.phone     ?? '',
        })
      }
      setLoading(false)
    }
    loadProfile()
  }, [user])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError(null)
    setSaved(false)

    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({
        id:         user.id,
        full_name:  form.full_name.trim(),
        phone:      form.phone.trim(),
        updated_at: new Date().toISOString(),
      })

    if (upsertError) {
      setError(upsertError.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200/80 p-5 sm:p-6 shadow-sm">
      <h2 className="text-lg font-black text-gray-900 mb-6">My Profile</h2>

      <form onSubmit={handleSave} className="space-y-5 max-w-md">

        {/* Full Name */}
        <div>
          <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">
            Full Name
          </label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Your full name"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full pl-11 pr-4 py-3.5 min-h-11 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-black outline-none text-sm font-semibold text-gray-900 transition-all"
            />
          </div>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">
            Mobile Number
          </label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="tel"
              inputMode="numeric"
              placeholder="10-digit mobile number"
              maxLength={10}
              value={form.phone}
              onChange={(e) =>
                setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })
              }
              className="w-full pl-11 pr-4 py-3.5 min-h-11 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-black outline-none text-sm font-semibold text-gray-900 transition-all"
            />
          </div>
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">
            Email Address <span className="text-gray-400 normal-case font-normal">(cannot be changed)</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              value={user?.email ?? ''}
              disabled
              className="w-full pl-11 pr-4 py-3.5 min-h-11 rounded-xl bg-gray-100 border border-gray-200 text-sm font-semibold text-gray-500 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 font-medium">
            {error}
          </p>
        )}

        {/* Success */}
        {saved && (
          <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Profile updated successfully!
          </div>
        )}

        {/* Save button */}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-black text-white py-3.5 rounded-xl font-black text-sm hover:bg-gray-800 active:scale-95 transition-all flex items-center justify-center gap-2 min-h-11 disabled:opacity-50 shadow-sm"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
          ) : (
            'Save Changes'
          )}
        </button>
      </form>
    </div>
  )
}
