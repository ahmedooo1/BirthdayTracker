import { pgTable, text, serial, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User roles enum
export enum UserRole {
  ADMIN = "ADMIN",
  GROUP_LEADER = "GROUP_LEADER",
  MEMBER = "MEMBER"
}

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["ADMIN", "GROUP_LEADER", "MEMBER"] })
    .notNull()
    .default("MEMBER"),
});

export const usersRelations = relations(users, ({ many }) => ({
  userGroups: many(userGroups),
}));

// Groups table
export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groupsRelations = relations(groups, ({ many }) => ({
  birthdays: many(birthdays),
  userGroups: many(userGroups),
}));

// UserGroups (join table for users and groups)
export const userGroups = pgTable("user_groups", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  groupId: integer("group_id").notNull().references(() => groups.id),
  isLeader: boolean("is_leader").default(false).notNull(),
});

export const userGroupsRelations = relations(userGroups, ({ one }) => ({
  user: one(users, {
    fields: [userGroups.userId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [userGroups.groupId],
    references: [groups.id],
  }),
}));

// Birthdays table
export const birthdays = pgTable("birthdays", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  birthDate: timestamp("birth_date").notNull(),
  notes: text("notes"),
  groupId: integer("group_id").notNull().references(() => groups.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id),
});

export const birthdaysRelations = relations(birthdays, ({ one }) => ({
  group: one(groups, {
    fields: [birthdays.groupId],
    references: [groups.id],
  }),
  createdByUser: one(users, {
    fields: [birthdays.createdBy],
    references: [users.id],
  }),
}));

// Zod schemas for validation and types
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "GROUP_LEADER", "MEMBER"]),
}).omit({ id: true });

export const insertGroupSchema = createInsertSchema(groups).omit({ id: true, createdAt: true });

export const insertUserGroupSchema = createInsertSchema(userGroups).omit({ id: true });

export const insertBirthdaySchema = createInsertSchema(birthdays).omit({ id: true, createdAt: true });

// Login schema (separate from insert schema)
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Group = typeof groups.$inferSelect;

export type InsertUserGroup = z.infer<typeof insertUserGroupSchema>;
export type UserGroup = typeof userGroups.$inferSelect;

export type InsertBirthday = z.infer<typeof insertBirthdaySchema>;
export type Birthday = typeof birthdays.$inferSelect;

export type LoginData = z.infer<typeof loginSchema>;
