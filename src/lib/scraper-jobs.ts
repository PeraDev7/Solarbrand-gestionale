import { ParsedGoogleMapsLead } from './google-maps-scraper.js';

export interface ScraperJob {
  jobId: string;
  tenantId: string;
  apifyToken: string;
  createdAt: number;
  targetCount: number;
  searchStrings: string[];
  locationQuery: string;
  wantsVerifiedEmail: boolean;
  currentApifyRunId: string;
  currentBatchSize: number;
  roundsDone: number;
  collectedLeads: ParsedGoogleMapsLead[];
  result?: {
    status: 'DONE' | 'FAILED' | 'RUNNING';
    ok?: boolean;
    imported?: number;
    total?: number;
    importedIds?: string[];
    error?: string;
    foundSoFar?: number;
    message?: string;
  };
}

const jobs = new Map<string, ScraperJob>();

export function createJob(jobId: string, job: ScraperJob) {
  jobs.set(jobId, job);
  // Auto-cleanup jobs older than 2 hours
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  for (const [id, j] of jobs.entries()) {
    if (j.createdAt < twoHoursAgo) {
      jobs.delete(id);
    }
  }
}

export function getJob(jobId: string): ScraperJob | undefined {
  return jobs.get(jobId);
}

export function updateJob(jobId: string, patch: Partial<ScraperJob>) {
  const j = jobs.get(jobId);
  if (j) {
    Object.assign(j, patch);
  }
}

export function deleteJob(jobId: string) {
  jobs.delete(jobId);
}

