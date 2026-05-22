import { Skeleton } from '@/components/ui/Skeleton'

function SkeletonFreelancerCard() {
  return (
    <div className="card p-5 flex gap-4">
      <Skeleton className="w-16 h-16 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2.5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3.5 w-52" />
        <div className="flex gap-1.5 mt-1">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-3 w-full" />
        <div className="flex justify-between pt-1">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

export default function FreelancersLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-16 bg-card border-b border-border" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-9 w-full max-w-xl rounded-xl mb-6" />
        <div className="flex gap-6">
          <aside className="hidden lg:block w-64 flex-shrink-0 space-y-4">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </aside>
          <div className="flex-1 space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-9 w-40 rounded-xl" />
            </div>
            {Array.from({ length: 5 }).map((_, i) => <SkeletonFreelancerCard key={i} />)}
          </div>
        </div>
      </div>
    </div>
  )
}
