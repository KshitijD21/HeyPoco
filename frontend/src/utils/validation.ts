import { z } from "zod";
import { EntryType } from "@/types";

export const extractedFieldsSchema = z.object({
    amount: z.number().nullable().optional(),
    currency: z.string().nullable().optional(),
    merchant: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    company: z.string().nullable().optional(),
    role: z.string().nullable().optional(),
    url: z.string().url("Invalid URL").nullable().optional(),
    filename: z.string().nullable().optional(),
    due_date: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
});

export const createEntrySchema = z.object({
    type: z.nativeEnum(EntryType),
    raw_text: z.string().min(1, "Entry text is required").max(5000),
    extracted_fields: extractedFieldsSchema,
    tags: z.array(z.string().min(1).max(50)).max(20),
    attachments: z.array(z.string().url()).optional().default([]),
});

export const querySchema = z.object({
    question: z.string().min(1, "Question is required").max(1000),
});

export type CreateEntryFormData = z.infer<typeof createEntrySchema>;
export type QueryFormData = z.infer<typeof querySchema>;
