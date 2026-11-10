import { z } from "zod";
import { optionalText, requiredText } from "./fields";

export const documentTypeSchema = z.object({
  nameEn: requiredText(2, 60),
  nameAr: optionalText(60),
  descriptionEn: optionalText(200),
  descriptionAr: optionalText(200),
});

export type DocumentTypeInput = z.infer<typeof documentTypeSchema>;
