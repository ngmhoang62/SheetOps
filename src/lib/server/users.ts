import "server-only";
import { z } from "zod";
import { roles } from "@/lib/domain";
export const inviteSchema = z
  .object({
    full_name: z.string().trim().min(1).max(200),
    email: z.email(),
    role: z.enum(roles),
  })
  .strict();
