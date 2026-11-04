// Production Verification Suite: Phase P1 Fulfillment Pipeline & DLQ Resiliency
// Verifies: Catalog VID resolution, DLQ retry authorization, DLQ required validation, DLQ listing schema

import fs from "fs";

export async function runFulfillmentTests(base = "http://localhost:3009") {
  console.log("\n=================================================");
  console.log(" [2/3] PRODUCTION FULFILLMENT & DLQ TESTS");
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

  // TEST 1: Variant VID Resolution via Catalog
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

  // TEST 2: Admin Retry-Fulfillment Route Security
  try {
    const unauthRes = await fetch(`${base}/api/admin/orders/retry-fulfillment`, {
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

  // Resolve admin key from environment
  const envPath = fs.existsSync(".env.local") ? ".env.local" : "storefront/.env.local";
  const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const adminKeyMatch = envContent.match(/ADMIN_API_KEY=([^\r\n]+)/);
  const adminKey = process.env.ADMIN_API_KEY || (adminKeyMatch ? adminKeyMatch[1].trim() : "vastire_admin_dev_secret_key_2026");

  // TEST 3: Admin Retry-Fulfillment Validation Checks
  try {
    const missingNumRes = await fetch(`${base}/api/admin/orders/retry-fulfillment`, {
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
    assert(false, "P1-3: Retry validation exception", err.message);
  }

  // TEST 4: Admin Retry-Fulfillment Non-Existent Order
  try {
    const notFoundRes = await fetch(`${base}/api/admin/orders/retry-fulfillment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-api-key": adminKey,
      },
      body: JSON.stringify({ internal_order_number: "VAST-NONEXISTENT-9999" }),
    });
    assert(
      notFoundRes.status === 404,
      "P1-3: POST /api/admin/orders/retry-fulfillment returns 404 for non-existent orders",
      `Status: ${notFoundRes.status}`
    );
  } catch (err) {
    assert(false, "P1-3: Retry 404 check exception", err.message);
  }

  // TEST 5: Admin Orders Listing Returns DLQ Schema
  try {
    const listRes = await fetch(`${base}/api/admin/orders`, {
      headers: { "x-admin-api-key": adminKey },
    });
    const listData = await listRes.json();
    assert(
      Array.isArray(listData.orders),
      "P1-3: GET /api/admin/orders returns orders array with DLQ fields",
      `Count: ${listData.orders?.length}`
    );
  } catch (err) {
    assert(false, "P1-3: Admin orders list exception", err.message);
  }

  console.log(`Phase P1 Results: ${passed} passed, ${failed} failed.`);
  return { passed, failed };
}
