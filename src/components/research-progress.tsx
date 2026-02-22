"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface ResearchProgressProps {
  claimId: string;
  /** Called when research completes (status=SUCCEEDED) */
  onComplete?: () => void;
  /** Polling interval in ms (default 2000) */
  pollInterval?: number;
}

interface ResearchStatus {
  jobId?: string;
  status: string;
  progress: number;
  stepLabel?: string;
  error?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
}

export function ResearchProgress({
  claimId,
  onComplete,
  pollInterval = 2000,
}: ResearchProgressProps) {
  const [status, setStatus] = useState<ResearchStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/claims/${claimId}/research/status`);
      if (!res.ok) throw new Error("Failed to fetch status");
      const data: ResearchStatus = await res.json();
      setStatus(data);

      // Stop polling when done
      if (data.status === "SUCCEEDED" || data.status === "FAILED" || data.status === "NONE") {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (data.status === "SUCCEEDED") {
          onCompleteRef.current?.();
        }
      }
    } catch {
      setError("Failed to check research status");
    }
  }, [claimId]);

  useEffect(() => {
    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, pollInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchStatus, pollInterval]);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!status || status.status === "NONE") {
    return null;
  }

  if (status.status === "SUCCEEDED") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4" data-testid="research-complete">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-medium text-green-800">
            Research complete
          </span>
        </div>
      </div>
    );
  }

  if (status.status === "FAILED") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4" data-testid="research-failed">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span className="text-sm font-medium text-red-800">
            Research failed
          </span>
        </div>
        {status.error && (
          <p className="mt-1 text-xs text-red-600">{status.error}</p>
        )}
      </div>
    );
  }

  // QUEUED or RUNNING
  const progress = status.progress ?? 0;

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4" data-testid="research-progress">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-blue-800">
          {status.status === "QUEUED" ? "Research queued" : "Research in progress"}
        </span>
        <span className="text-xs text-blue-600">{progress}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full rounded-full bg-blue-200 overflow-hidden mb-2">
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-500"
          style={{ width: `${progress}%` }}
          data-testid="progress-bar"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {/* Step label */}
      {status.stepLabel && (
        <p className="text-xs text-blue-600 flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
          {status.stepLabel}
        </p>
      )}
    </div>
  );
}
