import { PAGE_SIZE } from "@/constants/config";

export type Page = { page: number; limit: number; offset: number };

/** Reads ?page= into a limit/offset for a query. Invalid or missing pages become page 1. */
export function pageFrom(params: { page?: string }, pageSize = PAGE_SIZE): Page {
  const page = Math.max(1, Math.floor(Number(params.page)) || 1);
  return { page, limit: pageSize, offset: (page - 1) * pageSize };
}
