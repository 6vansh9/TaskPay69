import { Skeleton } from '@/components/ui/Skeleton'

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-16 bg-card border-b border-border" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6 items-start flex-col lg:flex-row">
          {/* Sidebar */}
          <div className="w-full lg:w-72 flex-shrink-0 space-y-4">
            <div className="card p-6 text-center space-y-4">
              <Skeleton className="w-24 h-24 rounded-full mx-auto" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32 mx-auto" />
                <Skeleton className="h-4 w-48 mx-auto" />
                <Skeleton className="h-4 w-24 mx-auto" />
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2">
                {[0, 1, 2].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
              </div>
              <Skeleton className="h-10 rounded-xl" />
            </div>
            <div className="card p-5 space-y-3">
              <Skeleton className="h-4 w-20" />
              {[0, 1, 2].map(i => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3.5 w-16" />
                </div>
              ))}
            </div>
          </div>

          {/* Main */}
          <div className="flex-1 min-w-0 space-y-4">
            <div className="card p-6 space-y-3">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </div>
            <div className="card p-6 space-y-3">
              <Skeleton className="h-5 w-16" />
              <div className="flex flex-wrap gap-2">
                {[20, 16, 24, 18, 14, 22].map((w, i) => (
                  <Skeleton key={i} className={`h-7 w-${w} rounded-full`} />
                ))}
              </div>
            </div>
            <div className="card p-6 space-y-4">
              <Skeleton className="h-5 w-28" />
              {[0, 1, 2].map(i => (
                <div key={i} className="flex gap-3 items-start pb-4 border-b border-border last:border-0">
                  <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3.5 w-56" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
