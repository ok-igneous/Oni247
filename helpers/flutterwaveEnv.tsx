import { platformSettings } from "./platformSettings";
import { decryptSecret } from "./mailCrypto";

export type StoredSubscriptionGateway = { provider: "flutterwave"; secretKeyEnc: string; webhookHashEnc: string; testMode: boolean; verifiedAt: string | null };
export const SUBSCRIPTION_GATEWAY_KEY = "subscriptionGateway";

/**
 * The Flutterwave keys that collect Oni247 subscription payments. They are saved by the Oni247 admin
 * (Admin → Settings → Subscription payments) and talk to Flutterwave directly, with no hosting-platform
 * payment service involved. Environment variables are used only if nothing has been saved. Backend only.
 */
export const flutterwaveEnv = async (): Promise<{ secretKey: string | undefined; webhookHash: string | undefined }> => {
  const stored = await platformSettings.get<StoredSubscriptionGateway>(SUBSCRIPTION_GATEWAY_KEY);
  if (stored?.secretKeyEnc) {
    try {
      return {
        secretKey: await decryptSecret(stored.secretKeyEnc),
        webhookHash: stored.webhookHashEnc ? await decryptSecret(stored.webhookHashEnc) : undefined,
      };
    } catch {
      return { secretKey: undefined, webhookHash: undefined };
    }
  }
  const env = process.env as unknown as Record<string, string | undefined>;
  return { secretKey: env.FLUTTERWAVE_SECRET_KEY, webhookHash: env.FLUTTERWAVE_WEBHOOK_HASH };
};

