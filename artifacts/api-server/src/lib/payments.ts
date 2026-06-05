import crypto from "crypto";

export interface RazorpaySignatureInput {
  orderId: string;
  paymentId: string;
  signature: string;
  secret: string;
}

/**
 * Verify a Razorpay payment signature.
 *
 * Razorpay signs `${order_id}|${payment_id}` with HMAC-SHA256 keyed by your
 * secret. We recompute it and compare in constant time. Pure and
 * dependency-free (only Node crypto) so it can be unit-tested without a DB,
 * network, or live keys — which is exactly the logic you most want covered.
 *
 * Returns false (never throws) on any missing field or mismatch.
 */
export function verifyRazorpaySignature({
  orderId,
  paymentId,
  signature,
  secret,
}: RazorpaySignatureInput): boolean {
  if (!orderId || !paymentId || !signature || !secret) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const sigBuf = Buffer.from(signature, "utf8");
  const expBuf = Buffer.from(expected, "utf8");
  // Length check first: timingSafeEqual throws if the buffers differ in length.
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}
