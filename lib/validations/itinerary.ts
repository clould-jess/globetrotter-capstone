import { z } from "zod";

export const createItinerarySchema = z
  .object({
    title: z.string().min(1).max(200),
    destination: z.string().min(1).max(200),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    notes: z.string().max(2000).optional(),
  })
  .strict()
  .refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
    message: "startDate must be before or equal to endDate",
    path: ["startDate"],
  });

// .partial() makes every field optional for PATCH semantics, while .strict()
// still rejects any field not in the schema at all (e.g. ownerId).
export const updateItinerarySchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    destination: z.string().min(1).max(200).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();

export const shareItinerarySchema = z
  .object({
    email: z.string().email(),
    permission: z.enum(["VIEW", "EDIT"]).default("VIEW"),
  })
  .strict();

export type CreateItineraryInput = z.infer<typeof createItinerarySchema>;
export type UpdateItineraryInput = z.infer<typeof updateItinerarySchema>;
export type ShareItineraryInput = z.infer<typeof shareItinerarySchema>;
