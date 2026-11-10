import { z } from "zod";
import { SOURCES_OF_FUNDS } from "@/constants/statuses";
import { date, id, option, requiredText } from "./fields";

export const kycSchema = z.object({
  leadId: id,
  idNumber: requiredText(4, 40),
  nationality: requiredText(2, 60),
  dateOfBirth: date,
  idExpiry: date,
  occupation: requiredText(2, 60),
  sourceOfFunds: option(SOURCES_OF_FUNDS),
});

export type KycInput = z.infer<typeof kycSchema>;
