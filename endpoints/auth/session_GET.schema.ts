import { z } from "zod";
import { User } from "../../helpers/User";
import { apiErrorMessage, parseApiPayload } from "../../helpers/apiResponse";

export const schema = z.object({});

export type OutputType =
  | {
      user: User;
    }
  | {
      error: string;
    };

export const getSession = async (
  body: z.infer<typeof schema> = {},
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/auth/session`, {
    method: "GET",
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
    return {
      error: apiErrorMessage(
        payload,
        result.status === 401 ? "Not authenticated" : "Session check failed."
      ),
    };
  }

  if (!payload || typeof payload !== "object" || !("user" in payload)) {
    return { error: "The session service returned an invalid response." };
  }

  return payload;
};
