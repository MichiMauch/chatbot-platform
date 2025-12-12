import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { teams, teamMembers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireAuth, isErrorResponse } from "@/lib/rbac";
import { PLANS, PlanId } from "@/lib/stripe";

// POST /api/teams/plan - Plan wechseln
export async function POST(request: NextRequest) {
  try {
    const result = await requireAuth();
    if (isErrorResponse(result)) return result;

    const { userId } = result;
    const { planId } = await request.json();

    // Validate plan ID
    if (!planId || !PLANS[planId as PlanId]) {
      return NextResponse.json(
        { error: "Ungültiger Plan" },
        { status: 400 }
      );
    }

    // Get user's team membership
    const membership = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.userId, userId),
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Kein Team gefunden" },
        { status: 404 }
      );
    }

    // Check if user is owner
    if (membership.role !== "owner") {
      return NextResponse.json(
        { error: "Nur der Team-Owner kann den Plan ändern" },
        { status: 403 }
      );
    }

    // Get the plan details
    const plan = PLANS[planId as PlanId];

    // Update team with new plan and limits
    await db
      .update(teams)
      .set({
        plan: planId,
        maxChats: plan.limits.maxChats,
        maxMessagesPerMonth: plan.limits.maxMessagesPerMonth,
        maxStorageMb: plan.limits.maxStorageMb,
      })
      .where(eq(teams.id, membership.teamId));

    console.log("[POST /api/teams/plan] Plan changed:", {
      teamId: membership.teamId,
      newPlan: planId,
    });

    return NextResponse.json({
      success: true,
      plan: planId,
    });
  } catch (error) {
    console.error("[POST /api/teams/plan] Error:", error);
    return NextResponse.json(
      { error: "Fehler beim Ändern des Plans" },
      { status: 500 }
    );
  }
}
