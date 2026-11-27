import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanSignInCode, decodeSession, encodeSession, normalizeEmail } from "../lib/session-token";

test("a signed session round-trips and rejects tampering or expiry", () => {
  const raw = encodeSession({ email: "host@example.com", exp: 2_000 }, "secret");
  assert.deepEqual(decodeSession(raw, "secret", 1_000), { email: "host@example.com", exp: 2_000 });
  assert.equal(decodeSession(raw, "other", 1_000), null);
  assert.equal(decodeSession(raw.replace(/.$/, "x"), "secret", 1_000), null);
  assert.equal(decodeSession(raw, "secret", 3_000), null);
});

test("emails and codes are cleaned before use", () => {
  assert.equal(normalizeEmail("  Host@Example.COM "), "host@example.com");
  assert.equal(normalizeEmail("nope"), null);
  assert.equal(cleanSignInCode("123 456"), "123456");
  assert.equal(cleanSignInCode("12345"), null);
});
