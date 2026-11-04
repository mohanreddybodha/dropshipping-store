// Unified Production Verification Test Runner
// Executes Phase P0 Security, Phase P1 Fulfillment, and Phase P2 Compliance test suites.

import { runSecurityTests } from "./00-security.mjs";
import { runFulfillmentTests } from "./01-fulfillment.mjs";
import { runComplianceTests } from "./02-compliance.mjs";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3009";

async function main() {
  console.log("==================================================================");
  console.log(" EXECUTING PRODUCTION READINESS AUTOMATED VERIFICATION BATTERY");
  console.log(` Target Server: ${BASE_URL}`);
  console.log("==================================================================");

  const t0 = await runSecurityTests(BASE_URL);
  const t1 = await runFulfillmentTests(BASE_URL);
  const t2 = await runComplianceTests(BASE_URL);

  const totalPassed = t0.passed + t1.passed + t2.passed;
  const totalFailed = t0.failed + t1.failed + t2.failed;

  console.log("\n==================================================================");
  console.log(` PRODUCTION BATTERY SUMMARY: ${totalPassed} PASSED, ${totalFailed} FAILED`);
  console.log("==================================================================");

  if (totalFailed > 0) {
    console.error(`\nFAILED: ${totalFailed} assertion(s) failed in production test suite.`);
    process.exit(1);
  } else {
    console.log(`\nSUCCESS: All ${totalPassed} production-readiness assertions verified.`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Test runner exception:", err);
  process.exit(1);
});
