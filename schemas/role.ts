import { z } from "zod";
import { optionalText, requiredText } from "./fields";

export const roleSchema = z.object({
  name: requiredText(2, 40),
  description: optionalText(200),
});

export type RoleInput = z.infer<typeof roleSchema>;
