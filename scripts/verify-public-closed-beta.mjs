import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const marketing = await readFile(new URL("../src/components/MarketingPage.tsx", import.meta.url), "utf8");
const landing = await readFile(new URL("../src/components/LandingPage.tsx", import.meta.url), "utf8");

for (const phrase of ["封測中", "封测中", "Closed beta", "クローズドベータ", "비공개 베타"]) {
  assert.ok(marketing.includes(phrase), `missing closed-beta locale: ${phrase}`);
}

assert.equal((marketing.match(/aria-disabled="true"/g) ?? []).length, 3, "all three product-entry buttons must stay disabled");
assert.doesNotMatch(marketing, /onLoginClick/, "marketing page must not expose an auth callback while closed beta is active");
assert.doesNotMatch(landing, /LoginScreen|[?&]sso/, "public landing page must not open authentication while closed beta is active");

console.log("MUSE_AI_PUBLIC_CLOSED_BETA=PASS");
