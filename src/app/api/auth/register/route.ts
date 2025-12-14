import { NextResponse } from "next/server";

// Force dynamic rendering - skip DB access during build
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { users, teams, teamMembers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { nanoid } from "nanoid";
import slugify from "slugify";

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email und Passwort sind erforderlich" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Passwort muss mindestens 8 Zeichen lang sein" },
        { status: 400 }
      );
    }

    // Check if email exists
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (existing) {
      return NextResponse.json(
        { error: "Diese E-Mail-Adresse ist bereits registriert" },
        { status: 400 }
      );
    }

    // Create user
    const userId = nanoid();
    const passwordHash = await hash(password, 12);

    await db.insert(users).values({
      id: userId,
      email: email.toLowerCase(),
      name: name || email.split("@")[0],
      passwordHash,
    });

    // Create team
    const teamId = nanoid();
    const teamName = name ? `${name}'s Team` : `Team ${email.split("@")[0]}`;
    const teamSlug = slugify(teamName, { lower: true, strict: true }) + "-" + nanoid(6);

    await db.insert(teams).values({
      id: teamId,
      name: teamName,
      slug: teamSlug,
      ownerId: userId,
      plan: "free",
      maxChats: 1,
      maxMessagesPerMonth: 100,
      maxStorageMb: 50,
    });

    // Add user as team owner
    await db.insert(teamMembers).values({
      id: nanoid(),
      teamId,
      userId,
      role: "owner",
    });

    return NextResponse.json({
      success: true,
      message: "Konto erfolgreich erstellt",
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Fehler bei der Registrierung" },
      { status: 500 }
    );
  }
}
