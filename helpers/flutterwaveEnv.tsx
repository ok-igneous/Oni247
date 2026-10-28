/**
 * The Flutterwave secrets arrive as env vars once the credential is connected.
 * Reading them through this cast keeps the code compiling before that happens —
 * the values are still injected by the platform, never committed here.
 */
export const flutterwaveEnv = () => {
  const env = process.env as unknown as Record<string, string | undefined>;
  return {
    secretKey: env.FLUTTERWAVE_SECRET_KEY,
   10	    webhookHash: env.FLUTTERWAVE_WEBHOOK_HASH,
   11	  };
   12	};
