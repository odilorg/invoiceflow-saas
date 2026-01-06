import { PAGE_X, PAGE_Y, SECTION_GAP, CARD_PAD } from '@/lib/ui/tokens';

export default function InvoicesLoading() {
  return (
    <div className={`${PAGE_X} ${PAGE_Y} ${SECTION_GAP} animate-pulse`}>
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-7 bg-muted rounded w-24"></div>
        <div className="h-10 bg-muted rounded w-32"></div>
      </div>

      {/* Filters skeleton */}
      <div className="flex flex-wrap gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-9 bg-muted rounded-full w-20"></div>
        ))}
      </div>

      {/* Invoice list skeleton */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`${CARD_PAD} bg-card border border-border rounded-xl`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-5 bg-muted rounded w-32 mb-2"></div>
                <div className="h-4 bg-muted rounded w-48"></div>
              </div>
              <div className="text-right">
                <div className="h-5 bg-muted rounded w-20 mb-2"></div>
                <div className="h-4 bg-muted rounded w-16"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
