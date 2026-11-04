// Production Verification Suite: Phase P0 Security & Authorization Hardening
// Verifies: Checkout bypass, authoritative pricing, PII & margin protection, BOLA/IDOR defense, header spoofing rejection

export async function runSecurityTests(base = "http://localhost:3009") {
  console.log("\n=================================================");
  console.log(" [1/3] PRODUCTION SECURITY & AUTHORIZATION TESTS");
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

  // TEST 1: P0-1 Checkout Bypass Prevention
  try {
    const res = await fetch(`${base}/api/orders/checkout`, {
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
      `Status: ${res.status}`
    );
  } catch (err) {
    assert(false, "P0-1: Direct checkout block exception", err.message);
  }

  // TEST 2: P0-2 Server-Side Authoritative Pricing
  try {
    const res = await fetch(`${base}/api/orders/paypal/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: 0.01,
        items: [],
      }),
    });
    const data = await res.json().catch(() => ({}));
    assert(
      res.status === 400 && Boolean(data.error),
      "P0-2: PayPal create rejects zero/empty order items (HTTP 400)",
      `Status: ${res.status}`
    );
  } catch (err) {
    assert(false, "P0-2: PayPal validation exception", err.message);
  }

  // TEST 3: P0-3 PII Dump & Margin Protection
  try {
    const res = await fetch(`${base}/api/orders`);
    const data = await res.json().catch(() => ({}));
    assert(
      res.status === 401 && data.error === "UNAUTHORIZED",
      "P0-3: Parameterless GET /api/orders without admin key is rejected with HTTP 401 (No public order dump)",
      `Status: ${res.status}`
    );
  } catch (err) {
    assert(false, "P0-3: Public order dump exception", err.message);
  }

  try {
    const res = await fetch(`${base}/api/orders?email=customer@example.com`);
    const data = await res.json().catch(() => ({}));
    const items = data.items || [];
    const hasMargins = items.some(
      (it) => it.total_wholesale !== undefined || it.net_profit !== undefined
    );
    assert(
      res.status === 200 && !hasMargins,
      "P0-3: Customer order query does NOT leak total_wholesale or net_profit margins",
      `hasMargins: ${hasMargins}`
    );
  } catch (err) {
    assert(false, "P0-3: Customer orders margin check exception", err.message);
  }

  try {
    const res = await fetch(`${base}/api/user/addresses?email=victim@example.com`);
    const data = await res.json().catch(() => ({}));
    assert(
      res.status === 401 && data.error === "UNAUTHORIZED",
      "P0-3: Unauthenticated address harvesting GET /api/user/addresses?email=... is blocked (HTTP 401)",
      `Status: ${res.status}`
    );
  } catch (err) {
    assert(false, "P0-3: Address harvesting check exception", err.message);
  }

  // TEST 4: P0-4 BOLA Order Cancellation & Address Tampering Prevention
  try {
    const res = await fetch(`${base}/api/orders/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        internal_order_number: "ORD-NONEXISTENT-999",
      }),
    });
    const data = await res.json().catch(() => ({}));
    assert(
      res.status === 400 || res.status === 401 || res.status === 404,
      "P0-4: Order cancel without customer email cannot bypass authorization (HTTP 400/401/404)",
      `Status: ${res.status}`
    );
  } catch (err) {
    assert(false, "P0-4: Order cancel check exception", err.message);
  }

  try {
    const res = await fetch(`${base}/api/orders/address`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderNumber: "ORD-NONEXISTENT-999",
        shipping_name: "Attacker",
        shipping_address: "123 Attacker Way",
        shipping_city: "Anytown",
        shipping_province: "CA",
        shipping_zip: "90210",
      }),
    });
    const data = await res.json().catch(() => ({}));
    assert(
      res.status === 400 || res.status === 401 || res.status === 404,
      "P0-4: Order address modification without customer email cannot bypass authorization (HTTP 400/401/404)",
      `Status: ${res.status}, body: ${JSON.stringify(data)}`
    );
  } catch (err) {
    assert(false, "P0-4: Order address check exception", err.message);
  }

  // TEST 5: P0-5 Elimination of Header-Spoofed Admin Access
  try {
    const res = await fetch(`${base}/api/admin/orders`, {
      headers: {
        "x-admin-email": "admin@vastire.com",
      },
    });
    const data = await res.json().catch(() => ({}));
    assert(
      res.status === 403 && data.error === "FORBIDDEN",
      "P0-5: GET /api/admin/orders rejects spoofed x-admin-email header (HTTP 403 Forbidden)",
      `Status: ${res.status}`
    );
  } catch (err) {
    assert(false, "P0-5: Admin orders header spoof check exception", err.message);
  }

  try {
    const res = await fetch(`${base}/api/admin/sync-cj`, {
      method: "POST",
      headers: {
        "x-admin-email": "admin@vastire.com",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    const data = await res.json().catch(() => ({}));
    assert(
      res.status === 403 && data.error === "FORBIDDEN",
      "P0-5: POST /api/admin/sync-cj rejects spoofed x-admin-email header (HTTP 403 Forbidden)",
      `Status: ${res.status}`
    );
  } catch (err) {
    assert(false, "P0-5: Admin sync header spoof check exception", err.message);
  }

  console.log(`Phase P0 Results: ${passed} passed, ${failed} failed.`);
  return { passed, failed };
}
