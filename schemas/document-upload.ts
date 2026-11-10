import { z } from "zod";
import { MAX_UPLOAD_BYTES, UPLOAD_MIME_TYPES } from "@/constants/config";
import { id } from "./fields";

/** Browser-side checks before upload. The server action repeats them on the real file. */
export const documentUploadSchema = z.object({
  leadId: id,
  documentTypeId: id,
  files: z
    .custom<FileList>(
      (v) => typeof FileList !== "undefined" && v instanceof FileList && v.length > 0,
      "errors.fileMissing",
    )
    .refine((files) => files[0].size <= MAX_UPLOAD_BYTES, "errors.fileTooLarge")
    .refine((files) => UPLOAD_MIME_TYPES.includes(files[0].type), "errors.fileType"),
});
