export interface SizeOption {
  name: string;
  stock: number;
  isClearance: boolean;
  isSoldOut: boolean;
  sku?: string;
}

export interface Variant {
  id: number;
  vid: string;
  sku: string;
  size?: string;
  variant_name?: string;
  image_url?: string;
  wholesale_cost: number;
  shipping_cost: number;
  retail_price_1x: number;
  bundle_2_price: number;
  bundle_3_price: number;
  us_warehouse_stock: number;
  carrier_name: string;
  delivery_sla: string;
  is_available: boolean;
}

export interface Feature {
  icon?: string;
  title: string;
  desc: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface Product {
  id: number;
  pid: string;
  title: string;
  brand_title?: string;
  slug: string;
  category?: string;
  rating?: number;
  review_count?: number;
  hero_image_url?: string;
  images?: string[];
  pas_description_html?: string;
  features?: Feature[];
  seo_meta?: {
    meta_title?: string;
    meta_description?: string;
    category?: string;
    rating?: number;
    review_count?: number;
    json_ld_product?: Record<string, unknown>;
  };
  faq_schema?: FAQItem[];
  viral_scripts?: Array<{
    index: number;
    archetype: string;
    visual_hook: string;
    storyboard: string;
    voiceover: string;
    hashtags: string;
  }>;
  fallback_affiliate_url?: string;
  is_active: boolean;
  variants: Variant[];
}

export interface PaginatedCatalogResponse {
  items: Product[];
  total_count: number;
  total_pages: number;
  current_page: number;
  categories_summary: Record<string, number>;
}

export type BundleTier = "1x" | "2x" | "3x";

export interface CartItem {
  product: Product;
  variant: Variant;
  selectedSize?: string;
  tier: BundleTier;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  savings: number;
}

export interface CustomerOrderItem {
  title?: string;
  sku?: string;
  quantity?: number;
  price?: number;
  image_url?: string;
  size?: string;
}

export interface CustomerOrder {
  id: number;
  internal_order_number: string;
  status: string;
  total_retail: number;
  carrier_name: string;
  tracking_number?: string | null;
  shipping_name: string;
  shipping_city: string;
  shipping_province: string;
  shipping_zip: string;
  created_at: string;
  items?: CustomerOrderItem[];
}
