import { z } from "zod";
import { email, text } from "./common";

export const loginSchema = z.object({
  email,
  password: text(1, 200),
});

export type LoginInput = z.infer<typeof loginSchema>;
