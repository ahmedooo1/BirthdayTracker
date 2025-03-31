import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertBirthdaySchema, insertGroupSchema, UserRole, User } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

// Helper function to handle authenticated routes with type-safe req.user
function withUser(req: Request): User {
  if (!req.user) {
    throw new Error("User not authenticated");
  }
  return req.user as User;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication and get middleware
  const { ensureAuthenticated, ensureAdmin, ensureGroupLeader } = setupAuth(app);

  // API routes with /api prefix
  
  // User routes
  app.get("/api/users", ensureAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get all users (admin only)
      const allUsers = await storage.getAllUsers();
      // Map over users to remove passwords
      const users = allUsers.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      res.json(users);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/users/:id/role", ensureAdmin, async (req, res, next) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      // Make sure role is a valid UserRole
      if (!Object.values(UserRole).includes(role as UserRole)) {
        return res.status(400).json({ message: "Rôle invalide" });
      }
      
      const updatedUser = await storage.updateUserRole(parseInt(id), role as UserRole);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }
      
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });

  // Group routes
  app.post("/api/groups", ensureAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = insertGroupSchema.parse(req.body);
      
      // Create the group
      const group = await storage.createGroup(validatedData);
      
      // Add the creator as a group leader
      await storage.addUserToGroup({
        userId: req.user!.id,
        groupId: group.id,
        isLeader: true
      });
      
      res.status(201).json(group);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  app.get("/api/groups", ensureAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get groups that the user belongs to
      const groups = await storage.getGroupsByUserId(req.user!.id);
      res.json(groups);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/groups/:id", ensureAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = withUser(req);
      const { id } = req.params;
      const groupId = parseInt(id);
      
      // Check if user has access to this group
      const isUserInGroup = await storage.isUserInGroup(user.id, groupId);
      
      if (!isUserInGroup && user.role !== 'ADMIN') {
        return res.status(403).json({ message: "Accès non autorisé à ce groupe" });
      }
      
      const group = await storage.getGroup(groupId);
      
      if (!group) {
        return res.status(404).json({ message: "Groupe non trouvé" });
      }
      
      res.json(group);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/groups/:id", ensureAuthenticated, async (req, res, next) => {
    try {
      const { id } = req.params;
      const groupId = parseInt(id);
      
      // Check if user is group leader or admin
      const isGroupLeader = await storage.isUserGroupLeader(req.user.id, groupId);
      
      if (!isGroupLeader && req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: "Vous n'avez pas les permissions nécessaires" });
      }
      
      const validatedData = insertGroupSchema.partial().parse(req.body);
      
      const updatedGroup = await storage.updateGroup(groupId, validatedData);
      
      if (!updatedGroup) {
        return res.status(404).json({ message: "Groupe non trouvé" });
      }
      
      res.json(updatedGroup);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  app.delete("/api/groups/:id", ensureAuthenticated, async (req, res, next) => {
    try {
      const { id } = req.params;
      const groupId = parseInt(id);
      
      // Check if user is group leader or admin
      const isGroupLeader = await storage.isUserGroupLeader(req.user.id, groupId);
      
      if (!isGroupLeader && req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: "Vous n'avez pas les permissions nécessaires" });
      }
      
      const deleted = await storage.deleteGroup(groupId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Groupe non trouvé" });
      }
      
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  // Group membership routes
  app.post("/api/groups/:id/members", ensureAuthenticated, async (req, res, next) => {
    try {
      const { id } = req.params;
      const groupId = parseInt(id);
      const { userId, isLeader } = req.body;
      
      // Check permissions: need to be group leader or admin
      const isUserGroupLeader = await storage.isUserGroupLeader(req.user.id, groupId);
      
      if (!isUserGroupLeader && req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: "Vous n'avez pas les permissions nécessaires" });
      }
      
      // Add user to group
      const userGroup = await storage.addUserToGroup({
        userId,
        groupId,
        isLeader: isLeader || false
      });
      
      res.status(201).json(userGroup);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/groups/:id/members", ensureAuthenticated, async (req, res, next) => {
    try {
      const { id } = req.params;
      const groupId = parseInt(id);
      
      // Check if user has access to this group
      const isUserInGroup = await storage.isUserInGroup(req.user.id, groupId);
      
      if (!isUserInGroup && req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: "Accès non autorisé à ce groupe" });
      }
      
      const members = await storage.getGroupMembers(groupId);
      res.json(members);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/groups/:groupId/members/:userId", ensureAuthenticated, async (req, res, next) => {
    try {
      const { groupId, userId } = req.params;
      const parsedGroupId = parseInt(groupId);
      const parsedUserId = parseInt(userId);
      
      // Check if requester is admin, group leader, or the user themselves
      const isGroupLeader = await storage.isUserGroupLeader(req.user.id, parsedGroupId);
      const isSelfRemoval = req.user.id === parsedUserId;
      
      if (!isGroupLeader && req.user.role !== 'ADMIN' && !isSelfRemoval) {
        return res.status(403).json({ message: "Vous n'avez pas les permissions nécessaires" });
      }
      
      const removed = await storage.removeUserFromGroup(parsedUserId, parsedGroupId);
      
      if (!removed) {
        return res.status(404).json({ message: "Utilisateur non trouvé dans ce groupe" });
      }
      
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  // Birthday routes
  app.post("/api/birthdays", ensureAuthenticated, async (req, res, next) => {
    try {
      const validatedData = insertBirthdaySchema.parse(req.body);
      
      // Check if user has access to this group
      const isUserInGroup = await storage.isUserInGroup(req.user.id, validatedData.groupId);
      
      if (!isUserInGroup && req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: "Vous n'avez pas accès à ce groupe" });
      }
      
      // Add the creator's ID
      validatedData.createdBy = req.user.id;
      
      const birthday = await storage.createBirthday(validatedData);
      res.status(201).json(birthday);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  app.get("/api/birthdays", ensureAuthenticated, async (req, res, next) => {
    try {
      const { search, groupId, upcoming } = req.query;
      
      if (groupId) {
        // Check if user has access to this group
        const isUserInGroup = await storage.isUserInGroup(req.user.id, parseInt(groupId as string));
        
        if (!isUserInGroup && req.user.role !== 'ADMIN') {
          return res.status(403).json({ message: "Vous n'avez pas accès à ce groupe" });
        }
        
        const birthdays = await storage.getBirthdaysByGroupId(parseInt(groupId as string));
        return res.json(birthdays);
      }
      
      if (upcoming) {
        const daysAhead = parseInt(upcoming as string) || 30;
        const upcomingBirthdays = await storage.getUpcomingBirthdays(req.user.id, daysAhead);
        return res.json(upcomingBirthdays);
      }
      
      if (search) {
        const searchResults = await storage.searchBirthdays(search as string, req.user.id);
        return res.json(searchResults);
      }
      
      // If no filters, return all birthdays user has access to
      const userGroups = await storage.getUserGroups(req.user.id);
      const birthdays = [];
      
      for (const userGroup of userGroups) {
        const groupBirthdays = await storage.getBirthdaysByGroupId(userGroup.groupId);
        birthdays.push(...groupBirthdays);
      }
      
      res.json(birthdays);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/birthdays/:id", ensureAuthenticated, async (req, res, next) => {
    try {
      const { id } = req.params;
      const birthdayId = parseInt(id);
      
      const birthday = await storage.getBirthday(birthdayId);
      
      if (!birthday) {
        return res.status(404).json({ message: "Anniversaire non trouvé" });
      }
      
      // Check if user has access to birthday's group
      const isUserInGroup = await storage.isUserInGroup(req.user.id, birthday.groupId);
      
      if (!isUserInGroup && req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: "Accès non autorisé" });
      }
      
      res.json(birthday);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/birthdays/:id", ensureAuthenticated, async (req, res, next) => {
    try {
      const { id } = req.params;
      const birthdayId = parseInt(id);
      
      const birthday = await storage.getBirthday(birthdayId);
      
      if (!birthday) {
        return res.status(404).json({ message: "Anniversaire non trouvé" });
      }
      
      // Check if user is in the group and is a group leader or admin
      const isUserInGroup = await storage.isUserInGroup(req.user.id, birthday.groupId);
      const isGroupLeader = await storage.isUserGroupLeader(req.user.id, birthday.groupId);
      
      if ((!isUserInGroup || !isGroupLeader) && req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: "Vous n'avez pas les permissions nécessaires" });
      }
      
      const validatedData = insertBirthdaySchema.partial().parse(req.body);
      
      const updatedBirthday = await storage.updateBirthday(birthdayId, validatedData);
      
      if (!updatedBirthday) {
        return res.status(404).json({ message: "Anniversaire non trouvé" });
      }
      
      res.json(updatedBirthday);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  app.delete("/api/birthdays/:id", ensureAuthenticated, async (req, res, next) => {
    try {
      const { id } = req.params;
      const birthdayId = parseInt(id);
      
      const birthday = await storage.getBirthday(birthdayId);
      
      if (!birthday) {
        return res.status(404).json({ message: "Anniversaire non trouvé" });
      }
      
      // Check if user is in the group and is a group leader or admin
      const isUserInGroup = await storage.isUserInGroup(req.user.id, birthday.groupId);
      const isGroupLeader = await storage.isUserGroupLeader(req.user.id, birthday.groupId);
      
      if ((!isUserInGroup || !isGroupLeader) && req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: "Vous n'avez pas les permissions nécessaires" });
      }
      
      const deleted = await storage.deleteBirthday(birthdayId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Anniversaire non trouvé" });
      }
      
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  // Stats endpoint
  app.get("/api/stats", ensureAuthenticated, async (req, res, next) => {
    try {
      // Get user's groups
      const groups = await storage.getGroupsByUserId(req.user.id);
      
      // Calculate total birthdays
      let totalBirthdays = 0;
      for (const group of groups) {
        const birthdays = await storage.getBirthdaysByGroupId(group.id);
        totalBirthdays += birthdays.length;
      }
      
      // Get upcoming birthdays
      const upcomingBirthdays = await storage.getUpcomingBirthdays(req.user.id, 30);
      
      res.json({
        totalBirthdays,
        totalGroups: groups.length,
        upcomingBirthdays: upcomingBirthdays.length
      });
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
