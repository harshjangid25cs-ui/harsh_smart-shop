export interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // Stored in paise
  stock?: number;
  stock_quantity?: number;
  images?: string[];
  image_url?: string;
  is_active: boolean;
  category?: string;
  subcategory?: string;
  brand?: string;
  tags?: string[];
  discount_percent?: number;
  rating?: number;
  review_count?: number;
  created_at: string;
}

export interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  product: Product;
}

export interface CartData {
  items: Array<{
    product_id: string;
    name: string;
    quantity: number;
    price: number;
    image_url?: string;
  }>;
  total: number;
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  customer_phone: string;
  email?: string;
  customer_email?: string;
  customer_name: string;
  full_address: string;
  pincode: string;
  product_id?: string;
  product_name?: string;
  items?: any[];
  cod_amount: number; // Stored in paise
  status: OrderStatus;
  phone_verified: boolean;
  verification_method?: string;
  device_fingerprint?: string;
  created_at: string;
}

export interface OTPVerification {
  id: string;
  phone?: string;
  email?: string;
  order_id: string;
  otp_hash: string;
  attempts: number;
  max_attempts: number;
  expires_at: string;
  verified: boolean;
  ip_address?: string;
}
