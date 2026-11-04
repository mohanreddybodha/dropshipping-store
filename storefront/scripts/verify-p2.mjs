// Automated Verification Suite for Phase P2 Live Catalog & Legal Compliance
// Run against live Next.js server on http://localhost:3009

import fs from "fs";

const BASE = "http://localhost:3009";

async function runTests() {
  console.log("=================================================");
  console.log(" RUNNING PHASE P2 CATALOG & LEGAL VERIFICATION");
  console.log("=================================================\n");

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

  // -------------------------------------------------------------------------
  // TEST 1: Live Catalog API (GET /api/catalog)
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE}/api/catalog?limit=10`);
    assert(res.status === 200, "P2-1: GET /api/catalog returns HTTP 200", `Status: ${res.status}`);
    const data = await res.json();
    assert(
      Array.isArray(data.items) && data.items.length > 0,
      "P2-1: GET /api/catalog returns items array",
      `Count: ${data.items?.length}`
    );
    assert(
      data.total >= 90,
      "P2-1: Total catalog size reflects full synchronized product catalog (>= 90)",
      `Total: ${data.total}`
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

  // -------------------------------------------------------------------------
  // TEST 2: Product Detail by Slug API (GET /api/catalog/[slug])
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE}/api/catalog/new-for-keeping-turbo-fans-for-with-9002by`);
    assert(res.status === 200, "P2-2: GET /api/catalog/[slug] returns HTTP 200 for valid slug", `Status: ${res.status}`);
    const product = await res.json();
    assert(
      product.title && product.slug === "new-for-keeping-turbo-fans-for-with-9002by",
      "P2-2: Product detail matches requested slug",
      `Slug: ${product.slug}`
    );
  } catch (err) {
    assert(false, "P2-2: Product Detail API exception", err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 3: Cron Tracking Sync Security (GET /api/cron/sync-cj)
  // -------------------------------------------------------------------------
  try {
    // Unauthenticated call should be 401
    const unauthRes = await fetch(`${BASE}/api/cron/sync-cj`);
    assert(
      unauthRes.status === 401,
      "P2-3: GET /api/cron/sync-cj strictly blocks unauthenticated requests (HTTP 401)",
      `Status: ${unauthRes.status}`
    );

    // Authenticated call with Bearer ADMIN_API_KEY
    const authRes = await fetch(`${BASE}/api/cron/sync-cj`, {
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

  // -------------------------------------------------------------------------
  // TEST 4: Statutory Consumer Protection & Legal Pages
  // -------------------------------------------------------------------------
  const legalRoutes = [
    { path: "/privacy", label: "Privacy Policy", keyword: "Privacy Policy" },
    { path: "/terms", label: "Terms of Service", keyword: "Terms of Service" },
    { path: "/shipping-policy", label: "Shipping Policy", keyword: "Shipping" },
    { path: "/refund-policy", label: "Refund Policy", keyword: "Refund" },
  ];

  for (const page of legalRoutes) {
    try {
      const res = await fetch(`${BASE}${page.path}`);
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

  console.log("\n=================================================");
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================\n");

  if (failed > 0) process.exit(1);
}

runTests();
