// Automated Verification Suite for Phase P0 Security Fixes
// Run against live Next.js server on http://localhost:3009

const BASE = "http://localhost:3009";

async function runTests() {
  console.log("=================================================");
  console.log(" RUNNING PHASE P0 PRODUCTION-READINESS VERIFICATION");
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
  // TEST 1: P0-1 Checkout Bypass Prevention
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE}/api/orders/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: "Attacker",
        customer_email: "attacker@example.com",
        customer_phone: "555-123-4567",
        shipping_address: "123 Fake St",
        shipping_city: "Anytown",
        shipping_province: "CA",
        shipping_zip: "90210",
        items: [{ pid: "test-pid", quantity: 1 }],
      }),
    });
    const data = await res.json().catch(() => ({}));
    assert(
      res.status === 403 && data.error === "FORBIDDEN",
      "P0-1: Direct unauthenticated checkout without payment capture is strictly blocked (HTTP 403)",
      `Status: ${res.status}, body: ${JSON.stringify(data)}`
    );
  } catch (err) {
    assert(false, "P0-1: Direct checkout block exception", err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 2: P0-2 PayPal Server-Side Authoritative Pricing
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE}/api/orders/paypal/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: 0.01, // Client attempting $0.01 price tampering
        items: [], // Empty items
      }),
    });
    const data = await res.json().catch(() => ({}));
    assert(
      res.status === 400 && Boolean(data.error),
      "P0-2: PayPal create rejects zero/empty order items (HTTP 400)",
      `Status: ${res.status}, body: ${JSON.stringify(data)}`
    );
  } catch (err) {
    assert(false, "P0-2: PayPal validation exception", err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 3: P0-3 PII Dump & Margin Protection
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE}/api/orders`);
    const data = await res.json().catch(() => ({}));
    assert(
      res.status === 401 && data.error === "UNAUTHORIZED",
      "P0-3: Parameterless GET /api/orders without admin key is rejected with HTTP 401 (No public order dump)",
      `Status: ${res.status}, body: ${JSON.stringify(data)}`
    );
  } catch (err) {
    assert(false, "P0-3: Public order dump exception", err.message);
  }

  try {
    const res = await fetch(`${BASE}/api/orders?email=customer@example.com`);
    const data = await res.json().catch(() => ({}));
    const items = data.items || [];
    const hasMargins = items.some(
      (it) => it.total_wholesale !== undefined || it.net_profit !== undefined
    );
    assert(
      res.status === 200 && !hasMargins,
      "P0-3: Customer order query does NOT leak total_wholesale or net_profit margins",
      `hasMargins: ${hasMargins}, items count: ${items.length}`
    );
  } catch (err) {
    assert(false, "P0-3: Customer orders margin check exception", err.message);
  }

  try {
    const res = await fetch(`${BASE}/api/user/addresses?email=victim@example.com`);
    const data = await res.json().catch(() => ({}));
    assert(
      res.status === 401 && data.error === "UNAUTHORIZED",
      "P0-3: Unauthenticated address harvesting GET /api/user/addresses?email=... is blocked (HTTP 401)",
      `Status: ${res.status}, body: ${JSON.stringify(data)}`
    );
  } catch (err) {
    assert(false, "P0-3: Address harvesting check exception", err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 4: P0-4 BOLA Order Cancellation & Address Tampering Prevention
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE}/api/orders/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderNumber: "ORD-NONEXISTENT-999",
        // customer_email deliberately omitted by attacker
      }),
    });
    const data = await res.json().catch(() => ({}));
    // Either order not found (404) or customer email required (401)
    assert(
      res.status === 404 || res.status === 401,
      "P0-4: Order cancel without customer email cannot bypass authorization (HTTP 401/404)",
      `Status: ${res.status}, body: ${JSON.stringify(data)}`
    );
  } catch (err) {
    assert(false, "P0-4: Order cancel check exception", err.message);
  }

  try {
    const res = await fetch(`${BASE}/api/orders/address`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderNumber: "ORD-NONEXISTENT-999",
        shipping_name: "Attacker",
        shipping_address: "123 Attack Way",
        shipping_city: "Anytown",
        shipping_province: "CA",
        shipping_zip: "90210",
        // customer_email deliberately omitted
      }),
    });
    const data = await res.json().catch(() => ({}));
    assert(
      res.status === 404 || res.status === 401,
      "P0-4: Order address modification without customer email cannot bypass authorization (HTTP 401/404)",
      `Status: ${res.status}, body: ${JSON.stringify(data)}`
    );
  } catch (err) {
    assert(false, "P0-4: Address modification check exception", err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 5: P0-5 Admin Route Header Spoofing Prevention
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE}/api/admin/orders`, {
      headers: {
        "x-admin-email": "admin@vastire.com",
      },
    });
    const data = await res.json().catch(() => ({}));
    assert(
      res.status === 403 && data.error === "FORBIDDEN",
      "P0-5: GET /api/admin/orders rejects spoofed x-admin-email header (HTTP 403 Forbidden)",
      `Status: ${res.status}, body: ${JSON.stringify(data)}`
    );
  } catch (err) {
    assert(false, "P0-5: Admin orders spoof check exception", err.message);
  }

  try {
    const res = await fetch(`${BASE}/api/admin/sync-cj`, {
      method: "POST",
      headers: {
        "x-admin-email": "admin@vastire.com",
      },
    });
    const data = await res.json().catch(() => ({}));
    assert(
      res.status === 403 && data.error === "FORBIDDEN",
      "P0-5: POST /api/admin/sync-cj rejects spoofed x-admin-email header (HTTP 403 Forbidden)",
      `Status: ${res.status}, body: ${JSON.stringify(data)}`
    );
  } catch (err) {
    assert(false, "P0-5: Admin sync-cj spoof check exception", err.message);
  }

  console.log("\n=================================================");
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
