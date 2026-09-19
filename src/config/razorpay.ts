import Razorpay from "razorpay";

// Deliberately NOT read into a top-level const. Under tsx/esbuild's CJS
// output, `import` statements can get hoisted above other top-level code
// (including an explicit `dotenv.config()` call placed "first" in index.ts),
// so process.env may not be populated yet at module-evaluation time. Reading
// these lazily — inside functions, at request time — sidesteps that entirely
// and matches the pattern already used in config/db.ts.
const getKeyId = (): string => process.env.RAZORPAY_KEY_ID || "";
const getKeySecret = (): string => process.env.RAZORPAY_KEY_SECRET || "";

let client: Razorpay | undefined;
let warned = false;

function getClient(): Razorpay {
  const keyId = getKeyId();
  const keySecret = getKeySecret();
  if (!keyId || !keySecret) {
    if (!warned) {
      console.warn(
        "[razorpay] RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set — payment endpoints will fail until Backend/.env is filled in."
      );
      warned = true;
    }
    throw new Error(
      "Razorpay is not configured: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Backend/.env"
    );
  }
  if (!client) {
    client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return client;
}

// Proxied so the SDK isn't constructed (and doesn't throw) until a payment
// endpoint actually uses it — importing this module must never crash the app
// just because Razorpay hasn't been configured yet.
export const razorpay = new Proxy({} as Razorpay, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
});

export const getRazorpayKeyId = getKeyId;
export const getRazorpayWebhookSecret = (): string => process.env.RAZORPAY_WEBHOOK_SECRET || "";
