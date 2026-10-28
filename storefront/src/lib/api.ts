import { CustomerOrder, PaginatedCatalogResponse, Product } from "./types";

const rawUrl = process.env.NEXT_PUBLIC_API_URL || "https://dropship-api-pflt.onrender.com/api";
// Prevent Node 18+ Windows IPv6 ::1 timeout when fetching local backend
const API_BASE_URL = rawUrl.replace("://localhost:", "://127.0.0.1:");

export const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 1,
    pid: "1902560845030125569",
    title: "New For Keeping Turbo Fans For With",
    brand_title: "Domestic Lab",
    slug: "new-for-keeping-turbo-fans-for-with-9002by",
    category: "Home & Kitchen",
    rating: 4.6,
    review_count: 255,
    hero_image_url: "https://cf.cjdropshipping.com/f090f07e-fee1-4e71-9063-ecf53b377c03.jpg",
    images: [
      "https://cf.cjdropshipping.com/f090f07e-fee1-4e71-9063-ecf53b377c03.jpg",
      "https://cf.cjdropshipping.com/d0440cb2-e195-44b2-bea5-e03c4f6fbea3.jpg",
      "https://cf.cjdropshipping.com/86f8c723-a8ab-44bc-9b18-afac29dbc9b0.jpg"
    ],
    pas_description_html: `<div class="space-y-4 text-slate-700">
      <p class="font-medium text-slate-900">Frustrated with weak airflow that leaves your space hot and stuffy?</p>
      <p>Standard portable fans lack velocity and drain batteries quickly. You need powerful instant airflow anywhere you go.</p>
      <p>The <strong>Turbo High-Velocity Portable Fan</strong> solves this with an ultra-efficient brushless motor, multi-speed controls, and whisper-quiet operation.</p>
    </div>`,
    features: [
      { title: "3–5 Day Express Delivery", desc: "Ships fast via tracked USPS Domestic Ground." },
      { title: "Brushless Turbo Motor", desc: "Delivers powerful multi-speed airflow instantly." },
      { title: "Ultra-Quiet Operation", desc: "Operates below 35dB for uninterrupted sleep or work." },
      { title: "USB Rechargeable", desc: "Long-lasting battery powers through full-day use." },
      { title: "Multi-Pack Savings", desc: "Save up to 18% when ordering 2 or 3 for home and travel." }
    ],
    specs: {
      material: "Reinforced ABS & Brushless Copper Motor",
      power_source: "USB Rechargeable & Battery Powered",
      package_weight: "320g • Compact Ergonomic Form Factor",
      fulfillment_origin: "US Domestic Distribution Center",
      carrier_sla: "USPS Tracked Ground (3–5 Business Days)",
      in_the_box: "1x Turbo Portable Fan, 1x USB-C Cable, 1x User Manual"
    },
    faq_schema: [
      { question: "How fast will my order arrive?", answer: "Orders ship within 24 hours via tracked USPS with delivery in 3 to 5 business days." },
      { question: "What is the battery life?", answer: "Up to 8 hours of continuous operation on a single charge." },
      { question: "What if my item arrives damaged or broken?", answer: "We provide an immediate free replacement at zero cost. Simply contact our support team with a photo of the damaged package within 7 days of delivery." }
    ],
    is_active: true,
    variants: [
      {
        id: 1,
        vid: "1902560845164343298",
        sku: "CJJT233239002BY",
        wholesale_cost: 17.30,
        shipping_cost: 0.0,
        retail_price_1x: 38.05,
        bundle_2_price: 66.96,
        bundle_3_price: 93.59,
        us_warehouse_stock: 133,
        carrier_name: "USPS",
        delivery_sla: "3-5 Days",
        is_available: true
      }
    ]
  },
  {
    id: 2,
    pid: "1897594815467618306",
    title: "Fridge Message Board Having Super Large Writing",
    brand_title: "Domestic Lab",
    slug: "fridge-message-board-having-super-large-writing-9701az",
    category: "Home & Kitchen",
    rating: 4.9,
    review_count: 282,
    hero_image_url: "https://cf.cjdropshipping.com/1649822b-a864-494b-a91d-a39794b40e54.jpg",
    images: [
      "https://cf.cjdropshipping.com/1649822b-a864-494b-a91d-a39794b40e54.jpg",
      "https://cf.cjdropshipping.com/d60583e3-c4bb-41bc-831a-19eeff0a97dd.jpg",
      "https://cf.cjdropshipping.com/74bc4ce8-dfb3-4833-8ccd-f5691acb9b22.jpg"
    ],
    pas_description_html: `<div class="space-y-4 text-slate-700">
      <p class="font-medium text-slate-900">Always forgetting groceries, chores, or important family reminders?</p>
      <p>Sticky notes fall off and clutter surfaces. You need an organized, high-visibility message board.</p>
      <p>The <strong>Magnetic Fridge Planner & Message Board</strong> sticks firmly to any steel appliance with stain-resistant dry-erase laminate.</p>
    </div>`,
    features: [
      { title: "Extra Large Writing Surface", desc: "Generous space for weekly schedules, grocery lists, and notes." },
      { title: "Ultra-Strong Magnetic Backing", desc: "Sticks securely to refrigerators without slipping or scratching." },
      { title: "Stain-Resistant Dry Erase", desc: "Wipes clean effortlessly even after 30 days without ghosting." },
      { title: "Fast Domestic Dispatch", desc: "Ships tracked via USPS directly to your door." },
      { title: "Volume Bundle Discounts", desc: "Save up to 18% when ordering 2 or 3 boards." }
    ],
    specs: {
      material: "Flexible Magnetic Sheet & Stain-Resistant PET Laminate",
      power_source: "Non-Powered Mechanical",
      package_weight: "260g • Roll-Resistant Protective Tube",
      fulfillment_origin: "US Domestic Distribution Center",
      carrier_sla: "USPS Tracked Ground (3–5 Business Days)",
      in_the_box: "1x Large Magnetic Board, 4x Dry-Erase Fine Tip Markers, 1x Eraser"
    },
    faq_schema: [
      { question: "Will it stick to my stainless steel fridge?", answer: "It adheres firmly to all magnetic stainless steel and steel surfaces." },
      { question: "Does it come with markers?", answer: "Designed for all standard dry-erase markers and chalk pens." }
    ],
    is_active: true,
    variants: [
      {
        id: 2,
        vid: "1897594815694110721",
        sku: "CJJT231769701AZ",
        wholesale_cost: 10.73,
        shipping_cost: 0.0,
        retail_price_1x: 23.60,
        bundle_2_price: 41.53,
        bundle_3_price: 58.05,
        us_warehouse_stock: 160,
        carrier_name: "USPS",
        delivery_sla: "3-5 Days",
        is_available: true
      }
    ]
  }
];

export interface CatalogQueryOptions {
  category?: string;
  search?: string;
  min_price?: number;
  max_price?: number;
  sort?: string;
  page?: number;
  limit?: number;
  paginate?: boolean;
}

export async function getCatalog(options?: CatalogQueryOptions): Promise<Product[]> {
  try {
    const params = new URLSearchParams();
    if (options?.category && options.category.toLowerCase() !== "all") params.set("category", options.category);
    if (options?.search) params.set("search", options.search);
    if (options?.min_price !== undefined) params.set("min_price", options.min_price.toString());
    if (options?.max_price !== undefined) params.set("max_price", options.max_price.toString());
    if (options?.sort) params.set("sort", options.sort);
    if (options?.limit) params.set("limit", options.limit.toString());
    else params.set("limit", "100");

    const queryStr = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${API_BASE_URL}/catalog${queryStr}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) throw new Error("Catalog fetch failed");
    const data = await res.json();
    if (Array.isArray(data)) {
      return data.length > 0 ? data : FALLBACK_PRODUCTS;
    }
    if (data && Array.isArray(data.items)) {
      return data.items.length > 0 ? data.items : FALLBACK_PRODUCTS;
    }
    return FALLBACK_PRODUCTS;
  } catch {
    return FALLBACK_PRODUCTS;
  }
}

export async function getPaginatedCatalog(options?: CatalogQueryOptions): Promise<PaginatedCatalogResponse> {
  try {
    const params = new URLSearchParams();
    params.set("paginate", "true");
    if (options?.category && options.category.toLowerCase() !== "all") params.set("category", options.category);
    if (options?.search) params.set("search", options.search);
    if (options?.min_price !== undefined) params.set("min_price", options.min_price.toString());
    if (options?.max_price !== undefined) params.set("max_price", options.max_price.toString());
    if (options?.sort) params.set("sort", options.sort);
    if (options?.page) params.set("page", options.page.toString());
    if (options?.limit) params.set("limit", options.limit.toString());
    else params.set("limit", "24");

    const res = await fetch(`${API_BASE_URL}/catalog?${params.toString()}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) throw new Error("Paginated catalog fetch failed");
    return await res.json();
  } catch {
    return {
      items: FALLBACK_PRODUCTS,
      total_count: FALLBACK_PRODUCTS.length,
      total_pages: 1,
      current_page: 1,
      categories_summary: {
        "Home & Kitchen": 1,
        "Outdoor & Patio": 1,
      },
    };
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/catalog/${slug}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) throw new Error("Product fetch failed");
    return await res.json();
  } catch {
    const fallback = FALLBACK_PRODUCTS.find((p) => p.slug === slug);
    return fallback || null;
  }
}

export async function getCustomerOrders(email: string): Promise<CustomerOrder[]> {
  try {
    const cleanEmail = encodeURIComponent(email.trim().toLowerCase());
    const res = await fetch(`${API_BASE_URL}/orders?email=${cleanEmail}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
