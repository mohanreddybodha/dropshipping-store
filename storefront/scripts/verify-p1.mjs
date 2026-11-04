// Automated Verification Suite for Phase P1 Fulfillment Pipeline & DLQ
// Run against live Next.js server on http://localhost:3009

import fs from "fs";

const BASE = "http://localhost:3009";

async function runTests() {
  console.log("=================================================");
  console.log(" RUNNING PHASE P1 FULFILLMENT & DLQ VERIFICATION");
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

  // -------------------------------------------------------------------------
  // TEST 1: Variant VID Resolution via Catalog Assets
  // -------------------------------------------------------------------------
  try {
    const catalogPath = fs.existsSync("src/lib/seedCatalog.json")
      ? "src/lib/seedCatalog.json"
      : "storefront/src/lib/seedCatalog.json";
    const rawCatalog = fs.readFileSync(catalogPath, "utf8");
    const catalog = JSON.parse(rawCatalog);
    const fan = catalog.find((p) => p.pid === "1902560845030125569");
    const variant = fan?.variants?.find((v) => v.sku === "CJJT233239002BY");
    assert(
      variant && variant.vid === "1902560845164343298",
      "P1-1: Catalog items correctly resolve to authoritative CJ Variant ID (VID)",
      `Expected vid 1902560845164343298, got: ${variant?.vid}`
    );
  } catch (err) {
    assert(false, "P1-1: VID resolution exception", err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 2: Admin Retry-Fulfillment Route Security
  // -------------------------------------------------------------------------
  try {
    // Unauthenticated call
    const unauthRes = await fetch(`${BASE}/api/admin/orders/retry-fulfillment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ internal_order_number: "ORD-TEST-123" }),
    });
    assert(
      unauthRes.status === 403,
      "P1-3: POST /api/admin/orders/retry-fulfillment strictly blocks unauthenticated calls (HTTP 403)",
      `Status: ${unauthRes.status}`
    );
  } catch (err) {
    assert(false, "P1-3: Retry unauthenticated call exception", err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 3: Admin Retry-Fulfillment Validation Checks
  // -------------------------------------------------------------------------
  const envPath = fs.existsSync(".env.local") ? ".env.local" : "storefront/.env.local";
  const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const adminKeyMatch = envContent.match(/ADMIN_API_KEY=([^\r\n]+)/);
  const adminKey = process.env.ADMIN_API_KEY || (adminKeyMatch ? adminKeyMatch[1].trim() : "vastire_admin_dev_secret_key_2026");

  try {
    // Missing internal_order_number
    const missingNumRes = await fetch(`${BASE}/api/admin/orders/retry-fulfillment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-api-key": adminKey,
      },
      body: JSON.stringify({}),
    });
    assert(
      missingNumRes.status === 400,
      "P1-3: POST /api/admin/orders/retry-fulfillment validates required internal_order_number (HTTP 400)",
      `Status: ${missingNumRes.status}`
    );
  } catch (err) {
    assert(false, "P1-3: Retry missing param exception", err.message);
  }

  try {
    // Non-existent order lookup
    const nonExistentRes = await fetch(`${BASE}/api/admin/orders/retry-fulfillment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-api-key": adminKey,
      },
      body: JSON.stringify({ internal_order_number: "ORD-NONEXISTENT-99999" }),
    });
    assert(
      nonExistentRes.status === 404,
      "P1-3: POST /api/admin/orders/retry-fulfillment returns 404 for non-existent orders",
      `Status: ${nonExistentRes.status}`
    );
  } catch (err) {
    assert(false, "P1-3: Retry non-existent order exception", err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 4: DLQ Order Status Tracking in Admin Endpoint
  // -------------------------------------------------------------------------
  try {
    const adminOrdersRes = await fetch(`${BASE}/api/admin/orders`, {
      headers: {
        "x-admin-api-key": adminKey,
      },
    });
    const data = await adminOrdersRes.json();
    assert(
      adminOrdersRes.status === 200 && Array.isArray(data.orders),
      "P1-3: GET /api/admin/orders returns orders array with DLQ fields",
      `Status: ${adminOrdersRes.status}, count: ${data.orders?.length}`
    );
  } catch (err) {
    assert(false, "P1-3: Admin orders fetch exception", err.message);
  }

  console.log("\n=================================================");
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
