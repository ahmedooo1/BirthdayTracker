import { users, groups, birthdays, userGroups, UserRole } from "@shared/schema";
import type { User, InsertUser, Group, InsertGroup, Birthday, InsertBirthday, UserGroup, InsertUserGroup } from "@shared/schema";
import session from "express-session";
import { db } from "./db";
import { eq, and, sql, ilike, desc, gte, lte } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import postgres from "postgres";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserRole(id: number, role: UserRole): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Group operations
  createGroup(group: InsertGroup): Promise<Group>;
  getGroup(id: number): Promise<Group | undefined>;
  getAllGroups(): Promise<Group[]>;
  getGroupsByUserId(userId: number): Promise<Group[]>;
  updateGroup(id: number, data: Partial<InsertGroup>): Promise<Group | undefined>;
  deleteGroup(id: number): Promise<boolean>;
  
  // UserGroup operations
  addUserToGroup(userGroup: InsertUserGroup): Promise<UserGroup>;
  getUserGroups(userId: number): Promise<UserGroup[]>;
  getGroupMembers(groupId: number): Promise<UserGroup[]>;
  removeUserFromGroup(userId: number, groupId: number): Promise<boolean>;
  isUserInGroup(userId: number, groupId: number): Promise<boolean>;
  isUserGroupLeader(userId: number, groupId: number): Promise<boolean>;
  
  // Birthday operations
  createBirthday(birthday: InsertBirthday): Promise<Birthday>;
  getBirthday(id: number): Promise<Birthday | undefined>;
  getBirthdaysByGroupId(groupId: number): Promise<Birthday[]>;
  updateBirthday(id: number, data: Partial<InsertBirthday>): Promise<Birthday | undefined>;
  deleteBirthday(id: number): Promise<boolean>;
  getUpcomingBirthdays(userId: number, daysAhead: number): Promise<Birthday[]>;
  searchBirthdays(query: string, userId: number): Promise<Birthday[]>;
  
  // Session store
  sessionStore: any; // Express session store
}

export class DatabaseStorage implements IStorage {
  sessionStore: any; // Express session store
  
  constructor() {
    // Connexion PostgreSQL pour la session store
    this.sessionStore = new PostgresSessionStore({ 
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      createTableIfMissing: true 
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserRole(id: number, role: UserRole): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ role: role })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Group operations
  async createGroup(group: InsertGroup): Promise<Group> {
    const [newGroup] = await db.insert(groups).values(group).returning();
    return newGroup;
  }

  async getGroup(id: number): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group;
  }

  async getAllGroups(): Promise<Group[]> {
    return await db.select().from(groups);
  }

  async getGroupsByUserId(userId: number): Promise<Group[]> {
    const result = await db
      .select({ group: groups })
      .from(userGroups)
      .innerJoin(groups, eq(userGroups.groupId, groups.id))
      .where(eq(userGroups.userId, userId));
    
    return result.map(r => r.group);
  }

  async updateGroup(id: number, data: Partial<InsertGroup>): Promise<Group | undefined> {
    const [updatedGroup] = await db
      .update(groups)
      .set(data)
      .where(eq(groups.id, id))
      .returning();
    return updatedGroup;
  }

  async deleteGroup(id: number): Promise<boolean> {
    const result = await db.delete(groups).where(eq(groups.id, id)).returning();
    return result.length > 0;
  }

  // UserGroup operations
  async addUserToGroup(userGroup: InsertUserGroup): Promise<UserGroup> {
    const [newUserGroup] = await db.insert(userGroups).values(userGroup).returning();
    return newUserGroup;
  }

  async getUserGroups(userId: number): Promise<UserGroup[]> {
    return await db.select().from(userGroups).where(eq(userGroups.userId, userId));
  }

  async getGroupMembers(groupId: number): Promise<UserGroup[]> {
    return await db.select().from(userGroups).where(eq(userGroups.groupId, groupId));
  }

  async removeUserFromGroup(userId: number, groupId: number): Promise<boolean> {
    const result = await db
      .delete(userGroups)
      .where(and(eq(userGroups.userId, userId), eq(userGroups.groupId, groupId)))
      .returning();
    return result.length > 0;
  }

  async isUserInGroup(userId: number, groupId: number): Promise<boolean> {
    const [userGroup] = await db
      .select()
      .from(userGroups)
      .where(and(eq(userGroups.userId, userId), eq(userGroups.groupId, groupId)));
    return !!userGroup;
  }

  async isUserGroupLeader(userId: number, groupId: number): Promise<boolean> {
    const [userGroup] = await db
      .select()
      .from(userGroups)
      .where(and(
        eq(userGroups.userId, userId), 
        eq(userGroups.groupId, groupId)
      ));
    return userGroup ? userGroup.isLeader : false;
  }

  // Birthday operations
  async createBirthday(birthday: InsertBirthday): Promise<Birthday> {
    const [newBirthday] = await db.insert(birthdays).values(birthday).returning();
    return newBirthday;
  }

  async getBirthday(id: number): Promise<Birthday | undefined> {
    const [birthday] = await db.select().from(birthdays).where(eq(birthdays.id, id));
    return birthday;
  }

  async getBirthdaysByGroupId(groupId: number): Promise<Birthday[]> {
    return await db.select().from(birthdays).where(eq(birthdays.groupId, groupId));
  }

  async updateBirthday(id: number, data: Partial<InsertBirthday>): Promise<Birthday | undefined> {
    const [updatedBirthday] = await db
      .update(birthdays)
      .set(data)
      .where(eq(birthdays.id, id))
      .returning();
    return updatedBirthday;
  }

  async deleteBirthday(id: number): Promise<boolean> {
    const result = await db.delete(birthdays).where(eq(birthdays.id, id)).returning();
    return result.length > 0;
  }

  async getUpcomingBirthdays(userId: number, daysAhead: number = 30): Promise<Birthday[]> {
    // Get user's groups
    const userGroupsResult = await db
      .select({ groupId: userGroups.groupId })
      .from(userGroups)
      .where(eq(userGroups.userId, userId));
    
    const groupIds = userGroupsResult.map(ug => ug.groupId);
    
    if (groupIds.length === 0) {
      return [];
    }
    
    // Get current date
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + daysAhead);
    
    // Get all birthdays from user's groups
    const birthdaysResult = await db
      .select()
      .from(birthdays)
      .where(sql`${birthdays.groupId} IN (${groupIds.join(',')})`);
    
    // Filter and sort upcoming birthdays (doing this in JS as it's complex date logic)
    return birthdaysResult
      .filter(birthday => {
        const birthDate = new Date(birthday.birthDate);
        
        // Create this year's birthday
        const thisYearBirthday = new Date(
          today.getFullYear(),
          birthDate.getMonth(),
          birthDate.getDate()
        );
        
        // If birthday passed this year, check next year
        if (thisYearBirthday < today) {
          thisYearBirthday.setFullYear(thisYearBirthday.getFullYear() + 1);
        }
        
        return thisYearBirthday >= today && thisYearBirthday <= futureDate;
      })
      .sort((a, b) => {
        const dateA = new Date(a.birthDate);
        const dateB = new Date(b.birthDate);
        
        // Create this year's birthday dates
        const thisYearA = new Date(
          today.getFullYear(),
          dateA.getMonth(),
          dateA.getDate()
        );
        const thisYearB = new Date(
          today.getFullYear(),
          dateB.getMonth(),
          dateB.getDate()
        );
        
        // Adjust for next year if needed
        if (thisYearA < today) thisYearA.setFullYear(thisYearA.getFullYear() + 1);
        if (thisYearB < today) thisYearB.setFullYear(thisYearB.getFullYear() + 1);
        
        // Sort by upcoming date
        return thisYearA.getTime() - thisYearB.getTime();
      });
  }

  async searchBirthdays(query: string, userId: number): Promise<Birthday[]> {
    // Get user's groups
    const userGroupsResult = await db
      .select({ groupId: userGroups.groupId })
      .from(userGroups)
      .where(eq(userGroups.userId, userId));
    
    const groupIds = userGroupsResult.map(ug => ug.groupId);
    
    if (groupIds.length === 0) {
      return [];
    }
    
    // If no query, return all birthdays from user's groups
    if (!query || query.trim() === '') {
      return await db
        .select()
        .from(birthdays)
        .where(sql`${birthdays.groupId} IN (${groupIds.join(',')})`)
        .orderBy(birthdays.name);
    }
    
    // Search by name
    return await db
      .select()
      .from(birthdays)
      .where(and(
        sql`${birthdays.groupId} IN (${groupIds.join(',')})`,
        ilike(birthdays.name, `%${query}%`)
      ))
      .orderBy(birthdays.name);
  }
}

export const storage = new DatabaseStorage();
