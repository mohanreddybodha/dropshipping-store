// Production Verification Suite: Phase P3 End-to-End Bundle & Checkout Pricing Consistency
// Verifies: DB/Catalog formula alignment, quantity step-up bundle upgrades, single-unit zero-discount invariant, and server PayPal parity.

import fs from "fs";
import path from "path";
import ts from "typescript";

function loadBundlePricingModule() {
  const relCandidates = [
    "src/lib/bundlePricing.ts",
    "storefront/src/lib/bundlePricing.ts",
  ];
  const filePath = relCandidates.find((p) => fs.existsSync(p));
  if (!filePath) {
    throw new Error("Could not locate storefront/src/lib/bundlePricing.ts");
  }
  const source = fs.readFileSync(filePath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });
  const mod = { exports: {} };
  const wrapped = new Function("exports", "require", "module", "__filename", "__dirname", outputText);
  wrapped(mod.exports, () => ({}), mod, path.resolve(filePath), path.dirname(path.resolve(filePath)));
  return mod.exports;
}

export async function runPricingConsistencyTests(base = "http://localhost:3009") {
  console.log("\n=================================================");
  console.log(" [4/4] PRODUCTION PRICING & BUNDLE CONSISTENCY TESTS");
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

  // TEST 1: Catalog API bundle formula verification across ALL active variants
  let sampleProduct = null;
  let sampleVariant = null;
  try {
    const res = await fetch(`${base}/api/catalog?limit=500`);
    const data = await res.json();
    const items = data.items || [];
    assert(res.status === 200 && items.length >= 70, "P3-1: Full active catalog loaded for pricing audit");

    const formulaViolations = [];
    for (const p of items) {
      for (const v of p.variants || []) {
        const r1 = Number(v.retail_price_1x || 0);
        const b2 = Number(v.bundle_2_price || 0);
        const b3 = Number(v.bundle_3_price || 0);
        const exp2 = +(+(r1 * 2.0 * 0.88).toFixed(2) - 0.01).toFixed(2);
        const exp3 = +(+(r1 * 3.0 * 0.82).toFixed(2) - 0.01).toFixed(2);
        if (r1 <= 0 || Math.abs(b2 - exp2) > 0.02 || Math.abs(b3 - exp3) > 0.02) {
          formulaViolations.push({ slug: p.slug, vid: v.vid, r1, b2, exp2, b3, exp3 });
        }
        if (!sampleVariant && r1 > 10 && v.vid) {
          sampleProduct = p;
          sampleVariant = v;
        }
      }
    }

    assert(
      formulaViolations.length === 0,
      "P3-1: 100% of active catalog variants obey 2x (-12% - $0.01) & 3x (-18% - $0.01) formulas",
      `Violations: ${JSON.stringify(formulaViolations.slice(0, 5))}`
    );
  } catch (err) {
    assert(false, "P3-1: Catalog formula audit exception", err.message);
  }

  // TEST 2: Client shared pricing engine behavior across 1x -> 2x -> 3x -> 4x -> 1x
  try {
    const bp = loadBundlePricingModule();
    const v = sampleVariant || {
      vid: "TEST_VID",
      retail_price_1x: 39.95,
      bundle_2_price: 70.30,
      bundle_3_price: 98.27,
    };

    const p1 = bp.computeBundlePricing(v, 1);
    assert(
      p1.tier === "1x" && p1.totalPrice === +v.retail_price_1x.toFixed(2) && p1.savings === 0,
      "P3-2a: Single unit (1x) charges exact 1x retail price with $0.00 bundle savings",
      JSON.stringify(p1)
    );

    const p2 = bp.computeBundlePricing(v, 2);
    const expSavings2 = +(v.retail_price_1x * 2 - v.bundle_2_price).toFixed(2);
    assert(
      p2.tier === "2x" &&
        p2.totalPrice === +v.bundle_2_price.toFixed(2) &&
        Math.abs(p2.savings - expSavings2) < 0.001,
      "P3-2b: Incrementing 1 -> 2 automatically applies 2x bundle price and exact savings",
      JSON.stringify(p2)
    );

    const p3 = bp.computeBundlePricing(v, 3);
    const expSavings3 = +(v.retail_price_1x * 3 - v.bundle_3_price).toFixed(2);
    assert(
      p3.tier === "3x" &&
        p3.totalPrice === +v.bundle_3_price.toFixed(2) &&
        Math.abs(p3.savings - expSavings3) < 0.001,
      "P3-2c: Incrementing 2 -> 3 automatically applies 3x bundle price and exact savings",
      JSON.stringify(p3)
    );

    const p4 = bp.computeBundlePricing(v, 4);
    assert(
      p4.tier === "3x" &&
        p4.unitPrice === +(v.bundle_3_price / 3).toFixed(2) &&
        p4.totalPrice === +(p4.unitPrice * 4).toFixed(2) &&
        p4.savings > 0,
      "P3-2d: Quantity 4+ maintains 3x bundle rate consistently",
      JSON.stringify(p4)
    );

    const pBackTo1 = bp.normalizeCartItemPricing(
      {
        product: sampleProduct || { pid: "p1", title: "Test", slug: "test", is_active: true, variants: [v] },
        variant: v,
        tier: "3x",
        quantity: 3,
        unitPrice: p3.unitPrice,
        totalPrice: p3.totalPrice,
        savings: p3.savings,
      },
      1
    );
    assert(
      pBackTo1.tier === "1x" && pBackTo1.savings === 0 && pBackTo1.totalPrice === +v.retail_price_1x.toFixed(2),
      "P3-2e: Decrementing 3 -> 1 downgrades tier to 1x and resets savings to $0.00",
      JSON.stringify(pBackTo1)
    );

    const singleSummary = bp.summarizeCartTotals([p1]);
    assert(
      singleSummary.totalAmount === p1.totalPrice && singleSummary.totalSavings === 0,
      "P3-2f: Summary totals for single-unit cart never emit hardcoded $8.50 or phantom savings",
      JSON.stringify(singleSummary)
    );
  } catch (err) {
    assert(false, "P3-2: Client pricing helper exception", err.message);
  }

  // TEST 3: Live Server PayPal /api/orders/paypal/create Authoritative Bundle Reconciliation
  if (sampleVariant) {
    try {
      const checkCreate = async (tier, qty, expectedAmount, label) => {
        const res = await fetch(`${base}/api/orders/paypal/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: [{ vid: sampleVariant.vid, tier, quantity: qty, unit_price: 0.01 }],
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (res.status === 503 && /not configured/i.test(body.error || "")) {
          console.log(`[SKIP] ${label} - PayPal sandbox credentials not configured in runtime`);
          return;
        }
        assert(
          res.status === 200 && Math.abs(Number(body.authoritative_amount) - expectedAmount) < 0.001,
          label,
          `Status: ${res.status}, got: ${body.authoritative_amount}, expected: ${expectedAmount}, body: ${JSON.stringify(body)}`
        );
      };

      await checkCreate(
        "1x",
        2,
        +sampleVariant.bundle_2_price.toFixed(2),
        "P3-3a: PayPal create applies 2x bundle discount automatically for tier='1x', qty=2"
      );
      await checkCreate(
        "1x",
        3,
        +sampleVariant.bundle_3_price.toFixed(2),
        "P3-3b: PayPal create applies 3x bundle discount automatically for tier='1x', qty=3"
      );
      await checkCreate(
        "3x",
        1,
        +sampleVariant.retail_price_1x.toFixed(2),
        "P3-3c: PayPal create denies bundle discount exploit when tier='3x', qty=1"
      );
    } catch (err) {
      assert(false, "P3-3: PayPal authoritative pricing check exception", err.message);
    }
  }

  console.log(`Phase P3 Results: ${passed} passed, ${failed} failed.`);
  return { passed, failed };
}
