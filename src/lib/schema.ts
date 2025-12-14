import {
  sqliteTable,
  text,
  integer,
  unique,
  primaryKey,
  index,
} from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";

// ============================================
// USERS
// ============================================
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "timestamp" }),
  name: text("name"),
  image: text("image"),
  passwordHash: text("password_hash"),
  isSuperAdmin: integer("is_super_admin", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const usersRelations = relations(users, ({ many }) => ({
  teamMembers: many(teamMembers),
  ownedTeams: many(teams),
}));

// ============================================
// TEAMS (Multi-Tenant Container)
// ============================================
export const teams = sqliteTable("teams", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),

  // Billing
  plan: text("plan").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status"),
  currentPeriodEnd: integer("current_period_end", { mode: "timestamp" }),

  // Limits
  maxChats: integer("max_chats").default(1),
  maxMessagesPerMonth: integer("max_messages_per_month").default(100),
  maxStorageMb: integer("max_storage_mb").default(50),

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const teamsRelations = relations(teams, ({ one, many }) => ({
  owner: one(users, {
    fields: [teams.ownerId],
    references: [users.id],
  }),
  members: many(teamMembers),
  chats: many(chats),
  invitations: many(teamInvitations),
}));

// ============================================
// TEAM MEMBERS
// ============================================
export const teamMembers = sqliteTable(
  "team_members",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"), // owner, admin, member
    invitedBy: text("invited_by").references(() => users.id),
    invitedAt: integer("invited_at", { mode: "timestamp" }),
    joinedAt: integer("joined_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [unique().on(table.teamId, table.userId)]
);

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
}));

// ============================================
// TEAM INVITATIONS
// ============================================
export const teamInvitations = sqliteTable("team_invitations", {
  id: text("id").primaryKey(),
  teamId: text("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull().default("member"),
  token: text("token").notNull().unique(),
  invitedBy: text("invited_by")
    .notNull()
    .references(() => users.id),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ============================================
// CHATS (RAG Chatbots)
// ============================================
export const chats = sqliteTable("chats", {
  id: text("id").primaryKey(),
  teamId: text("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  name: text("name").notNull().unique(), // URL slug, globally unique
  displayName: text("display_name").notNull(),
  description: text("description"),
  createdById: text("created_by_id").references(() => users.id),

  // Configuration
  uploadType: text("upload_type").default("documents"), // documents, website
  systemInstruction: text("system_instruction"),
  themeColor: text("theme_color").default("blue"),

  // Google AI
  fileSearchStoreName: text("file_search_store_name"),

  // Settings
  isPublic: integer("is_public", { mode: "boolean" }).default(true),
  allowAnonymous: integer("allow_anonymous", { mode: "boolean" }).default(true),
  starterQuestions: text("starter_questions"), // JSON array, max 4
  welcomeMessage: text("welcome_message"), // Bot intro message
  chatLogo: text("chat_logo").default("default"), // Lottie animation ID

  // Lead Generation
  leadCaptureEnabled: integer("lead_capture_enabled", { mode: "boolean" }).default(false),
  leadCaptureTrigger: text("lead_capture_trigger"), // "2" | "5" | "10" | "exit" | null
  calendarEnabled: integer("calendar_enabled", { mode: "boolean" }).default(false),
  calendarLink: text("calendar_link"), // External calendar booking link
  newsletterEnabled: integer("newsletter_enabled", { mode: "boolean" }).default(false),
  newsletterTrigger: text("newsletter_trigger"), // "2" | "5" | "10" | "exit" | null

  // Embed Settings
  widgetEnabled: integer("widget_enabled", { mode: "boolean" }).default(false),
  embedEnabled: integer("embed_enabled", { mode: "boolean" }).default(false),
  widgetBubbleText: text("widget_bubble_text"), // Speech bubble text for widget

  // Metadata
  files: text("files"), // JSON array
  sitemapUrls: text("sitemap_urls"), // JSON array

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const chatsRelations = relations(chats, ({ one, many }) => ({
  team: one(teams, {
    fields: [chats.teamId],
    references: [teams.id],
  }),
  createdBy: one(users, {
    fields: [chats.createdById],
    references: [users.id],
  }),
  sessions: many(chatSessions),
}));

// ============================================
// CHAT SESSIONS
// ============================================
export const chatSessions = sqliteTable("chat_sessions", {
  id: text("id").primaryKey(),
  chatId: text("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  visitorId: text("visitor_id"), // Anonymous visitor tracking
  userId: text("user_id").references(() => users.id), // If logged in

  totalMessages: integer("total_messages").default(0),
  totalUserMessages: integer("total_user_messages").default(0),
  totalBotMessages: integer("total_bot_messages").default(0),

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  lastActivityAt: integer("last_activity_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  chat: one(chats, {
    fields: [chatSessions.chatId],
    references: [chats.id],
  }),
  messages: many(chatMessages),
}));

// ============================================
// CHAT MESSAGES
// ============================================
export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => chatSessions.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // user, assistant
  content: text("content").notNull(),

  // Metadata
  responseTimeMs: integer("response_time_ms"),
  modelUsed: text("model_used"),
  sourcesUsed: text("sources_used"), // JSON array
  tokenCountInput: integer("token_count_input"),
  tokenCountOutput: integer("token_count_output"),

  // Error tracking
  hadError: integer("had_error", { mode: "boolean" }).default(false),
  errorMessage: text("error_message"),

  // Feedback
  feedback: integer("feedback"), // -1, 0, 1

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
}));

// ============================================
// USAGE RECORDS
// ============================================
export const usageRecords = sqliteTable(
  "usage_records",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    chatId: text("chat_id").references(() => chats.id),
    date: text("date").notNull(), // YYYY-MM-DD

    messageCount: integer("message_count").notNull().default(0),
    tokenCountInput: integer("token_count_input").notNull().default(0),
    tokenCountOutput: integer("token_count_output").notNull().default(0),
    estimatedCostUsd: integer("estimated_cost_usd"), // in cents

    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [unique().on(table.teamId, table.chatId, table.date)]
);

// ============================================
// INVOICES
// ============================================
export const invoices = sqliteTable("invoices", {
  id: text("id").primaryKey(),
  teamId: text("team_id")
    .notNull()
    .references(() => teams.id),
  stripeInvoiceId: text("stripe_invoice_id").unique(),

  subtotal: integer("subtotal").notNull(),
  tax: integer("tax").default(0),
  total: integer("total").notNull(),

  periodStart: integer("period_start", { mode: "timestamp" }).notNull(),
  periodEnd: integer("period_end", { mode: "timestamp" }).notNull(),

  status: text("status").notNull().default("draft"),
  paidAt: integer("paid_at", { mode: "timestamp" }),

  lineItems: text("line_items"), // JSON

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ============================================
// NEXTAUTH TABLES
// ============================================
export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [unique().on(table.provider, table.providerAccountId)]
);

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  sessionToken: text("session_token").notNull().unique(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp" }).notNull(),
});

export const verificationTokens = sqliteTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull().unique(),
    expires: integer("expires", { mode: "timestamp" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })]
);

// ============================================
// SCRAPED PAGES (Web Scraping)
// ============================================
export const scrapedPages = sqliteTable(
  "scraped_pages",
  {
    id: text("id").primaryKey(),
    chatId: text("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    title: text("title"),
    displayName: text("display_name"),
    fileSearchDocumentName: text("file_search_document_name"),
    ogImage: text("og_image"),
    lastScrapedAt: integer("last_scraped_at", { mode: "timestamp" }).notNull(),
    sitemapLastMod: integer("sitemap_last_mod", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [index("scraped_chat_url_idx").on(table.chatId, table.url)]
);

export const scrapedPagesRelations = relations(scrapedPages, ({ one }) => ({
  chat: one(chats, {
    fields: [scrapedPages.chatId],
    references: [chats.id],
  }),
}));

// ============================================
// SCRAPE HISTORY
// ============================================
export const scrapeHistory = sqliteTable("scrape_history", {
  id: text("id").primaryKey(),
  chatId: text("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  status: text("status").notNull(), // pending, running, completed, failed
  totalPages: integer("total_pages"),
  scrapedPagesCount: integer("scraped_pages_count"),
  errorPagesCount: integer("error_pages_count"),
  startedAt: integer("started_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  error: text("error"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const scrapeHistoryRelations = relations(scrapeHistory, ({ one }) => ({
  chat: one(chats, {
    fields: [scrapeHistory.chatId],
    references: [chats.id],
  }),
}));

// ============================================
// LEADS
// ============================================
export const leads = sqliteTable("leads", {
  id: text("id").primaryKey(),
  chatId: text("chat_id").references(() => chats.id, { onDelete: "cascade" }),
  teamId: text("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  sessionId: text("session_id"),

  // Contact info
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message"),

  // Metadata
  source: text("source").notNull(), // "contact_form", "newsletter"
  status: text("status").default("new"), // new, contacted, converted

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const leadsRelations = relations(leads, ({ one }) => ({
  chat: one(chats, {
    fields: [leads.chatId],
    references: [chats.id],
  }),
  team: one(teams, {
    fields: [leads.teamId],
    references: [teams.id],
  }),
}));

// ============================================
// NEWSLETTER SUBSCRIBERS
// ============================================
export const newsletterSubscribers = sqliteTable("newsletter_subscribers", {
  id: text("id").primaryKey(),
  teamId: text("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  chatId: text("chat_id").references(() => chats.id, { onDelete: "set null" }),
  email: text("email").notNull(),
  name: text("name"),
  subscribedAt: integer("subscribed_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const newsletterSubscribersRelations = relations(newsletterSubscribers, ({ one }) => ({
  team: one(teams, {
    fields: [newsletterSubscribers.teamId],
    references: [teams.id],
  }),
  chat: one(chats, {
    fields: [newsletterSubscribers.chatId],
    references: [chats.id],
  }),
}));
