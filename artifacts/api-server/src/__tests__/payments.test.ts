// Unit tests for Razorpay signature verification — the gate that stands between
// "client claims they paid" and "we grant cubes/subscriptions". Pure logic, no
// DB or network: runnable with `pnpm --filter @workspace/api-server test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { verifyRazorpaySignature } from "../lib/payments";

const SECRET = "test_secret_key";
const orderId = "order_ABC123";
const paymentId = "pay_XYZ789";

function sign(order: string, payment: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(`${order}|${payment}`).digest("hex");
}

test("accepts a correctly signed payment", () => {
  const signature = sign(orderId, paymentId, SECRET);
  assert.equal(verifyRazorpaySignature({ orderId, paymentId, signature, secret: SECRET }), true);
});

test("rejects a tampered signature", () => {
  const signature = sign(orderId, paymentId, SECRET).replace(/.$/, (c) => (c === "0" ? "1" : "0"));
  assert.equal(verifyRazorpaySignature({ orderId, paymentId, signature, secret: SECRET }), false);
});

test("rejects when the secret is wrong", () => {
  const signature = sign(orderId, paymentId, "the_wrong_secret");
  assert.equal(verifyRazorpaySignature({ orderId, paymentId, signature, secret: SECRET }), false);
});

test("rejects when the order id is swapped (no cross-order replay)", () => {
  const signature = sign("order_DIFFERENT", paymentId, SECRET);
  assert.equal(verifyRazorpaySignature({ orderId, paymentId, signature, secret: SECRET }), false);
});

test("rejects empty / missing fields without throwing", () => {
  assert.equal(verifyRazorpaySignature({ orderId: "", paymentId, signature: "x", secret: SECRET }), false);
  assert.equal(verifyRazorpaySignature({ orderId, paymentId, signature: "", secret: SECRET }), false);
  assert.equal(verifyRazorpaySignature({ orderId, paymentId, signature: "abc", secret: "" }), false);
});

test("rejects a signature of the wrong length without throwing", () => {
  // timingSafeEqual throws on length mismatch; the helper must guard against it.
  assert.doesNotThrow(() =>
    verifyRazorpaySignature({ orderId, paymentId, signature: "short", secret: SECRET }),
  );
  assert.equal(verifyRazorpaySignature({ orderId, paymentId, signature: "short", secret: SECRET }), false);
});
