import { z } from "zod";
import { User } from "../../helpers/User";
import superjson from "superjson";

export const schema = z.object({
  email: z.string().email("Email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().min(1, "Name is required"),
});
   10	
   11	export type OutputType = {
   12	  user: User;
   13	};
   14	
   15	export const postRegister = async (
   16	  body: z.infer<typeof schema>,
   17	  init?: RequestInit
   18	): Promise<OutputType> => {
   19	  const validatedInput = schema.parse(body);
   20	  const result = await fetch(`/_api/auth/register_with_password`, {
   21	    method: "POST",
   22	    body: superjson.stringify(validatedInput),
   23	    ...init,
   24	    headers: {
   25	      "Content-Type": "application/json",
   26	      ...(init?.headers ?? {}),
   27	    },
   28	    credentials: "include", // Important for cookies to be sent and received
   29	  });
   30	
   31	  if (!result.ok) {
   32	    const errorData = superjson.parse<{ message: string }>(await result.text());
   33	    throw new Error(errorData.message || "Registration failed");
   34	  }
   35	
   36	  return superjson.parse<OutputType>(await result.text());
   37	};
   38	
