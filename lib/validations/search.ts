import { z } from "zod";

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(100),
  // Bounded page size prevents a single request from forcing an unbounded
  // table scan / response payload (a lightweight DoS vector).
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});
