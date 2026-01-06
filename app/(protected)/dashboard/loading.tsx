import { PAGE_X, PAGE_Y, SECTION_GAP, CARD_PAD } from '@/lib/ui/tokens';

export default function DashboardLoading() {
  return (
    <div className={`${PAGE_X} ${PAGE_Y} ${SECTION_GAP} animate-pulse`}>
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-7 bg-muted rounded w-32"></div>
        <div className="h-10 bg-muted rounded w-28"></div>
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`${CARD_PAD} bg-card border border-border rounded-xl`}>
            <div className="h-4 bg-muted rounded w-20 mb-2"></div>
            <div className="h-8 bg-muted rounded w-16"></div>
          </div>
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className={`${CARD_PAD} bg-card border border-border rounded-xl`}>
          <div className="h-5 bg-muted rounded w-40 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </div>
        <div className={`${CARD_PAD} bg-card border border-border rounded-xl`}>
          <div className="h-5 bg-muted rounded w-40 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
