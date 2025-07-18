import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { username } from "better-auth/plugins";
import { prisma } from "./prismaClient";
 

export const auth = betterAuth({
    emailAndPassword: {
        enabled: true,
        username: true, 
    },
    plugins: [
        username()
    ],
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    trustedOrigins: [process.env.FRONTEND_URL as string],
    secret: process.env.BETTER_AUTH_SECRET as string,
    baseURL: process.env.BETTER_AUTH_URL as string
});