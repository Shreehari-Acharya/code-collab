import { User } from "better-auth";

interface UserWithUsername extends User {
    username?: string | null | undefined; 
}

declare global {
    namespace Express {
        interface Request {
            user: UserWithUsername; // Extend the Request interface to include user information
        }
    }
}