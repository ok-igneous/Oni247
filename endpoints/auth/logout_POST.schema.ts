import { z } from "zod";
import superjson from "superjson";
import { apiErrorMessage, parseApiPayload } from "../../helpers/apiResponse";

// No input required for logout
export const schema = z.object({});

export type OutputType =
  | {
      success: boolean;
      message: string;
    }
  | {
      error: string;
      message?: string;
    };

export const postLogout = async (
  body: z.infer<typeof schema> = {},
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/auth/logout`, {
    method: "POST",
    body: superjson.stringify(body),
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
  });

  const responseText = await result.text();
  const payload = parseApiPayload<OutputType>(responseText);

  if (!result.ok) {
    throw new Error(apiErrorMessage(payload, "Logout failed. Please try again."));
  }

  if (!payload) {
    throw new Error("The logout service returned an invalid response.");
  }

  return payload;
};
