import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Product, Order } from '../types';
import ImageUpload from './ImageUpload';
import { Package, ShoppingBag, PlusCircle, IndianRupee } from 'lucide-react';

export default function AdminDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    images: [] as string[]
  });

  useEffect(() => {
    fetchData();

    const productsSub = supabase.channel('products_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchData)
      .subscribe();

    const ordersSub = supabase.channel('orders_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(productsSub);
      supabase.removeChannel(ordersSub);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, ordersRes] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('*').order('created_at', { ascending: false })
      ]);

      if (productsRes.data) setProducts(productsRes.data);
      if (ordersRes.data) setOrders(ordersRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const pricePaise = Math.round(parseFloat(newProduct.price) * 100);
      const { error } = await supabase.from('products').insert([{
        name: newProduct.name,
        description: newProduct.description,
        price: pricePaise,
        stock: parseInt(newProduct.stock),
        images: newProduct.images,
        is_active: true
      }]);

      if (error) throw error;
      setNewProduct({ name: '', description: '', price: '', stock: '', images: [] });
    } catch (err) {
      console.error('Error adding product:', err);
      alert('Failed to add product.');
    }
  };

  const handleUpdateOrderStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase.from('orders').update({ status }).eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error('Error updating order:', err);
    }
  };

  if (loading) return (
    <div className="p-12 text-center text-gray-500 flex items-center justify-center min-h-screen">
      <div className="space-y-3">
        <div className="animate-spin w-8 h-8 border-4 border-black border-t-transparent rounded-full mx-auto" />
        <p>Loading admin dashboard...</p>
      </div>
    </div>
  );

  const statusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 lg:py-12">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 lg:mb-12 text-gray-900">Admin Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
        {/* ADD PRODUCT SECTION */}
        <section className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <PlusCircle className="w-5 h-5 sm:w-6 sm:h-6 text-black shrink-0" />
            <h2 className="text-lg sm:text-xl font-bold">Add New Product</h2>
          </div>
          <form onSubmit={handleAddProduct} className="space-y-5 sm:space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
              <input
                required
                type="text"
                value={newProduct.name}
                onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                className="w-full px-4 py-3 min-h-11 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-black transition-colors text-sm sm:text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                required
                rows={3}
                value={newProduct.description}
                onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-black transition-colors resize-none text-sm sm:text-base"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                <div className="relative">
                  <IndianRupee className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={newProduct.price}
                    onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                    className="w-full pl-9 pr-4 py-3 min-h-11 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-black transition-colors text-sm sm:text-base"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={newProduct.stock}
                  onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })}
                  className="w-full px-4 py-3 min-h-11 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-black transition-colors text-sm sm:text-base"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
              <ImageUpload onUpload={(url) => setNewProduct({ ...newProduct, images: [...newProduct.images, url] })} />
              {newProduct.images.length > 0 && (
                <div className="flex gap-2 mt-4 flex-wrap">
                  {newProduct.images.map((img, idx) => (
                    <div key={idx} className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-gray-200">
                      <img src={img} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-black text-white py-4 min-h-11 rounded-xl font-bold hover:bg-gray-800 transition-colors text-sm sm:text-base"
            >
              Publish Product
            </button>
          </form>
        </section>

        {/* INVENTORY SECTION */}
        <section className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Package className="w-5 h-5 sm:w-6 sm:h-6 text-black shrink-0" />
            <h2 className="text-lg sm:text-xl font-bold">Inventory ({products.length})</h2>
          </div>
          <div className="space-y-3 sm:space-y-4 max-h-[60vh] overflow-y-auto pr-1 sm:pr-2">
            {products.map(product => {
              const imgSrc = product.images?.[0] || product.image_url ||
                'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800';
              return (
                <div key={product.id} className="flex gap-3 sm:gap-4 p-3 sm:p-4 border border-gray-100 rounded-xl sm:rounded-2xl">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-lg sm:rounded-xl overflow-hidden shrink-0">
                    <img src={imgSrc} className="w-full h-full object-cover" alt={product.name} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-sm sm:text-base line-clamp-1">{product.name}</h3>
                    <div className="flex gap-3 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-600">
                      <span>₹{Math.round(product.price / 100)}</span>
                      <span>Stock: {(product as any).stock ?? product.stock_quantity ?? '—'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {products.length === 0 && <p className="text-gray-500 text-sm">No products found.</p>}
          </div>
        </section>
      </div>

      {/* ORDERS SECTION */}
      <section className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8 border border-gray-100 shadow-sm mt-6 sm:mt-8 lg:mt-12">
        <div className="flex items-center gap-3 mb-6">
          <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-black shrink-0" />
          <h2 className="text-lg sm:text-xl font-bold">Recent Orders ({orders.length})</h2>
        </div>

        {/* MOBILE/TABLET VIEW: Card layout (<lg breakpoint) */}
        <div className="lg:hidden space-y-3">
          {orders.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">No orders yet.</p>
          )}
          {orders.map(order => (
            <div key={order.id} className="border border-gray-100 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <div className="font-mono text-[10px] text-gray-400">{order.id.slice(0, 8)}</div>
                  <div className="font-bold text-gray-900 text-sm truncate">{order.customer_name}</div>
                  <div className="text-xs text-gray-500">+91 {order.customer_phone} {order.phone_verified && '✓'}</div>
                </div>
                <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${statusColor(order.status)}`}>
                  {order.status}
                </span>
              </div>

              <div className="text-xs sm:text-sm text-gray-700 border-t border-gray-50 pt-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Product</span>
                  <span className="font-medium text-right">{order.product_name}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-bold">₹{Math.round(order.cod_amount / 100)}</span>
                </div>
              </div>

              <select
                value={order.status}
                onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                className="w-full min-h-11 text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-black"
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          ))}
        </div>

        {/* DESKTOP VIEW: Full table (lg breakpoint and above) */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-sm text-gray-500">
                <th className="py-4 px-4 font-medium">Order ID</th>
                <th className="py-4 px-4 font-medium">Customer</th>
                <th className="py-4 px-4 font-medium">Product</th>
                <th className="py-4 px-4 font-medium">Amount</th>
                <th className="py-4 px-4 font-medium">Status</th>
                <th className="py-4 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-4 font-mono text-xs">{order.id.slice(0, 8)}</td>
                  <td className="py-4 px-4">
                    <div className="font-medium text-gray-900">{order.customer_name}</div>
                    <div className="text-xs text-gray-500">+91 {order.customer_phone} {order.phone_verified && '✓'}</div>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-700">{order.product_name}</td>
                  <td className="py-4 px-4 font-medium">₹{Math.round(order.cod_amount / 100)}</td>
                  <td className="py-4 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <select
                      value={order.status}
                      onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                      className="min-h-11 text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-black"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">No orders yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
