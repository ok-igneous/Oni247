// adapt this to the database schema and helpers if necessary
import { db } from "../../helpers/db";
import { schema } from "./register_with_password_POST.schema";
import { randomBytes } from "crypto";
import {
  setServerSession,
  SessionExpirationSeconds,
} from "../../helpers/getSetServerSession";
import { generatePasswordHash } from "../../helpers/generatePasswordHash";
   10	import superjson from "superjson";
   11	import sendAuthEmail from "../../helpers/sendAuthEmail";
   12	import { createHash } from "crypto";
   13	
   14	export async function handle(request: Request) {
   15	  try {
   16	    const json = superjson.parse(await request.text());
   17	    const { email, password, displayName } = schema.parse(json);
   18	
   19	    // Check if email already exists
   20	    const existingUser = await db
   21	      .selectFrom("users")
   22	      .select("id")
   23	      .where("email", "=", email)
   24	      .limit(1)
   25	      .execute();
   26	
   27	    if (existingUser.length > 0) {
   28	      return new Response(
   29	        superjson.stringify({ message: "email already in use" }),
   30	        {
   31	          status: 409,
   32	          headers: {
   33	            "Content-Type": "application/json",
   34	          },
   35	        }
   36	      );
   37	    }
   38	
   39	    const passwordHash = await generatePasswordHash(password);
   40	
   41	    // Create new user
   42	    const newUser = await db.transaction().execute(async (trx) => {
   43	      // Insert the user
   44	      const [user] = await trx
   45	        .insertInto("users")
   46	        .values({
   47	          email: email.toLowerCase(),
   48	          displayName,
   49	          role: "user", // Default role
   50	        })
   51	        .returning(["id", "email", "displayName", "createdAt"])
   52	        .execute();
   53	
   54	      // Store the password hash in another table
   55	      await trx
   56	        .insertInto("userPasswords")
   57	        .values({
   58	          userId: user.id,
   59	          passwordHash,
   60	        })
   61	        .execute();
   62	
   63	      return user;
   64	    });
   65	
   66	    const rawVerificationToken = randomBytes(32).toString("base64url");
   67	    await db.insertInto("authTokens").values({
   68	      id: randomBytes(16).toString("hex"),
   69	      userId: newUser.id,
   70	      tokenType: "email_verification",
   71	      tokenHash: createHash("sha256").update(rawVerificationToken).digest("hex"),
   72	      expiresAt: new Date(Date.now() + 86400000),
   73	    }).execute();
   74	    try {
   75	      await sendAuthEmail({
   76	        to: newUser.email,
   77	        subject: "Verify your Oniduka email",
   78	        title: "Verify your email",
   79	        body: "Hi " + displayName + ", confirm your email address to finish setting up your Oniduka account.",
   80	        actionLabel: "Verify email",
   81	        actionUrl: "https://oni247.floot.app/verify-email?token=" + encodeURIComponent(rawVerificationToken),
   82	      });
   83	    } catch (emailError) {
   84	      console.error("Initial verification email failed:", emailError);
   85	    }
   86	
   87	    // Create a new session
   88	    const sessionId = randomBytes(32).toString("hex");
   89	    const now = new Date();
   90	    const expiresAt = new Date(now.getTime() + SessionExpirationSeconds * 1000);
   91	
   92	    await db
   93	      .insertInto("sessions")
   94	      .values({
   95	        id: sessionId,
   96	        userId: newUser.id,
   97	        createdAt: now,
   98	        lastAccessed: now,
   99	        expiresAt,
  100	      })
  101	      .execute();
  102	
  103	    // Create response with user data
  104	    const response = new Response(
  105	      superjson.stringify({
  106	        user: {
  107	          ...newUser,
  108	          emailVerifiedAt: null,
  109	          role: "user" as const,
  110	        },
  111	      }),
  112	      {
  113	        headers: {
  114	          "Content-Type": "application/json",
  115	        },
  116	      }
  117	    );
  118	
  119	    // Set session cookie
  120	    await setServerSession(response, {
  121	      id: sessionId,
  122	      createdAt: now.getTime(),
  123	      lastAccessed: now.getTime(),
  124	    });
  125	
  126	    return response;
  127	  } catch (error: unknown) {
  128	    console.error("Registration error:", error);
  129	    const errorMessage =
  130	      error instanceof Error ? error.message : "Registration failed";
  131	    return new Response(
  132	      superjson.stringify({ message: errorMessage }),
  133	      {
  134	        status: 400,
  135	        headers: {
  136	          "Content-Type": "application/json",
  137	        },
  138	      }
  139	    );
  140	  }
  141	}
  142	
