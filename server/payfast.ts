import crypto from "crypto";

const PAYFAST_MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID!;
const PAYFAST_MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY!;
const PAYFAST_PASSPHRASE = process.env.PAYFAST_PASSPHRASE || "";

const SANDBOX = !PAYFAST_MERCHANT_ID || PAYFAST_MERCHANT_ID === "10000100";
const BASE_URL = SANDBOX
  ? "https://sandbox.payfast.co.za/eng/process"
  : "https://www.payfast.co.za/eng/process";

export interface PayFastSubscriptionParams {
  subscriptionId: string;
  tierName: string;
  amountInCents: number;
  providerName: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
  emailAddress?: string;
}

function generateSignature(data: Record<string, string>, passphrase?: string): string {
  const params = Object.entries(data)
    .filter(([, v]) => v !== "" && v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v)).replace(/%20/g, "+")}`)
    .join("&");

  const signatureString = passphrase ? `${params}&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, "+")}` : params;
  return crypto.createHash("md5").update(signatureString).digest("hex");
}

export function buildPayFastUrl(params: PayFastSubscriptionParams): string {
  const amountRands = (params.amountInCents / 100).toFixed(2);

  const data: Record<string, string> = {
    merchant_id: PAYFAST_MERCHANT_ID,
    merchant_key: PAYFAST_MERCHANT_KEY,
    return_url: params.returnUrl,
    cancel_url: params.cancelUrl,
    notify_url: params.notifyUrl,
    name_first: params.providerName.substring(0, 100),
    email_address: params.emailAddress || "",
    m_payment_id: params.subscriptionId,
    amount: amountRands,
    item_name: `Koneksi ${params.tierName} Plan`,
    item_description: `Monthly subscription - ${params.tierName} visibility tier`,
    custom_str1: params.subscriptionId,
    subscription_type: "1",
    recurring_amount: amountRands,
    frequency: "3",
    cycles: "0",
  };

  if (!data.email_address) delete data.email_address;

  const signature = generateSignature(data, PAYFAST_PASSPHRASE || undefined);
  data.signature = signature;

  const queryString = Object.entries(data)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");

  return `${BASE_URL}?${queryString}`;
}

export function verifyPayFastSignature(body: Record<string, string>): boolean {
  const received = body.signature;
  if (!received) return false;

  const filtered: Record<string, string> = {};
  for (const [k, v] of Object.entries(body)) {
    if (k !== "signature" && v !== "" && v !== undefined && v !== null) {
      filtered[k] = v;
    }
  }

  const expected = generateSignature(filtered, PAYFAST_PASSPHRASE || undefined);
  return expected === received;
}

export async function validatePayFastITN(body: Record<string, string>, expectedAmountCents?: number): Promise<boolean> {
  if (!PAYFAST_PASSPHRASE && !SANDBOX) {
    console.error("[PayFast] PAYFAST_PASSPHRASE is required in production");
    return false;
  }

  if (!verifyPayFastSignature(body)) {
    console.error("[PayFast] Signature verification failed");
    return false;
  }

  if (body.merchant_id !== PAYFAST_MERCHANT_ID) {
    console.error("[PayFast] Merchant ID mismatch:", body.merchant_id, "expected:", PAYFAST_MERCHANT_ID);
    return false;
  }

  if (expectedAmountCents !== undefined) {
    const paidAmount = parseFloat(body.amount_gross || "0");
    const expectedAmount = expectedAmountCents / 100;
    if (Math.abs(paidAmount - expectedAmount) > 0.01) {
      console.error("[PayFast] Amount mismatch: paid", paidAmount, "expected", expectedAmount);
      return false;
    }
  }

  return true;
}
