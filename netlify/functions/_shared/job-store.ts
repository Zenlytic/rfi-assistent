/**
 * Job store using Netlify Blobs for persistence across function invocations
 */

import { getStore } from '@netlify/blobs';

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

const STORE_NAME = 'batch-jobs';

function getJobStore() {
  return getStore(STORE_NAME);
}

export async function createJob(
  questions: BatchJob['questions'],
  instructions?: string
): Promise<BatchJob> {
  const store = getJobStore();

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

  await store.setJSON(job.id, job);
  console.log(`Created job ${job.id} in blob store`);

  return job;
}

export async function getJob(id: string): Promise<BatchJob | null> {
  const store = getJobStore();

  try {
    const job = await store.get(id, { type: 'json' }) as BatchJob | null;
    return job;
  } catch (error) {
    console.error(`Error getting job ${id}:`, error);
    return null;
  }
}

export async function updateJob(
  id: string,
  updates: Partial<BatchJob>
): Promise<BatchJob | null> {
  const store = getJobStore();

  const job = await getJob(id);
  if (!job) return null;

  Object.assign(job, updates, { updatedAt: Date.now() });
  await store.setJSON(id, job);

  return job;
}

export async function addResult(
  jobId: string,
  result: BatchJob['results'][0]
): Promise<BatchJob | null> {
  const store = getJobStore();

  const job = await getJob(jobId);
  if (!job) return null;

  job.results.push(result);
  job.progress = Math.round((job.results.length / job.questions.length) * 100);
  job.updatedAt = Date.now();

  if (job.results.length === job.questions.length) {
    job.status = 'completed';
  }

  await store.setJSON(jobId, job);

  return job;
}

// Clean up old jobs (call periodically)
export async function cleanupOldJobs(): Promise<void> {
  const store = getJobStore();
  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  try {
    const { blobs } = await store.list();
    for (const blob of blobs) {
      const job = await store.get(blob.key, { type: 'json' }) as BatchJob | null;
      if (job && job.updatedAt < oneHourAgo) {
        await store.delete(blob.key);
        console.log(`Cleaned up old job: ${blob.key}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up old jobs:', error);
  }
}
