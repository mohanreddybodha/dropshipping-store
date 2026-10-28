import { neon, NeonQueryFunction } from "@neondatabase/serverless";

export function getDb(): NeonQueryFunction<false, false> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is not defined");
  }
  return neon(url);
}

export interface DbOrder {
  id: number;
  internal_order_number: string;
  cj_order_id?: string | null;
  customer_email: string;
  customer_phone?: string | null;
  stripe_payment_intent_id?: string | null;
  status: string;
  total_retail: number;
  total_wholesale?: number | null;
  net_profit?: number | null;
  shipping_name?: string | null;
  shipping_address?: string | null;
  shipping_city?: string | null;
  shipping_province?: string | null;
  shipping_zip?: string | null;
  shipping_country?: string | null;
  carrier_name?: string | null;
  tracking_number?: string | null;
  items_json: any;
  created_at: string;
  updated_at: string;
}

export interface DbUser {
  id: number;
  firebase_uid: string;
  email?: string | null;
  display_name?: string | null;
  photo_url?: string | null;
  phone_number?: string | null;
  created_at: string;
  last_login_at: string;
}

export interface DbCartItem {
  id: number;
  user_id: number;
  product_pid: string;
  variant_vid: string;
  title: string;
  image_url?: string | null;
  tier: number;
  selected_size?: string | null;
  quantity: number;
  unit_price: number;
  updated_at: string;
}
