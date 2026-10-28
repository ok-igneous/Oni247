import { jwtVerify, SignJWT } from "jose";

const encoder = new TextEncoder();
const secret = process.env.JWT_SECRET;

export const SessionExpirationSeconds = 60 * 60 * 24 * 7; // 1 week
// Probability to run cleanup (10%)
export const CleanupProbability = 0.1;

   10	// Only send the ID in the cookie to the client
   11	// We should store id -> user id and user data mapping in our database for max security
   12	export interface Session {
   13	  // this should be a crypto random string
   14	  id: string;
   15	  createdAt: number;
   16	  lastAccessed: number;
   17	
   18	  // Whether the user needs to change their password
   19	  // Useful for password reset or setting up new user with initial password
   20	  passwordChangeRequired?: boolean;
   21	}
   22	
   23	const CookieName = "floot_built_app_session";
   24	
   25	export class NotAuthenticatedError extends Error {
   26	  constructor(message?: string) {
   27	    super(message ?? "Not authenticated");
   28	    this.name = "NotAuthenticatedError";
   29	  }
   30	}
   31	
   32	/**
   33	 * Returns the user session or throw an error. Make sure to handle the error (return a proper request)
   34	 */
   35	export async function getServerSessionOrThrow(
   36	  request: Request
   37	): Promise<Session> {
   38	  // Note: if session is valid, also consider making the cookie rolling by using setSession
   39	
   40	  const cookieHeader = request.headers.get("cookie") || "";
   41	  const cookies = cookieHeader
   42	    .split(";")
   43	    .reduce((cookies: Record<string, string>, cookie) => {
   44	      const [name, value] = cookie.trim().split("=");
   45	      if (name && value) {
   46	        cookies[name] = decodeURIComponent(value);
   47	      }
   48	      return cookies;
   49	    }, {});
   50	  const sessionCookie = cookies[CookieName];
   51	
   52	  if (!sessionCookie) {
   53	    throw new NotAuthenticatedError();
   54	  }
   55	  try {
   56	    const { payload } = await jwtVerify(sessionCookie, encoder.encode(secret));
   57	    return {
   58	      id: payload.id as string,
   59	      createdAt: payload.createdAt as number,
   60	      lastAccessed: payload.lastAccessed as number,
   61	      passwordChangeRequired: payload.passwordChangeRequired as boolean,
   62	    };
   63	  } catch (error) {
   64	    throw new NotAuthenticatedError();
   65	  }
   66	}
   67	
   68	export async function setServerSession(
   69	  response: Response,
   70	  session: Session
   71	): Promise<void> {
   72	  const token = await new SignJWT({
   73	    id: session.id,
   74	    createdAt: session.createdAt,
   75	    lastAccessed: session.lastAccessed,
   76	    passwordChangeRequired: session.passwordChangeRequired,
   77	  })
   78	    .setProtectedHeader({ alg: "HS256" })
   79	    .setIssuedAt()
   80	    .setExpirationTime("1d")
   81	    .sign(encoder.encode(secret));
   82	
   83	  const cookieValue = [
   84	    `${CookieName}=${token}`,
   85	    "HttpOnly",
   86	    "Secure",
   87	    "SameSite=Lax",
   88	    "Path=/",
   89	    `Max-Age=${SessionExpirationSeconds}`,
   90	  ].join("; ");
   91	
   92	  response.headers.set("Set-Cookie", cookieValue);
   93	}
   94	
   95	export function clearServerSession(response: Response) {
   96	  // Clear the session cookie by setting an expired date
   97	  const cookieValue = [
   98	    `${CookieName}=`,
   99	    "HttpOnly",
  100	    "Secure",
  101	    "SameSite=Lax",
  102	    "Path=/",
  103	    "Max-Age=0", // Expire immediately
  104	  ].join("; ");
  105	
  106	  response.headers.set("Set-Cookie", cookieValue);
  107	}
  108