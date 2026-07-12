import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";
import { headers } from "next/headers";

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
    },
});

export async function getSession(req?: Request) {
    if (req) {
        const session = await auth.api.getSession({ headers: req.headers });
        return session ? { user: session.user, session: session.session } : null;
    } else {
        const h = await headers();
        const session = await auth.api.getSession({ headers: h });
        return session ? { user: session.user, session: session.session } : null;
    }
}
