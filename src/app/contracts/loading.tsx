import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function ContractsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-16 bg-card border-b border-[var(--muted)]" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-9 w-20 rounded-full" />)}
        </div>
        {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    </div>
  )
}
