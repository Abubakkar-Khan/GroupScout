import { auth } from "@/lib/auth"; // path to your auth file
import { toNextJsHandler } from "better-auth/next-js";

const handlers = toNextJsHandler(auth.handler);

export const GET = handlers.GET;
export const POST = handlers.POST;
