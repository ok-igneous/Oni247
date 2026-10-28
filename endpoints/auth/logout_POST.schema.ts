import { z } from "zod";
import superjson from "superjson";

// No input required for logout
export const schema = z.object({});

export type OutputType =
  | {
      success: boolean;
   10	      message: string;
   11	    }
   12	  | {
   13	      error: string;
   14	      message?: string;
   15	    };
   16	
   17	export const postLogout = async (
   18	  body: z.infer<typeof schema> = {},
   19	  init?: RequestInit
   20	): Promise<OutputType> => {
   21	  const result = await fetch(`/_api/auth/logout`, {
   22	    method: "POST",
   23	    body: superjson.stringify(body),
   24	    ...init,
   25	    headers: {
   26	      "Content-Type": "application/json",
   27	      ...(init?.headers ?? {}),
   28	    },
   29	  });
   30	  return superjson.parse<OutputType>(await result.text());
   31	};
   32	
