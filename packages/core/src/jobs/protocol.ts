import { z } from 'zod';

/** Protocollo condiviso tra web app (API /api/ext/*) ed estensione per la coda job. */

export const JOB_TYPES = ['deep_view', 'reverse_asin', 'enrich_asins', 'track_keyword', 'track_asins', 'category_scan', 'ai_reserved'] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const JOB_STATUSES = ['pending', 'running', 'done', 'failed', 'cancelled'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const SearchAliasSchema = z.enum(['stripbooks', 'digital-text', 'aps']);
export const AsinSchema = z.string().regex(/^[A-Z0-9]{10}$/, 'ASIN non valido');
const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();

export const ProductFormatSchema = z.enum(['paperback', 'hardcover', 'kindle', 'audiobook', 'other']);

export const SearchResultItemSchema = z.object({
  asin: AsinSchema,
  position: z.number().int().positive(),
  organicPosition: z.number().int().positive().nullable(),
  isSponsored: z.boolean(),
  title: z.string().nullable(),
  author: z.string().nullable(),
  pubDate: IsoDate,
  format: ProductFormatSchema.nullable(),
  priceCents: z.number().int().nullable(),
  rating: z.number().nullable(),
  reviewsCount: z.number().int().nullable(),
  imageUrl: z.string().nullable(),
  url: z.string().nullable(),
});

export const CategoryRankSchema = z.object({ id: z.string().nullable(), name: z.string(), rank: z.number().int() });

export const ProductSchema = z.object({
  asin: AsinSchema,
  title: z.string().nullable(),
  subtitle: z.string().nullable(),
  authors: z.array(z.string()),
  imageUrl: z.string().nullable(),
  format: ProductFormatSchema.nullable(),
  publisher: z.string().nullable(),
  isIndependent: z.boolean().nullable(),
  pubDate: IsoDate,
  language: z.string().nullable(),
  pageCount: z.number().int().nullable(),
  isbn13: z.string().nullable(),
  dimensions: z.string().nullable(),
  hasAplus: z.boolean(),
  categories: z.array(z.object({ id: z.string().nullable(), name: z.string() })),
});

export const ProductSnapshotInputSchema = z.object({
  asin: AsinSchema,
  bsr: z.number().int().nullable(),
  bsrStore: z.enum(['books', 'kindle']).nullable(),
  categoryRanks: z.array(CategoryRankSchema),
  priceCents: z.number().int().nullable(),
  rating: z.number().nullable(),
  reviewsCount: z.number().int().nullable(),
  formats: z.array(
    z.object({ format: ProductFormatSchema, label: z.string(), priceCents: z.number().int().nullable(), selected: z.boolean() }),
  ),
});

export const SerpPayloadSchema = z.object({
  keyword: z.string().min(1),
  alias: SearchAliasSchema,
  page: z.number().int().positive(),
  capturedAt: z.string(),
  totalResultsText: z.string().nullable(),
  totalResultsEst: z.number().int().nullable(),
  items: z.array(SearchResultItemSchema),
});
export type SerpPayload = z.infer<typeof SerpPayloadSchema>;

export const ProductPayloadSchema = z.object({
  product: ProductSchema,
  snapshot: ProductSnapshotInputSchema,
  capturedAt: z.string(),
});
export type ProductPayload = z.infer<typeof ProductPayloadSchema>;

// ---- Parametri per tipo di job ----
export const DeepViewParamsSchema = z.object({
  keyword: z.string().min(1),
  alias: SearchAliasSchema.default('stripbooks'),
  pages: z.number().int().min(1).max(5).default(2),
  enrich: z.boolean().default(true),
  maxAsins: z.number().int().min(1).max(200).default(100),
  deepViewId: z.string().uuid().optional(),
});
export const ReverseAsinParamsSchema = z.object({
  asin: AsinSchema,
  candidates: z.array(z.string().min(1)).min(1).max(60),
  alias: SearchAliasSchema.default('stripbooks'),
  pages: z.number().int().min(1).max(5).default(3),
  runId: z.string().uuid().optional(),
});
export const EnrichAsinsParamsSchema = z.object({
  asins: z.array(AsinSchema).min(1).max(200),
  source: z.enum(['deep_view', 'tracker', 'manual']).default('manual'),
});
export const TrackKeywordParamsSchema = z.object({
  trackedKeywordId: z.string().uuid(),
  keyword: z.string().min(1),
  alias: SearchAliasSchema.default('stripbooks'),
  pages: z.number().int().min(1).max(5).default(3),
  watchAsins: z.array(AsinSchema),
});
export const TrackAsinsParamsSchema = z.object({
  trackedAsinIds: z.array(z.string().uuid()),
  asins: z.array(AsinSchema).min(1).max(50),
});

export const JobParamsSchemas = {
  deep_view: DeepViewParamsSchema,
  reverse_asin: ReverseAsinParamsSchema,
  enrich_asins: EnrichAsinsParamsSchema,
  track_keyword: TrackKeywordParamsSchema,
  track_asins: TrackAsinsParamsSchema,
  category_scan: z.object({ categoryId: z.string() }),
  ai_reserved: z.object({}).passthrough(),
} as const;

export type DeepViewParams = z.infer<typeof DeepViewParamsSchema>;
export type ReverseAsinParams = z.infer<typeof ReverseAsinParamsSchema>;
export type EnrichAsinsParams = z.infer<typeof EnrichAsinsParamsSchema>;
export type TrackKeywordParams = z.infer<typeof TrackKeywordParamsSchema>;
export type TrackAsinsParams = z.infer<typeof TrackAsinsParamsSchema>;

export const JobProgressSchema = z.object({
  done: z.number().int().nonnegative().default(0),
  total: z.number().int().nonnegative().default(0),
  step: z.string().default(''),
  message: z.string().optional(),
  /** Stato interno del runner per riprendere (es. ASIN già arricchiti). */
  state: z.record(z.string(), z.unknown()).optional(),
});
export type JobProgress = z.infer<typeof JobProgressSchema>;

export const JobSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(JOB_TYPES),
  params: z.record(z.string(), z.unknown()),
  attempts: z.number().int(),
  progress: JobProgressSchema,
});
export type Job = z.infer<typeof JobSchema>;

export const ClaimResponseSchema = z.object({ jobs: z.array(JobSchema), requeued: z.number().int().optional() });
export type ClaimResponse = z.infer<typeof ClaimResponseSchema>;

export const RankResultSchema = z.object({
  trackedKeywordId: z.string().uuid(),
  asin: AsinSchema,
  found: z.boolean(),
  page: z.number().int().nullable(),
  position: z.number().int().nullable(),
  organicPosition: z.number().int().nullable(),
  isSponsored: z.boolean().nullable(),
});
export const ReverseResultSchema = z.object({
  keyword: z.string(),
  found: z.boolean(),
  page: z.number().int().nullable(),
  position: z.number().int().nullable(),
  organicPosition: z.number().int().nullable(),
  totalResultsEst: z.number().int().nullable(),
});

/** Payload parziale e idempotente inviato a ogni chunk (vale anche da heartbeat). */
export const ProgressPayloadSchema = z.object({
  progress: JobProgressSchema,
  serp: z.array(SerpPayloadSchema).default([]),
  products: z.array(ProductPayloadSchema).default([]),
  ranks: z.array(RankResultSchema).default([]),
  reverse: z.array(ReverseResultSchema).default([]),
});
export type ProgressPayload = z.infer<typeof ProgressPayloadSchema>;

export const CompletePayloadSchema = z.object({ result: z.record(z.string(), z.unknown()).default({}) });
export const FailPayloadSchema = z.object({
  error: z.string(),
  retryable: z.boolean().default(false),
  retryAfterMs: z.number().int().nonnegative().optional(),
});
export type FailPayload = z.infer<typeof FailPayloadSchema>;

export function parseJobParams<T extends JobType>(type: T, params: unknown): z.infer<(typeof JobParamsSchemas)[T]> {
  return JobParamsSchemas[type].parse(params) as z.infer<(typeof JobParamsSchemas)[T]>;
}
