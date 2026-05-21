import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function JobsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-16 bg-card border-b border-[var(--muted)]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          <aside className="space-y-4">
            <Skeleton className="h-8 w-32" />
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </aside>
          <div className="lg:col-span-3 space-y-4">
            <Skeleton className="h-10 w-full rounded-xl" />
            {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    </div>
  )
}
