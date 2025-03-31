import { User as SchemaUser } from "../shared/schema";

declare global {
  namespace Express {
    // Extend the user interface with properties from our schema
    interface User extends SchemaUser {}
  }
}