import { z } from "zod";
import { SOURCES_OF_FUNDS } from "@/constants/statuses";
import { date, id, option, text } from "./common";

export const kycSchema = z.object({
  leadId: id,
  idNumber: text(4, 40),
  nationality: text(2, 60),
  dateOfBirth: date,
  idExpiry: date,
  occupation: text(2, 60),
  sourceOfFunds: option(SOURCES_OF_FUNDS),
});

export type KycInput = z.infer<typeof kycSchema>;
