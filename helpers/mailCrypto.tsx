// Encrypts each shop's mail-provider API key before it is stored. New ciphertexts
// use HKDF-SHA-256 with domain separation and AES-256-GCM. Legacy SHA-256-derived
// ciphertexts remain readable so deployments can rotate gradually without data loss.
const toB64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");
const fromB64 = (text: string) => new Uint8Array(Buffer.from(text, "base64"));
const encoder = new TextEncoder();

export const mailKeyConfigured = (): boolean => (process.env.EMAIL_SETTINGS_KEY ?? "").length >= 32;

const getV2Key = async () => {
  const secret = process.env.EMAIL_SETTINGS_KEY ?? "";
  if (secret.length < 32) throw new Error("EMAIL_SETTINGS_KEY must contain at least 32 characters.");
  const material = await crypto.subtle.importKey("raw", encoder.encode(secret), "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: encoder.encode("oni247/email-settings/v2"),
      info: encoder.encode("AES-256-GCM"),
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

// Read-only compatibility for existing records encrypted before the HKDF upgrade.
const getLegacyKey = async () => {
  const secret = process.env.EMAIL_SETTINGS_KEY ?? "";
  if (secret.length < 16) throw new Error("Email settings storage is not set up yet.");
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["decrypt"]);
};

export const encryptSecret = async (plain: string): Promise<string> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await getV2Key(),
    encoder.encode(plain),
  );
  return `v2.${toB64(iv)}.${toB64(new Uint8Array(cipher))}`;
};

export const decryptSecret = async (stored: string): Promise<string> => {
  const parts = stored.split(".");
  const isV2 = parts.length === 3 && parts[0] === "v2";
  const ivText = isV2 ? parts[1] : parts[0];
  const dataText = isV2 ? parts[2] : parts[1];
  if (!ivText || !dataText || parts.length !== (isV2 ? 3 : 2)) {
    throw new Error("Saved email key is unreadable. Please enter it again.");
  }
  try {
    const key = isV2 ? await getV2Key() : await getLegacyKey();
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64(ivText) },
      key,
      fromB64(dataText),
    );
    return new TextDecoder().decode(plain);
  } catch {
    throw new Error("Saved email key is unreadable. Please enter it again.");
  }
};
