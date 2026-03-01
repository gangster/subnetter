import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// ─────────────────────────────────────────────────────────────────────────────
// better-auth managed tables
// ─────────────────────────────────────────────────────────────────────────────

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" }).notNull(),
  image: text("image"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }),
  updatedAt: integer("updatedAt", { mode: "timestamp" }),
});

// ─────────────────────────────────────────────────────────────────────────────
// App tables
// ─────────────────────────────────────────────────────────────────────────────

export const configs = sqliteTable("configs", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
  name: text("name").notNull(),
  config: text("config").notNull(), // JSON stringified config object
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const configVersions = sqliteTable("configVersions", {
  id: text("id").primaryKey(),
  configId: text("configId")
    .notNull()
    .references(() => configs.id, { onDelete: "cascade" }),
  config: text("config").notNull(), // JSON stringified config object
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  message: text("message"),
});

export const shareLinks = sqliteTable("shareLinks", {
  id: text("id").primaryKey(),
  configId: text("configId")
    .notNull()
    .references(() => configs.id, { onDelete: "cascade" }),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
  includeAllocations: integer("includeAllocations", { mode: "boolean" })
    .notNull()
    .default(false),
  expiresAt: integer("expiresAt", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
});
