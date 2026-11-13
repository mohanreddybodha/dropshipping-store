import assert from "node:assert";
import {
  mulberry32,
  seededShuffle,
  getPersonalizedFeaturedProducts,
} from "../../src/lib/recommendations.ts";

console.log("=== Testing Recommendation & Rotation Engine ===");

// 1. Determinism test
const rng1 = mulberry32(12345);
const rng2 = mulberry32(12345);
const seq1 = [rng1(), rng1(), rng1()];
const seq2 = [rng2(), rng2(), rng2()];
assert.deepStrictEqual(seq1, seq2, "Mulberry32 must produce identical output for identical seed");
console.log("✔ Mulberry32 deterministic PRNG verified");

// Mock catalog with 15 items across 3 categories
const mockProducts = [
  { id: 1, title: "Fan A", category: "Workspace & Tech", variants: [{ retail_price_1x: 20 }] },
  { id: 2, title: "Fan B", category: "Workspace & Tech", variants: [{ retail_price_1x: 22 }] },
  { id: 3, title: "Fan C", category: "Workspace & Tech", variants: [{ retail_price_1x: 24 }] },
  { id: 4, title: "Fan D", category: "Workspace & Tech", variants: [{ retail_price_1x: 26 }] },
  { id: 5, title: "Fan E", category: "Workspace & Tech", variants: [{ retail_price_1x: 28 }] },
  { id: 6, title: "Lamp A", category: "Smart Lighting", variants: [{ retail_price_1x: 30 }] },
  { id: 7, title: "Lamp B", category: "Smart Lighting", variants: [{ retail_price_1x: 32 }] },
  { id: 8, title: "Lamp C", category: "Smart Lighting", variants: [{ retail_price_1x: 34 }] },
  { id: 9, title: "Lamp D", category: "Smart Lighting", variants: [{ retail_price_1x: 36 }] },
  { id: 10, title: "Lamp E", category: "Smart Lighting", variants: [{ retail_price_1x: 38 }] },
  { id: 11, title: "Cook A", category: "Home & Kitchen", variants: [{ retail_price_1x: 15 }] },
  { id: 12, title: "Cook B", category: "Home & Kitchen", variants: [{ retail_price_1x: 17 }] },
  { id: 13, title: "Cook C", category: "Home & Kitchen", variants: [{ retail_price_1x: 19 }] },
  { id: 14, title: "Cook D", category: "Home & Kitchen", variants: [{ retail_price_1x: 21 }] },
  { id: 15, title: "Cook E", category: "Home & Kitchen", variants: [{ retail_price_1x: 23 }] },
];

// 2. Anti-clustering interleaving test
const resultSeed1 = getPersonalizedFeaturedProducts(mockProducts, 101);
assert.strictEqual(resultSeed1.length, mockProducts.length, "All products must be preserved");

// Verify that the first 3 items are all from different categories
const firstThreeCats = new Set([
  resultSeed1[0].category,
  resultSeed1[1].category,
  resultSeed1[2].category,
]);
assert.strictEqual(firstThreeCats.size, 3, "First 3 items must be interleaved across 3 distinct categories");
console.log("✔ Anti-clustering interleaving verified: first 3 items are", resultSeed1.slice(0, 3).map(p => `[${p.category}: ${p.title}]`).join(", "));

// 3. Rotation across visits/sessions test
const resultSeed2 = getPersonalizedFeaturedProducts(mockProducts, 999);
assert.notDeepStrictEqual(
  resultSeed1.map(p => p.id),
  resultSeed2.map(p => p.id),
  "Different seeds must produce different product rotations"
);
console.log("✔ Seed-based session rotation verified (Seed 101 vs Seed 999 produce distinct ordering)");

console.log("=== All Recommendation Tests Passed Successfully! ===");
