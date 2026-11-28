// adapt this to the database schema and helpers if necessary
import { db } from "../../helpers/db";
import { sql } from "kysely";
import { schema } from "./register_with_password_POST.schema";
import { randomBytes } from "crypto";
import {
  setServerSession,
  SessionExpirationSeconds,
} from "../../helpers/getSetServerSession";
import { generatePasswordHash } from "../../helpers/generatePasswordHash";
import superjson from "superjson";
import sendAuthEmail from "../../helpers/sendAuthEmail";
import { createHash } from "crypto";

export async function handle(request: Request) {
  try {
    const json = superjson.parse(await request.text());
    const { email, password, displayName } = schema.parse(json);

    const normalizedEmail = email.trim().toLowerCase();

    const passwordHash = await generatePasswordHash(password);

    // Create new user
    const newUser = await db.transaction().execute(async (trx) => {
      // Serialize registrations for the same normalized email. The unique check
      // and insert now share one transaction, preventing concurrent duplicates.
      await sql`SELECT pg_advisory_xact_lock(hashtextextended(${normalizedEmail}, 0))`.execute(trx);
      const existingUser = await trx
        .selectFrom("users")
        .select("id")
        .where(sql`LOWER(users.email)`, "=", normalizedEmail)
        .limit(1)
        .executeTakeFirst();
      if (existingUser) return null;
      // Insert the user
      const [user] = await trx
        .insertInto("users")
        .values({
          email: normalizedEmail,
          displayName,
          role: "user", // Default role
        })
        .returning(["id", "email", "displayName", "createdAt"])
        .execute();

      // Store the password hash in another table
      await trx
        .insertInto("userPasswords")
        .values({
          userId: user.id,
          passwordHash,
        })
        .execute();

      return user;
    });

    if (!newUser) {
      return new Response(superjson.stringify({ message: "email already in use" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    const publicAppUrl = process.env.PUBLIC_APP_URL || new URL(request.url).origin;
    const rawVerificationToken = randomBytes(32).toString("base64url");
    await db.insertInto("authTokens").values({
      id: randomBytes(16).toString("hex"),
      userId: newUser.id,
      tokenType: "email_verification",
      tokenHash: createHash("sha256").update(rawVerificationToken).digest("hex"),
      expiresAt: new Date(Date.now() + 86400000),
    }).execute();
    try {
      await sendAuthEmail({
        to: newUser.email,
        subject: "Verify your Oni247 email",
        title: "Verify your email",
        body: "Hi " + displayName + ", confirm your email address to finish setting up your Oni247 account.",
        actionLabel: "Verify email",
        actionUrl: publicAppUrl + "/verify-email?token=" + encodeURIComponent(rawVerificationToken),
      });
    } catch (emailError) {
      console.error("Initial verification email failed:", emailError);
    }

    // Create a new session
    const sessionId = randomBytes(32).toString("hex");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SessionExpirationSeconds * 1000);

    await db
      .insertInto("sessions")
      .values({
        id: sessionId,
        userId: newUser.id,
        createdAt: now,
        lastAccessed: now,
        expiresAt,
      })
      .execute();

    // Create response with user data
    const response = new Response(
      superjson.stringify({
        user: {
          ...newUser,
          emailVerifiedAt: null,
          role: "user" as const,
        },
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    // Set session cookie
    await setServerSession(response, {
      id: sessionId,
      createdAt: now.getTime(),
      lastAccessed: now.getTime(),
    });

    return response;
  } catch (error: unknown) {
    console.error("Registration error:", error);
    return new Response(
      superjson.stringify({ message: "Registration failed. Please check your details and try again." }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

