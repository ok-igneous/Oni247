// adapt this to your database schema
import { db } from "../../helpers/db";
import { sql } from "kysely";
import { schema } from "./login_with_password_POST.schema";
import { compare } from "bcryptjs";
import { randomBytes } from "crypto";
import {
  setServerSession,
  SessionExpirationSeconds,
   10	} from "../../helpers/getSetServerSession";
   11	import { User } from "../../helpers/User";
   12	import superjson from "superjson";
   13	
   14	// Configuration constants
   15	const RATE_LIMIT_CONFIG = {
   16	  maxFailedAttempts: 5,
   17	  lockoutWindowMinutes: 15,
   18	  lockoutDurationMinutes: 15,
   19	  cleanupProbability: 0.1,
   20	} as const;
   21	
   22	// Helper function to safely convert union type to Date
   23	function safeToDate(
   24	  value: string | number | bigint | null | undefined
   25	): Date | null {
   26	  if (value === null || value === undefined) {
   27	    return null;
   28	  }
   29	
   30	  if (typeof value === "bigint") {
   31	    // Convert bigint to number (assuming it's a timestamp in milliseconds)
   32	    return new Date(Number(value));
   33	  }
   34	
   35	  return new Date(value);
   36	}
   37	
   38	export async function handle(request: Request) {
   39	  try {
   40	    const json = superjson.parse(await request.text());
   41	    const { email, password } = schema.parse(json);
   42	
   43	    // Normalize email to lowercase for consistent handling
   44	    const normalizedEmail = email.toLowerCase();
   45	    const now = new Date();
   46	    const windowStart = new Date(
   47	      now.getTime() - RATE_LIMIT_CONFIG.lockoutWindowMinutes * 60 * 1000
   48	    );
   49	
   50	    // Start transaction for atomic rate limiting and session creation
   51	    const result = await db.transaction().execute(async (trx) => {
   52	      // Use PostgreSQL advisory lock to serialize access per email
   53	      // This prevents concurrent processing of the same email address
   54	      // The lock is automatically released when the transaction ends
   55	      await sql`SELECT pg_advisory_xact_lock(hashtextextended(${normalizedEmail},0))`.execute(
   56	        trx
   57	      );
   58	
   59	      // Get rate limiting info efficiently - use COUNT and MAX instead of SELECT *
   60	      const rateLimitQuery = await trx
   61	        .selectFrom("loginAttempts")
   62	        .select([
   63	          trx.fn.countAll<number>().as("failedCount"),
   64	          trx.fn.max(trx.dynamic.ref("attemptedAt")).as("lastFailedAt"),
   65	        ])
   66	        .where("email", "=", normalizedEmail)
   67	        .where("success", "=", false)
   68	        .where("attemptedAt", ">=", windowStart)
   69	        .where("attemptedAt", "is not", null) // Ensure null safety
   70	        .executeTakeFirst();
   71	
   72	      const { failedCount = 0, lastFailedAt = null } = rateLimitQuery || {};
   73	      const safeLastFailedAt = safeToDate(lastFailedAt);
   74	
   75	      // Check if user is locked out
   76	      if (
   77	        rateLimitQuery &&
   78	        failedCount >= RATE_LIMIT_CONFIG.maxFailedAttempts &&
   79	        safeLastFailedAt
   80	      ) {
   81	        const lockoutEnd = new Date(
   82	          safeLastFailedAt.getTime() +
   83	            RATE_LIMIT_CONFIG.lockoutDurationMinutes * 60 * 1000
   84	        );
   85	
   86	        if (now < lockoutEnd) {
   87	          const remainingMinutes = Math.ceil(
   88	            (lockoutEnd.getTime() - now.getTime()) / (60 * 1000)
   89	          );
   90	          // DO NOT log blocked attempts to prevent extending lockout indefinitely
   91	          return {
   92	            type: "rate_limited" as const,
   93	            remainingMinutes,
   94	          };
   95	        }
   96	      }
   97	
   98	      // Find user by email (normalized)
   99	      const userResults = await trx
  100	        .selectFrom("users")
  101	        .innerJoin("userPasswords", "users.id", "userPasswords.userId")
  102	        .select([
  103	          "users.id",
  104	          "users.email",
  105	          "users.displayName",
  106	          "users.avatarUrl",
  107	          "users.role",
  108	          "users.emailVerifiedAt",
  109	          "userPasswords.passwordHash",
  110	        ])
  111	        .where(sql`LOWER(users.email)`, "=", normalizedEmail)
  112	        .limit(1)
  113	        .execute();
  114	
  115	      if (userResults.length === 0) {
  116	        // Log failed attempt for non-existent user
  117	        await trx
  118	          .insertInto("loginAttempts")
  119	          .values({
  120	            email: normalizedEmail,
  121	            attemptedAt: now,
  122	            success: false,
  123	          })
  124	          .execute();
  125	
  126	        return {
  127	          type: "auth_failed" as const,
  128	        };
  129	      }
  130	
  131	      const user = userResults[0];
  132	
  133	      // Verify password
  134	      const passwordValid = await compare(password, user.passwordHash);
  135	      if (!passwordValid) {
  136	        // Log failed attempt for invalid password
  137	        await trx
  138	          .insertInto("loginAttempts")
  139	          .values({
  140	            email: normalizedEmail,
  141	            attemptedAt: now,
  142	            success: false,
  143	          })
  144	          .execute();
  145	
  146	        return {
  147	          type: "auth_failed" as const,
  148	        };
  149	      }
  150	
  151	      // Password is valid - log successful attempt
  152	      await trx
  153	        .insertInto("loginAttempts")
  154	        .values({
  155	          email: normalizedEmail,
  156	          attemptedAt: now,
  157	          success: true,
  158	        })
  159	        .execute();
  160	
  161	      // Create session inside the same transaction to ensure atomicity
  162	      const sessionId = randomBytes(32).toString("hex");
  163	      const expiresAt = new Date(
  164	        now.getTime() + SessionExpirationSeconds * 1000
  165	      );
  166	
  167	      await trx
  168	        .insertInto("sessions")
  169	        .values({
  170	          id: sessionId,
  171	          userId: user.id,
  172	          createdAt: now,
  173	          lastAccessed: now,
  174	          expiresAt: expiresAt,
  175	        })
  176	        .execute();
  177	
  178	      // Reset failed attempts counter by deleting previous failed attempts
  179	      // This preserves audit trail of successful logins
  180	      await trx
  181	        .deleteFrom("loginAttempts")
  182	        .where("email", "=", normalizedEmail)
  183	        .where("success", "=", false)
  184	        .execute();
  185	
  186	      return {
  187	        type: "success" as const,
  188	        user,
  189	        sessionId,
  190	        sessionCreatedAt: now,
  191	      };
  192	    });
  193	
  194	    // Clean up old login attempts periodically
  195	    // Run cleanup outside transaction to prevent extending transaction time and potential deadlocks
  196	    if (Math.random() < RATE_LIMIT_CONFIG.cleanupProbability) {
  197	      const cleanupBefore = new Date(
  198	        now.getTime() - RATE_LIMIT_CONFIG.lockoutWindowMinutes * 60 * 1000
  199	      );
  200	      try {
  201	        const deleteResult = await db
  202	          .deleteFrom("loginAttempts")
  203	          .where("attemptedAt", "<", cleanupBefore)
  204	          .where("attemptedAt", "is not", null)
  205	          .executeTakeFirst();
  206	      } catch {
  207	        // Don't fail the login if cleanup fails
  208	      }
  209	    }
  210	
  211	    // Handle different transaction results
  212	    if (result.type === "rate_limited") {
  213	      return new Response(
  214	        superjson.stringify({
  215	          message: `Too many failed login attempts. Account locked for ${result.remainingMinutes} more minutes.`,
  216	        }),
  217	        {
  218	          status: 429,
  219	          headers: {
  220	            "Content-Type": "application/json",
  221	          },
  222	        }
  223	      );
  224	    }
  225	
  226	    if (result.type === "auth_failed") {
  227	      return new Response(
  228	        superjson.stringify({ message: "Invalid email or password" }),
  229	        {
  230	          status: 401,
  231	          headers: {
  232	            "Content-Type": "application/json",
  233	          },
  234	        }
  235	      );
  236	    }
  237	
  238	    // Success case - session was already created in transaction
  239	    const user = result.user;
  240	
  241	    // Create response with user data (excluding sensitive information)
  242	    const userData: User = {
  243	      id: user.id,
  244	      email: user.email,
  245	      avatarUrl: user.avatarUrl,
  246	      emailVerifiedAt: user.emailVerifiedAt,
  247	      displayName: user.displayName,
  248	      role: user.role,
  249	    };
  250	
  251	    const response = new Response(
  252	      superjson.stringify({
  253	        user: userData,
  254	      }),
  255	      {
  256	        headers: {
  257	          "Content-Type": "application/json",
  258	        },
  259	      }
  260	    );
  261	
  262	    // Set session cookie
  263	    await setServerSession(response, {
  264	      id: result.sessionId,
  265	      createdAt: result.sessionCreatedAt.getTime(),
  266	      lastAccessed: result.sessionCreatedAt.getTime(),
  267	    });
  268	
  269	    return response;
  270	  } catch (error) {
  271	    return new Response(
  272	      superjson.stringify({ message: "Authentication failed" }),
  273	      {
  274	        status: 400,
  275	        headers: {
  276	          "Content-Type": "application/json",
  277	        },
  278	      }
  279	    );
  280	  }
  281	}
  282	
