import { Skeleton } from "@/components/ui/skeleton";

function ConferenceSkeleton() {
  return (
    <div className="card h-full flex flex-col justify-between p-6">
      <div className="flex justify-between items-start mb-6">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-4" />
      </div>
      
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center">
          <Skeleton className="h-4 w-4 mr-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="flex items-center">
          <Skeleton className="h-4 w-4 mr-2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="flex items-center">
          <Skeleton className="h-4 w-4 mr-2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
        <div className="flex items-center">
          <Skeleton className="h-4 w-4 mr-2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="flex items-center">
          <Skeleton className="h-4 w-4 mr-2" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      </div>
      
      <div className="mt-4 mb-6">
        <Skeleton className="h-2 w-full" />
      </div>
      
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

interface LoadingScreenProps {
  layout?: 'grid' | 'calendar';
}

export default function LoadingScreen({ layout = 'grid' }: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-background dark:bg-background pt-[4.5rem]">
      {/* 
        This wrapper mimics the main container layout from the respective pages.
        The top padding accounts for the fixed header height.
      */}
      <main className="container mx-auto px-4 py-8">
        {layout === 'grid' ? (
          <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-8">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-32 rounded-full" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 9 }).map((_, i) => (
            <ConferenceSkeleton key={i} />
          ))}
        </div>
          </>
        ) : (
          <>
            {/* Calendar Skeleton */}
            <div className="flex flex-wrap gap-3 justify-center items-center mb-4">
              <div className="flex gap-3 items-center">
                <Skeleton className="h-9 w-48 rounded-lg" />
              </div>
              <div className="h-6 w-px bg-neutral-200" />
              <div className="flex gap-3">
                <Skeleton className="h-9 w-24 rounded-lg" />
                <Skeleton className="h-9 w-32 rounded-lg" />
                <Skeleton className="h-9 w-28 rounded-lg" />
              </div>
            </div>

            <div className="flex flex-col items-center gap-4 mb-6">
              <Skeleton className="h-10 w-48 rounded-lg" />
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
            </div>

            <div className="bg-card dark:bg-card rounded-xl shadow-sm border border-border dark:border-border p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="flex flex-col">
                    <Skeleton className="h-6 w-24 mx-auto mb-4" />
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <Skeleton key={j} className="h-4 w-6 mx-auto" />
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: 35 }).map((_, j) => (
                        <Skeleton key={j} className="h-8 w-full rounded-sm" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
