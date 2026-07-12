import { auth } from "@/lib/auth"; // path to your auth file
import { toNextJsHandler } from "better-auth/next-js";

const handlers = toNextJsHandler(auth.handler || auth);
export const { GET, POST } = handlers as any;
