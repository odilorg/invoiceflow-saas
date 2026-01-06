import { PAGE_X, PAGE_Y, SECTION_GAP, CARD_PAD } from '@/lib/ui/tokens';

export default function InvoiceDetailLoading() {
  return (
    <div className={`${PAGE_X} ${PAGE_Y} ${SECTION_GAP} animate-pulse`}>
      {/* Back button skeleton */}
      <div className="h-6 bg-muted rounded w-32"></div>

      {/* Header skeleton */}
      <div className="flex items-start justify-between">
        <div>
          <div className="h-8 bg-muted rounded w-48 mb-2"></div>
          <div className="h-5 bg-muted rounded w-32"></div>
        </div>
        <div className="h-7 bg-muted rounded-full w-20"></div>
      </div>

      {/* Main content grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Invoice details card */}
        <div className={`md:col-span-2 ${CARD_PAD} bg-card border border-border rounded-xl`}>
          <div className="h-5 bg-muted rounded w-32 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i}>
                <div className="h-3 bg-muted rounded w-16 mb-2"></div>
                <div className="h-5 bg-muted rounded w-24"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary card */}
        <div className={`${CARD_PAD} bg-card border border-border rounded-xl`}>
          <div className="h-5 bg-muted rounded w-24 mb-4"></div>
          <div className="space-y-3">
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </div>
      </div>

      {/* Follow-ups section skeleton */}
      <div className={`${CARD_PAD} bg-card border border-border rounded-xl`}>
        <div className="h-5 bg-muted rounded w-28 mb-4"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-10 w-10 bg-muted rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-muted rounded w-40 mb-1"></div>
                <div className="h-3 bg-muted rounded w-24"></div>
              </div>
              <div className="h-6 bg-muted rounded-full w-16"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
