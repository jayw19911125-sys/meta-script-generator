import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // DEV BYPASS: Force inject mock user in dev environment without OAuth
  if (!user && process.env.NODE_ENV === "development") {
    user = {
      id: 1,
      openId: "mock-dev-user-id",
      name: "Dev User",
      email: "dev@localhost",
      loginMethod: "dev_bypass",
      lastSignedIn: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      role: "admin",
    } as User;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
