// Encrypts each shop's mail-provider API key before it is stored. The key is
// derived from the EMAIL_SETTINGS_KEY secret; API keys are never returned to
// the browser.
const toB64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");
const fromB64 = (text: string) => new Uint8Array(Buffer.from(text, "base64"));

export const mailKeyConfigured = (): boolean => (process.env.EMAIL_SETTINGS_KEY ?? "").length >= 16;

const getKey = async () => {
  const secret = process.env.EMAIL_SETTINGS_KEY ?? "";
  if (secret.length < 16) throw new Error("Email settings storage is not set up yet.");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
};

export const encryptSecret = async (plain: string): Promise<string> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await getKey(), new TextEncoder().encode(plain));
  return `${toB64(iv)}.${toB64(new Uint8Array(cipher))}`;
};

export const decryptSecret = async (stored: string): Promise<string> => {
  const [iv, data] = stored.split(".");
  if (!iv || !data) throw new Error("Saved email key is unreadable. Please enter it again.");
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(iv) }, await getKey(), fromB64(data));
    return new TextDecoder().decode(plain);
  } catch {
    throw new Error("Saved email key is unreadable. Please enter it again.");
  }
};
