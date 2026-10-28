import { z } from "zod";
import { User } from "../../helpers/User";
import superjson from "superjson";

export const schema = z.object({
  email: z.string().email("Email is required"),
  password: z.string().min(1, "Password is required"),
});

   10	export type OutputType = {
   11	  user: User;
   12	};
   13	
   14	export const postLogin = async (
   15	  body: z.infer<typeof schema>,
   16	  init?: RequestInit
   17	): Promise<OutputType> => {
   18	  const validatedInput = schema.parse(body);
   19	  const result = await fetch(`/_api/auth/login_with_password`, {
   20	    method: "POST",
   21	    body: superjson.stringify(validatedInput),
   22	    ...init,
   23	    headers: {
   24	      "Content-Type": "application/json",
   25	      ...(init?.headers ?? {}),
   26	    },
   27	    credentials: "include", // Important for cookies to be sent and received
   28	  });
   29	
   30	  if (!result.ok) {
   31	    const errorData = superjson.parse<{ message: string }>(await result.text());
   32	    throw new Error(errorData.message || "Login failed");
   33	  }
   34	
   35	  return superjson.parse<OutputType>(await result.text());
   36	};
   37	
