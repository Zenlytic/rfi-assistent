/**
 * Simple in-memory job store for batch processing
 *
 * Note: This works for warm function instances but jobs will be lost on cold starts.
 * For production, consider using Netlify Blobs, Redis, or a database.
 */

export interface BatchJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  questions: Array<{ id: string; question: string; context?: string }>;
  instructions?: string;
  results: Array<{
    id: string;
    question: string;
    answer: string;
    citations: string[];
    error?: string;
  }>;
  progress: number; // 0-100
  error?: string;
  createdAt: number;
  updatedAt: number;
}

// Global job store - persists across warm function invocations
const jobs = new Map<string, BatchJob>();

// Clean up old jobs (older than 1 hour)
function cleanupOldJobs() {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [id, job] of jobs.entries()) {
    if (job.updatedAt < oneHourAgo) {
      jobs.delete(id);
    }
  }
}

export function createJob(
  questions: BatchJob['questions'],
  instructions?: string
): BatchJob {
  cleanupOldJobs();

  const job: BatchJob = {
    id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    status: 'pending',
    questions,
    instructions,
    results: [],
    progress: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  jobs.set(job.id, job);
  return job;
}

export function getJob(id: string): BatchJob | undefined {
  return jobs.get(id);
}

export function updateJob(id: string, updates: Partial<BatchJob>): BatchJob | undefined {
  const job = jobs.get(id);
  if (!job) return undefined;

  Object.assign(job, updates, { updatedAt: Date.now() });
  return job;
}

export function addResult(
  jobId: string,
  result: BatchJob['results'][0]
): BatchJob | undefined {
  const job = jobs.get(jobId);
  if (!job) return undefined;

  job.results.push(result);
  job.progress = Math.round((job.results.length / job.questions.length) * 100);
  job.updatedAt = Date.now();

  if (job.results.length === job.questions.length) {
    job.status = 'completed';
  }

  return job;
}
