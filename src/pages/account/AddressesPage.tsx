import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { MapPin, Plus, Trash2, Star, Loader2 } from 'lucide-react'

interface Address {
  id:         string
  label:      string
  full_name:  string
  phone:      string
  address:    string
  city:       string
  state:      string
  pincode:    string
  is_default: boolean
}

const BLANK: Omit<Address, 'id' | 'is_default'> = {
  label: 'Home', full_name: '', phone: '',
  address: '', city: '', state: '', pincode: ''
}

export default function AddressesPage() {
  const { user }                        = useAuth()
  const [addresses, setAddresses]       = useState<Address[]>([])
  const [loading,   setLoading]         = useState(true)
  const [showForm,  setShowForm]        = useState(false)
  const [form,      setForm]            = useState(BLANK)
  const [saving,    setSaving]          = useState(false)

  const fetchAddresses = async () => {
    if (!user) return
    try {
      const { data } = await supabase
        .from('saved_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
      setAddresses((data as Address[]) ?? [])
    } catch (err) {
      console.warn('Error loading addresses:', err);
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAddresses() }, [user])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    try {
      await supabase.from('saved_addresses').insert([{
        user_id: user.id,
        ...form,
        is_default: addresses.length === 0, // first address = default
      }])
      setShowForm(false)
      setForm(BLANK)
      await fetchAddresses()
    } catch (err) {
      console.warn('Error saving address:', err);
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await supabase.from('saved_addresses').delete().eq('id', id)
      setAddresses(prev => prev.filter(a => a.id !== id))
    } catch (err) {
      console.warn('Error deleting address:', err);
    }
  }

  const handleSetDefault = async (id: string) => {
    if (!user) return
    try {
      await supabase
        .from('saved_addresses')
        .update({ is_default: false })
        .eq('user_id', user.id)
      await supabase
        .from('saved_addresses')
        .update({ is_default: true })
        .eq('id', id)
      await fetchAddresses()
    } catch (err) {
      console.warn('Error updating default address:', err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-gray-900">Saved Addresses</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-black text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold hover:bg-gray-800 transition-all shadow-sm min-h-11"
        >
          <Plus className="w-4 h-4" />
          {showForm ? 'Close Form' : 'Add New'}
        </button>
      </div>

      {/* Add Address Form */}
      {showForm && (
        <form
          onSubmit={handleSave}
          className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200/80 p-5 space-y-4 shadow-sm animate-in fade-in duration-300"
        >
          <h3 className="font-bold text-gray-900">New Delivery Address</h3>

          {/* Label selector */}
          <div className="flex gap-2">
            {['Home', 'Work', 'Other'].map((l) => (
              <button
                key={l} type="button"
                onClick={() => setForm({ ...form, label: l })}
                className={`px-4 py-2 rounded-full text-xs font-black border transition-all min-h-9 ${
                  form.label === l
                    ? 'bg-black text-white border-black shadow-2xs'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: 'full_name', placeholder: 'Full Name',    type: 'text' },
              { key: 'phone',     placeholder: 'Phone Number', type: 'tel'  },
            ].map(({ key, placeholder, type }) => (
              <input
                key={key}
                type={type}
                required
                placeholder={placeholder}
                value={(form as any)[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full px-4 py-3 min-h-11 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-black outline-none text-sm font-semibold text-gray-900 transition-all"
              />
            ))}
          </div>

          <textarea
            required
            placeholder="House No., Street, Landmark"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            rows={2}
            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-black outline-none text-sm font-semibold text-gray-900 transition-all resize-none"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { key: 'city',    placeholder: 'City'    },
              { key: 'state',   placeholder: 'State'   },
              { key: 'pincode', placeholder: 'Pincode' },
            ].map(({ key, placeholder }) => (
              <input
                key={key}
                type="text"
                required
                placeholder={placeholder}
                value={(form as any)[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full px-4 py-3 min-h-11 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-black outline-none text-sm font-semibold text-gray-900 transition-all"
              />
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-black text-white py-3.5 rounded-xl font-bold text-sm min-h-11 flex items-center justify-center gap-2 hover:bg-gray-800 transition-all disabled:opacity-50 shadow-sm"
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                : 'Save Address'
              }
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-6 py-3.5 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm min-h-11 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Address cards */}
      {addresses.length === 0 && !showForm ? (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200/80 p-10 text-center shadow-sm">
          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-black text-gray-900 mb-1 text-lg">No saved addresses</h3>
          <p className="text-sm text-gray-500">Add an address to speed up your future COD checkouts.</p>
        </div>
      ) : (
        addresses.map((addr) => (
          <div
            key={addr.id}
            className={`bg-white rounded-2xl sm:rounded-3xl border-2 p-4 sm:p-5 shadow-sm transition-colors ${
              addr.is_default ? 'border-black' : 'border-gray-200/80 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-xs font-black bg-gray-100 text-gray-800 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                    {addr.label}
                  </span>
                  {addr.is_default && (
                    <span className="text-xs font-black bg-black text-white px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                      <Star className="w-3 h-3 fill-current" /> Default
                    </span>
                  )}
                </div>
                <p className="font-bold text-gray-900 text-sm sm:text-base">{addr.full_name}</p>
                <p className="text-sm font-medium text-gray-600 mt-0.5">{addr.phone}</p>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                  {addr.address}, {addr.city}, {addr.state} — <span className="font-bold text-gray-900">{addr.pincode}</span>
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col items-end justify-between gap-3 shrink-0">
                {!addr.is_default && (
                  <button
                    onClick={() => handleSetDefault(addr.id)}
                    className="text-xs text-blue-600 font-bold hover:underline min-h-8 flex items-center bg-blue-50 px-2.5 py-1 rounded-lg"
                  >
                    Set Default
                  </button>
                )}
                <button
                  onClick={() => handleDelete(addr.id)}
                  className="text-red-500 hover:text-red-700 transition-colors p-2 rounded-lg hover:bg-red-50 flex items-center justify-center min-h-9 min-w-9"
                  title="Delete Address"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
