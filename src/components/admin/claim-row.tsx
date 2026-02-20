"use client";

interface AdminClaimRowProps {
  claim: {
    id: string;
    title: string;
    difficulty: string;
    market: {
      status: string;
      yesVotes: number;
      noVotes: number;
      totalVotes: number;
      aiVerdict: string | null;
      aiConfidence: number | null;
    } | null;
    _count: {
      claimVotes: number;
      claimPapers: number;
      dossierJobs: number;
    };
  };
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onResolve: () => void;
}

const difficultyColors: Record<string, string> = {
  EASY: "text-green-600 bg-green-50",
  MEDIUM: "text-amber-600 bg-amber-50",
  HARD: "text-red-600 bg-red-50",
};

const statusColors: Record<string, string> = {
  ACTIVE: "text-green-700 bg-green-100",
  RESOLVED: "text-blue-700 bg-blue-100",
  RESEARCHING: "text-amber-700 bg-amber-100",
};

export function AdminClaimRow({
  claim,
  onDelete,
  onStatusChange,
  onResolve,
}: AdminClaimRowProps) {
  const market = claim.market;
  const isResolved = market?.status === "RESOLVED";
  const yesPercent =
    market && market.totalVotes > 0
      ? Math.round((market.yesVotes / market.totalVotes) * 100)
      : 0;

  return (
    <tr className="hover:bg-muted/30">
      {/* Title */}
      <td className="max-w-xs px-4 py-3">
        <a
          href={`/claims/${claim.id}`}
          className="font-medium hover:underline"
          title={claim.title}
        >
          {claim.title.length > 60
            ? claim.title.slice(0, 60) + "..."
            : claim.title}
        </a>
        <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
          <span>{claim._count.claimVotes} votes</span>
          <span>·</span>
          <span>{claim._count.claimPapers} papers</span>
        </div>
      </td>

      {/* Difficulty */}
      <td className="px-4 py-3">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
            difficultyColors[claim.difficulty] ?? ""
          }`}
        >
          {claim.difficulty}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
            statusColors[market?.status ?? ""] ?? ""
          }`}
        >
          {market?.status ?? "N/A"}
        </span>
      </td>

      {/* Votes */}
      <td className="px-4 py-3 text-sm">
        {market ? (
          <div>
            <span className="text-green-600">{market.yesVotes}Y</span>
            {" / "}
            <span className="text-red-600">{market.noVotes}N</span>
            {market.totalVotes > 0 && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({yesPercent}%)
              </span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>

      {/* Verdict */}
      <td className="px-4 py-3 text-sm">
        {isResolved && market?.aiVerdict ? (
          <span
            className={
              market.aiVerdict === "YES" ? "text-green-600" : "text-red-600"
            }
          >
            {market.aiVerdict}{" "}
            <span className="text-xs text-muted-foreground">
              ({Math.round((market.aiConfidence ?? 0) * 100)}%)
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex gap-1">
          {!isResolved && (
            <button
              onClick={onResolve}
              className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
              title="Resolve with verdict"
            >
              Resolve
            </button>
          )}
          {market?.status === "RESEARCHING" && (
            <button
              onClick={() => onStatusChange(claim.id, "ACTIVE")}
              className="rounded px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50"
              title="Open for voting"
            >
              Activate
            </button>
          )}
          <button
            onClick={() => onDelete(claim.id)}
            className="rounded px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
            title="Delete claim"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
