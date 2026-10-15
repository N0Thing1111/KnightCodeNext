import { z } from "zod";

export const pythonContentSchema = z.object({
  title: z.string().trim().min(1).max(160),
  concept: z.string().trim().min(1).max(100),
  instructions: z.string().min(1).max(8000),
  guide: z.string().min(1).max(8000),
  starter: z.string().max(32768),
  extension: z.string().max(2000),
  cases: z
    .array(
      z.object({
        label: z.string().min(1).max(100),
        inputs: z.array(z.string().max(1000)).max(50),
        expected: z.string().max(5000),
      }),
    )
    .min(1)
    .max(10),
});
export type PythonContent = z.infer<typeof pythonContentSchema>;
export type PythonActivity = {
  id: string;
  lesson_id: number;
  revision: number;
  content: PythonContent;
  published: boolean;
};
export type PythonResult = {
  /** Set only by administrator cleanup; submissions and reviews remain intact. */
  history_cleared_at?: string;
  output: string;
  error: string;
  inputs: string[];
  elapsed_ms: number;
  checks: {
    label: string;
    passed: boolean;
    actual: string;
    expected: string;
    error: string;
  }[];
};
export type PythonRun = {
  id: string;
  sequence: number;
  student_id: string;
  activity_id: string;
  source: string;
  status: "running" | "finished" | "error" | "stopped" | "timeout";
  result: Partial<PythonResult>;
  started_at: string;
  finished_at: string | null;
  activity_snapshot: { revision: number; content: PythonContent };
};
export const pythonResultSchema = z.object({
  output: z.string().max(20000),
  error: z.string().max(6000),
  inputs: z.array(z.string().max(4096)).max(100),
  elapsed_ms: z.number().finite().min(0).max(120000),
  checks: z
    .array(
      z.object({
        label: z.string().max(100),
        passed: z.boolean(),
        actual: z.string().max(5000),
        expected: z.string().max(5000),
        error: z.string().max(1000),
      }),
    )
    .max(10),
});
export const pythonRequestSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("create_activity"),
    lesson: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    content: pythonContentSchema,
    published: z.boolean(),
  }),
  z.object({
    op: z.literal("draft"),
    activity: z.uuid(),
    source: z.string().max(32768),
  }),
  z.object({
    op: z.literal("start"),
    revision: z.number().int().positive(),
    activity: z.uuid(),
    id: z.uuid(),
    source: z.string().min(1).max(32768),
  }),
  z.object({
    op: z.literal("finish"),
    id: z.uuid(),
    status: z.enum(["finished", "error", "stopped", "timeout"]),
    result: pythonResultSchema,
  }),
  z.object({ op: z.literal("submit"), id: z.uuid() }),
  z.object({
    op: z.literal("review"),
    submission: z.uuid(),
    status: z.enum(["reviewed", "needs_revision", "passed"]),
    logic: z.coerce.number().int().min(0).max(4),
    application: z.coerce.number().int().min(0).max(4),
    correctness: z.coerce.number().int().min(0).max(4),
    feedback: z.string().trim().min(1).max(4000),
  }),
  z.object({
    op: z.literal("activity"),
    activity: z.uuid(),
    content: pythonContentSchema,
    published: z.boolean(),
  }),
]);
