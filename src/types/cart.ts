export interface CartItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  image: string;
  size?: string;
  color?: string;
}

export interface CheckoutProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image?: string;
  image_url?: string;
  images?: string[];
  discount_percent?: number;
  description?: string;
  is_active?: boolean;
  category?: string;
  brand?: string;
  rating?: number;
  review_count?: number;
  created_at?: string;
}
