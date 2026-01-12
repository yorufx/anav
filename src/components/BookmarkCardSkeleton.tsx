import { Skeleton } from "@/components/ui/skeleton";

export function BookmarkCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-3 flex items-center gap-2">
      {/* Icon skeleton */}
      <Skeleton className="size-7 shrink-0 rounded-md" />

      {/* Content skeleton */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Title skeleton */}
        <Skeleton className="h-4 w-3/4" />
        {/* Tags skeleton */}
        <div className="flex items-center gap-1">
          <Skeleton className="h-3 w-12 rounded" />
          <Skeleton className="h-3 w-16 rounded" />
        </div>
      </div>

      {/* External link icon skeleton */}
      <Skeleton className="size-3 shrink-0 rounded" />
    </div>
  );
}
