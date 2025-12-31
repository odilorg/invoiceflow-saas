'use client';

import React from 'react';

export interface PricingFeature {
  text: string;
  included: boolean;
}

export interface PricingCardProps {
  name: string;
  price: string;
  priceInterval: string;
  features: PricingFeature[];
  isCurrentPlan?: boolean;
  isPopular?: boolean;
  isHighlighted?: boolean;
  ctaText: string;
  ctaDisabled?: boolean;
  ctaLoading?: boolean;
  onCtaClick?: () => void;
  ctaHref?: string;
  variant?: 'dashboard' | 'landing';
}

export function PricingCard({
  name,
  price,
  priceInterval,
  features,
  isCurrentPlan = false,
  isPopular = false,
  isHighlighted = false,
  ctaText,
  ctaDisabled = false,
  ctaLoading = false,
  onCtaClick,
  ctaHref,
  variant = 'dashboard',
}: PricingCardProps) {
  const isDashboard = variant === 'dashboard';

  const cardBg = isHighlighted
    ? 'bg-indigo-600'
    : isDashboard
      ? 'bg-card'
      : 'bg-white';

  const cardBorder = isCurrentPlan
    ? isDashboard ? 'border-foreground' : 'border-indigo-600'
    : isHighlighted
      ? 'border-indigo-700'
      : isDashboard
        ? 'border-border'
        : 'border-slate-200';

  const titleColor = isHighlighted ? 'text-white' : isDashboard ? 'text-foreground' : 'text-slate-900';
  const priceColor = isHighlighted ? 'text-white' : isDashboard ? 'text-foreground' : 'text-slate-900';
  const intervalColor = isHighlighted ? 'text-indigo-100' : isDashboard ? 'text-muted-foreground' : 'text-slate-600';
  const featureColor = isHighlighted ? 'text-indigo-50' : isDashboard ? 'text-muted-foreground' : 'text-slate-700';
  const checkColor = isHighlighted ? 'text-white' : isDashboard ? 'text-success' : 'text-indigo-600';

  const getButtonStyles = () => {
    if (ctaDisabled || isCurrentPlan) {
      return isDashboard
        ? 'bg-muted text-muted-foreground cursor-not-allowed'
        : 'bg-slate-100 text-slate-400 cursor-not-allowed';
    }
    if (isHighlighted) {
      return 'bg-white text-indigo-600 hover:bg-indigo-50';
    }
    if (isPopular && !isHighlighted) {
      return isDashboard
        ? 'bg-success text-background hover:opacity-90'
        : 'bg-indigo-600 text-white hover:bg-indigo-700';
    }
    return isDashboard
      ? 'bg-foreground text-background hover:opacity-90'
      : 'bg-indigo-600 text-white hover:bg-indigo-700';
  };

  const ButtonOrLink = ctaHref && !ctaDisabled ? 'a' : 'button';

  const cardClasses = [
    'relative flex flex-col h-full border-2 rounded-lg p-6',
    cardBg,
    cardBorder,
    isPopular ? 'pt-10' : ''
  ].filter(Boolean).join(' ');

  const badgeClasses = isDashboard
    ? 'bg-foreground text-background'
    : isHighlighted
      ? 'bg-white/20 text-white'
      : 'bg-indigo-100 text-indigo-700';

  return (
    <div className={cardClasses}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
            MOST POPULAR
          </span>
        </div>
      )}

      <div className="mb-4">
        {isCurrentPlan && (
          <div className="mb-3">
            <span className={`inline-block text-xs font-semibold px-2 py-1 rounded ${badgeClasses}`}>
              CURRENT PLAN
            </span>
          </div>
        )}

        <h3 className={`text-xl font-bold mb-2 ${titleColor}`}>
          {name}
        </h3>

        <p className={`text-3xl font-bold ${priceColor}`}>
          {price}
          <span className={`text-sm font-normal ${intervalColor}`}>
            /{priceInterval}
          </span>
        </p>
      </div>

      <ul className="flex-grow space-y-3 mb-6">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            {feature.included ? (
              <svg className={`w-5 h-5 flex-shrink-0 ${checkColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className={`text-sm ${feature.included ? featureColor : 'text-slate-400'}`}>
              {feature.text}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-auto">
        <ButtonOrLink
          href={ctaHref}
          onClick={!ctaHref ? onCtaClick : undefined}
          disabled={ctaDisabled || isCurrentPlan || ctaLoading}
          className={`w-full py-3 px-4 rounded-lg font-semibold text-center transition-all block ${getButtonStyles()}`}
        >
          {ctaLoading ? 'Processing...' : ctaText}
        </ButtonOrLink>
      </div>
    </div>
  );
}
