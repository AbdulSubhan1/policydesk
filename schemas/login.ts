import { z } from "zod";
import { email, requiredText } from "./fields";

export const loginSchema = z.object({
  email,
  password: requiredText(1, 200),
});

export type LoginInput = z.infer<typeof loginSchema>;
