import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

// Skeleton con efecto shimmer avanzado
function SkeletonShimmer({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        "before:absolute before:inset-0",
        "before:-translate-x-full before:animate-[shimmer_2s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
        className
      )}
      {...props}
    />
  )
}

// Skeleton para tabla de alumnos
function StudentTableSkeleton() {
  return (
    <div className="space-y-3">
      {/* Header de tabla */}
      <div className="grid grid-cols-4 gap-4 p-4 border-b">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonShimmer key={i} className="h-4 w-24" />
        ))}
      </div>

      {/* Filas de estudiantes */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="grid grid-cols-4 gap-4 p-4 border-b border-border/50">
          <div className="flex items-center space-x-3">
            <SkeletonShimmer className="h-8 w-8 rounded-full" />
            <SkeletonShimmer className="h-4 w-32" />
          </div>
          <SkeletonShimmer className="h-4 w-24" />
          <SkeletonShimmer className="h-4 w-16" />
          <SkeletonShimmer className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  )
}

// Skeleton para tarjetas de dashboard
function CardSkeleton() {
  return (
    <div className="p-6 border rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <SkeletonShimmer className="h-4 w-24" />
        <SkeletonShimmer className="h-4 w-4 rounded" />
      </div>
      <SkeletonShimmer className="h-8 w-16" />
      <SkeletonShimmer className="h-3 w-20" />
    </div>
  )
}

export { Skeleton, SkeletonShimmer, StudentTableSkeleton, CardSkeleton }