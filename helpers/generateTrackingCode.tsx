import { customAlphabet } from "nanoid";

/**
 * No I, O, 0 or 1 — these get read aloud over the phone and typed by hand.
 * 32^8 is ample, and the code is the only thing guarding an order page, so it
 * must not be guessable or sequential.
 */
const nanoid = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

   10	export const generateTrackingCode = (): string => nanoid();
