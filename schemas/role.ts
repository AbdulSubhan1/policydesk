import { z } from "zod";
import { optionalText, text } from "./common";

export const roleSchema = z.object({
  name: text(2, 40),
  description: optionalText(200),
});

export type RoleInput = z.infer<typeof roleSchema>;
