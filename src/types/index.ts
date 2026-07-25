export interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // Stored in paise
  stock: number;
  images: string[];
  is_active: boolean;
  category?: string;
  created_at: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  customer_phone: string;
  customer_name: string;
  full_address: string;
  pincode: string;
  product_id: string;
  product_name: string;
  cod_amount: number; // Stored in paise
  status: OrderStatus;
  phone_verified: boolean;
  verification_method?: string;
  created_at: string;
}

export interface OTPVerification {
  id: string;
  phone: string;
  order_id: string;
  otp_hash: string;
  attempts: number;
  max_attempts: number;
  expires_at: string;
  verified: boolean;
  ip_address?: string;
}
