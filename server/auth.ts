import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { InsertUser, UserRole, loginSchema } from "@shared/schema";
import type { User } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

// Use the User type from schema directly
declare global {
  namespace Express {
    interface User extends User {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "rappelanniv-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: process.env.NODE_ENV === "production",
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new LocalStrategy(
    async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Nom d'utilisateur ou mot de passe incorrect" });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Registration endpoint
  app.post("/api/register", async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const validated = loginSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(validated.username);
      if (existingUser) {
        return res.status(400).json({ message: "Ce nom d'utilisateur est déjà utilisé" });
      }

      // Create user with hashed password
      const userData: InsertUser = {
        username: validated.username,
        email: `${validated.username}@example.com`, // Temporary email 
        password: await hashPassword(validated.password),
        role: UserRole.MEMBER, // Default role
      };

      const user = await storage.createUser(userData);
      
      // Auto-login after registration
      req.login(user, (err: any) => {
        if (err) return next(err);
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  // Login endpoint
  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('local', (err: any, user: User, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Authentification échouée" });
      
      req.login(user, (err: any) => {
        if (err) return next(err);
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", (req: Request, res: Response, next: NextFunction) => {
    req.logout((err: any) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Get current user endpoint
  app.get("/api/user", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    // Return user without password
    const { password, ...userWithoutPassword } = req.user as User;
    res.json(userWithoutPassword);
  });

  // Middleware for checking authentication
  const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Non authentifié" });
  };

  // Middleware for checking admin role
  const ensureAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated() && req.user && req.user.role === UserRole.ADMIN) {
      return next();
    }
    res.status(403).json({ message: "Accès non autorisé" });
  };

  // Middleware for checking group leader role
  const ensureGroupLeader = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated() && req.user && 
        (req.user.role === UserRole.ADMIN || req.user.role === UserRole.GROUP_LEADER)) {
      return next();
    }
    res.status(403).json({ message: "Accès non autorisé" });
  };

  // Return middleware for route protection
  return { ensureAuthenticated, ensureAdmin, ensureGroupLeader };
}
