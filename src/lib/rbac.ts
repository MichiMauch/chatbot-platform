import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// ============================================
// TYPES
// ============================================
export type TeamRole = "owner" | "admin" | "member";

export interface RBACContext {
  userId: string;
  isSuperAdmin: boolean;
  teamId?: string;
  teamRole?: TeamRole;
}

// ============================================
// PERMISSION DEFINITIONS
// ============================================
export const TEAM_PERMISSIONS = {
  // Team Management
  "team:delete": ["owner"],
  "team:settings": ["owner", "admin"],
  "team:billing": ["owner"],

  // Member Management
  "members:invite": ["owner", "admin"],
  "members:remove": ["owner", "admin"],
  "members:change-role": ["owner"],

  // Chat Management
  "chats:create": ["owner", "admin"],
  "chats:edit": ["owner", "admin"],
  "chats:delete": ["owner", "admin"],
  "chats:view": ["owner", "admin", "member"],

  // Analytics
  "analytics:view": ["owner", "admin"],
} as const;

type Permission = keyof typeof TEAM_PERMISSIONS;

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Get RBAC context from current session
 */
export async function getRBACContext(): Promise<RBACContext | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return {
    userId: session.user.id,
    isSuperAdmin: session.user.isSuperAdmin ?? false,
    teamId: session.user.teamId,
    teamRole: session.user.teamRole as TeamRole | undefined,
  };
}

/**
 * Check if user is Super Admin
 */
export function isSuperAdmin(ctx: RBACContext): boolean {
  return ctx.isSuperAdmin === true;
}

/**
 * Check if user has a specific team permission
 */
export function hasTeamPermission(
  ctx: RBACContext,
  permission: Permission
): boolean {
  // Super Admin can do everything
  if (isSuperAdmin(ctx)) {
    return true;
  }

  // No team role = no permission
  if (!ctx.teamRole) {
    return false;
  }

  const allowedRoles = TEAM_PERMISSIONS[permission] as readonly TeamRole[];
  return allowedRoles.includes(ctx.teamRole);
}

/**
 * Check if user has at least the specified role
 */
export function hasMinRole(ctx: RBACContext, minRole: TeamRole): boolean {
  if (isSuperAdmin(ctx)) return true;
  if (!ctx.teamRole) return false;

  const roleHierarchy: TeamRole[] = ["member", "admin", "owner"];
  const userRoleIndex = roleHierarchy.indexOf(ctx.teamRole);
  const minRoleIndex = roleHierarchy.indexOf(minRole);

  return userRoleIndex >= minRoleIndex;
}

// ============================================
// API ROUTE HELPERS
// ============================================

/**
 * Require authentication - returns error response or context
 */
export async function requireAuth(): Promise<RBACContext | NextResponse> {
  const ctx = await getRBACContext();

  if (!ctx) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  return ctx;
}

/**
 * Require Super Admin - returns error response or context
 */
export async function requireSuperAdmin(): Promise<RBACContext | NextResponse> {
  const result = await requireAuth();

  if (result instanceof NextResponse) {
    return result;
  }

  if (!isSuperAdmin(result)) {
    return NextResponse.json(
      { error: "Super-Admin-Rechte erforderlich" },
      { status: 403 }
    );
  }

  return result;
}

/**
 * Require specific team permission
 */
export async function requirePermission(
  permission: Permission
): Promise<RBACContext | NextResponse> {
  const result = await requireAuth();

  if (result instanceof NextResponse) {
    return result;
  }

  if (!hasTeamPermission(result, permission)) {
    return NextResponse.json(
      { error: "Keine Berechtigung für diese Aktion" },
      { status: 403 }
    );
  }

  return result;
}

/**
 * Require minimum team role
 */
export async function requireRole(
  minRole: TeamRole
): Promise<RBACContext | NextResponse> {
  const result = await requireAuth();

  if (result instanceof NextResponse) {
    return result;
  }

  if (!hasMinRole(result, minRole)) {
    return NextResponse.json(
      { error: `Mindestens ${minRole}-Rechte erforderlich` },
      { status: 403 }
    );
  }

  return result;
}

/**
 * Verify user has access to a specific team
 */
export async function requireTeamAccess(
  targetTeamId: string
): Promise<RBACContext | NextResponse> {
  const result = await requireAuth();

  if (result instanceof NextResponse) {
    return result;
  }

  // Super Admin has access to all teams
  if (isSuperAdmin(result)) {
    return result;
  }

  // Check team membership
  if (result.teamId !== targetTeamId) {
    return NextResponse.json(
      { error: "Kein Zugriff auf dieses Team" },
      { status: 403 }
    );
  }

  return result;
}

// ============================================
// UTILITY HELPERS
// ============================================

/**
 * Helper to check if result is an error response
 */
export function isErrorResponse(
  result: RBACContext | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
