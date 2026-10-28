import { z } from "zod";
import superjson from "superjson";
import { User } from "../../helpers/User";

// no schema, just a simple GET request
export const schema = z.object({});

export type OutputType =
  | {
   10	      user: User;
   11	    }
   12	  | {
   13	      error: string;
   14	    };
   15	
   16	export const getSession = async (
   17	  body: z.infer<typeof schema> = {},
   18	  init?: RequestInit
   19	): Promise<OutputType> => {
   20	  const result = await fetch(`/_api/auth/session`, {
   21	    method: "GET",
   22	    ...init,
   23	    headers: {
   24	      "Content-Type": "application/json",
   25	      ...(init?.headers ?? {}),
   26	    },
   27	  });
   28	  return superjson.parse<OutputType>(await result.text());
   29	};
   30	
