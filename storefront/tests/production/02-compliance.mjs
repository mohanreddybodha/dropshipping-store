// Production Verification Suite: Phase P2 Catalog, Cron Tracking, & Legal Compliance
// Verifies: Live PostgreSQL catalog engine, slug resolution, cron authentication, FTC 30-day/CCPA legal disclosure pages

import fs from "fs";

export async function runComplianceTests(base = "http://localhost:3009") {
  console.log("\n=================================================");
  console.log(" [3/3] PRODUCTION CATALOG & LEGAL COMPLIANCE TESTS");
  console.log("=================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = "") {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  const envPath = fs.existsSync(".env.local") ? ".env.local" : "storefront/.env.local";
  const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const adminKeyMatch = envContent.match(/ADMIN_API_KEY=([^\r\n]+)/);
  const adminKey = process.env.ADMIN_API_KEY || (adminKeyMatch ? adminKeyMatch[1].trim() : "vastire_admin_dev_secret_key_2026");

  // TEST 1: Live Catalog API (GET /api/catalog)
  try {
    const res = await fetch(`${base}/api/catalog?limit=10`);
    assert(res.status === 200, "P2-1: GET /api/catalog returns HTTP 200", `Status: ${res.status}`);
    const data = await res.json();
    assert(
      Array.isArray(data.items) && data.items.length > 0,
      "P2-1: GET /api/catalog returns items array",
      `Count: ${data.items?.length}`
    );
    assert(
      data.total >= 60,
      "P2-1: Total catalog size reflects compliant synchronized product catalog (>= 60)",
      `Total: ${data.total}`
    );
    const allRes = await fetch(`${base}/api/catalog?limit=500`);
    const allData = await allRes.json();
    const allItems = allData.items || [];
    const lowStockLeak = allItems.some((p) =>
      (p.variants || []).some((v) => v.is_available === false || (typeof v.us_warehouse_stock === "number" && v.us_warehouse_stock <= 15))
    );
    assert(
      !lowStockLeak,
      "P2-1b: Catalog API excludes all unavailable or <= 15 stock variants"
    );
    const prohibitedLeak = allItems.some((p) =>
      /\b(blackhead|facial|sansi|ouhoe|rayhong|yegbong|kegani|hoodie|trousers|cargo pants|t-shirt|romper|jumpsuit)\b/i.test(p.title || "")
    );
    assert(
      !prohibitedLeak,
      "P2-1c: Catalog API contains zero prohibited facial, apparel, or third-party brand items"
    );
    const item0 = data.items[0];
    assert(
      item0.variants && item0.variants.length > 0 && typeof item0.variants[0].retail_price_1x === "number",
      "P2-1: Catalog items include variants with valid retail_price_1x",
      `First variant: ${JSON.stringify(item0.variants?.[0])}`
    );
  } catch (err) {
    assert(false, "P2-1: Catalog API exception", err.message);
  }

  // TEST 2: Product Detail by Slug API (GET /api/catalog/[slug]) + Clean Slug & Legacy Redirect Compatibility
  try {
    const cleanRes = await fetch(`${base}/api/catalog/portable-high-velocity-usb-turbo-desk-fan`);
    assert(cleanRes.status === 200, "P2-2: GET /api/catalog/[slug] returns HTTP 200 for clean SEO slug", `Status: ${cleanRes.status}`);
    const cleanProduct = await cleanRes.json();
    assert(
      cleanProduct.title && cleanProduct.slug === "portable-high-velocity-usb-turbo-desk-fan",
      "P2-2: Product detail matches clean keyword slug",
      `Slug: ${cleanProduct.slug}`
    );

    const legacyApiRes = await fetch(`${base}/api/catalog/new-for-keeping-turbo-fans-for-with-9002by`);
    const legacyProduct = await legacyApiRes.json();
    assert(
      legacyApiRes.status === 200 && legacyProduct.slug === "portable-high-velocity-usb-turbo-desk-fan",
      "P2-2b: Legacy supplier slug continues resolving to canonical clean slug",
      `Status: ${legacyApiRes.status}, Slug: ${legacyProduct.slug}`
    );
  } catch (err) {
    assert(false, "P2-2: Product Detail API exception", err.message);
  }

  // TEST 3: Cron Tracking Sync Security (GET /api/cron/sync-cj)
  try {
    const unauthRes = await fetch(`${base}/api/cron/sync-cj`);
    assert(
      unauthRes.status === 401,
      "P2-3: GET /api/cron/sync-cj strictly blocks unauthenticated requests (HTTP 401)",
      `Status: ${unauthRes.status}`
    );

    const authRes = await fetch(`${base}/api/cron/sync-cj`, {
      headers: { Authorization: `Bearer ${adminKey}` },
    });
    assert(
      authRes.status === 200,
      "P2-3: GET /api/cron/sync-cj accepts valid admin/cron bearer secret (HTTP 200)",
      `Status: ${authRes.status}`
    );
    const cronData = await authRes.json();
    assert(
      cronData.success === true && typeof cronData.items_processed === "number",
      "P2-3: Cron sync returns execution telemetry",
      `Items processed: ${cronData.items_processed}`
    );
  } catch (err) {
    assert(false, "P2-3: Cron API exception", err.message);
  }

  // TEST 4: Statutory Consumer Protection & Legal Pages
  const legalRoutes = [
    { path: "/privacy", label: "Privacy Policy", keyword: "Privacy Policy" },
    { path: "/terms", label: "Terms of Service", keyword: "Terms of Service" },
    { path: "/shipping-policy", label: "Shipping Policy", keyword: "Shipping" },
    { path: "/refund-policy", label: "Refund Policy", keyword: "Refund" },
  ];

  for (const page of legalRoutes) {
    try {
      const res = await fetch(`${base}${page.path}`);
      assert(
        res.status === 200,
        `P2-4: Legal page ${page.path} returns HTTP 200`,
        `Status: ${res.status}`
      );
      const text = await res.text();
      assert(
        text.includes(page.keyword),
        `P2-4: Legal page ${page.path} contains expected statutory disclosure ("${page.keyword}")`
      );
    } catch (err) {
      assert(false, `P2-4: Legal page ${page.path} exception`, err.message);
    }
  }

  console.log(`Phase P2 Results: ${passed} passed, ${failed} failed.`);
  return { passed, failed };
}
