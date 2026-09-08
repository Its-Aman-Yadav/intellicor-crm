import {
  LeadPriority,
  PackageName,
  PackagePricing,
  ScoringSignals,
} from '@/types/crm';

export const SCORING_MATRIX_RULES = [
  { key: 'noWebsite', label: 'No website', points: 3, description: 'Prospect has no web presence at all' },
  { key: 'badWebsite', label: 'Bad / outdated website', points: 2, description: 'Not mobile-friendly, slow, or broken' },
  { key: 'poorGoogleProfile', label: 'Poor Google profile', points: 2, description: 'Unclaimed, <4.0 stars, no recent photos/reviews' },
  { key: 'inactiveInstagram', label: 'Inactive Instagram', points: 2, description: 'No posts in 30+ days, poor visual aesthetics' },
  { key: 'goodBusinessReputation', label: 'Good business / reputation', points: 2, description: 'Well known locally, strong word of mouth' },
  { key: 'clearlySpendsOnMarketing', label: 'Clearly spends on marketing', points: 2, description: 'Runs Meta/Google ads or prints hoardings' },
  { key: 'multipleBranches', label: 'Multiple branches', points: 3, description: 'More than 1 physical outlet / multi-location' },
] as const;

export function calculateLeadScore(signals: ScoringSignals): number {
  let score = 0;
  if (signals.noWebsite) score += 3;
  if (signals.badWebsite) score += 2;
  if (signals.poorGoogleProfile) score += 2;
  if (signals.inactiveInstagram) score += 2;
  if (signals.goodBusinessReputation) score += 2;
  if (signals.clearlySpendsOnMarketing) score += 2;
  if (signals.multipleBranches) score += 3;
  return score;
}

export function determineLeadPriority(score: number): LeadPriority {
  if (score >= 8) return 'HOT';
  if (score >= 5) return 'WARM';
  return 'COLD';
}

export const PACKAGES: Record<PackageName, PackagePricing> = {
  Starter: {
    name: 'Starter',
    setupMin: 8000,
    setupMax: 12000,
    monthly: 1500,
    positioning: 'Basic professional online presence',
    description: 'Modern 1-page responsive website + Google Business Profile verification & optimization.',
  },
  Growth: {
    name: 'Growth',
    setupMin: 15000,
    setupMax: 20000,
    monthly: 5000,
    positioning: 'Regular visibility + lead generation',
    description: 'Local SEO, weekly Google Business updates & review automation, plus Instagram social media content.',
  },
  Complete: {
    name: 'Complete',
    setupMin: 25000,
    setupMax: 30000,
    monthly: 9000,
    positioning: 'Full active scale/growth setup',
    description: 'End-to-end digital sales engine: custom dynamic website, aggressive GBP local ranking, weekly Reels/posts, and WhatsApp lead capture.',
  },
};

export interface PackageSuggestion {
  recommendedPackage: PackageName;
  rationale: string;
  recommendedSetup: number;
  recommendedMonthly: number;
}

export function suggestPackage(
  signals: ScoringSignals,
  notes?: string
): PackageSuggestion {
  const notesLower = (notes || '').toLowerCase();

  // Rule 4: Wants serious growth or multiple branches / already spends heavily
  if (
    signals.multipleBranches ||
    (signals.clearlySpendsOnMarketing && signals.goodBusinessReputation) ||
    notesLower.includes('scale') ||
    notesLower.includes('growth') ||
    notesLower.includes('complete')
  ) {
    return {
      recommendedPackage: 'Complete',
      rationale:
        'Prospect is established, has multiple branches or high growth ambitions. Best suited for Full-Funnel active scaling.',
      recommendedSetup: 28000,
      recommendedMonthly: 9000,
    };
  }

  // Rule 1: No website → Starter (Website + GBP setup)
  if (signals.noWebsite) {
    return {
      recommendedPackage: 'Starter',
      rationale:
        'Prospect currently has no website. Recommend Starter to establish their foundational online presence & GBP verification.',
      recommendedSetup: 10000,
      recommendedMonthly: 1500,
    };
  }

  // Rule 3: Good website, inactive social → Growth (Social Media Management)
  if (!signals.badWebsite && signals.inactiveInstagram) {
    return {
      recommendedPackage: 'Growth',
      rationale:
        'Prospect has an existing website but lacks social media activity. Recommend Growth for active Instagram management & creative posts.',
      recommendedSetup: 18000,
      recommendedMonthly: 5000,
    };
  }

  // Rule 2: Website but poor visibility → Growth (Local SEO + GBP optimization)
  if (signals.poorGoogleProfile || signals.badWebsite) {
    return {
      recommendedPackage: 'Growth',
      rationale:
        'Prospect has low Google local search visibility or an outdated site. Recommend Growth for Local SEO + GBP ranking push.',
      recommendedSetup: 18000,
      recommendedMonthly: 5000,
    };
  }

  // Default fallback
  return {
    recommendedPackage: 'Growth',
    rationale:
      'Balanced visibility & lead generation package to jumpstart local customer acquisition.',
    recommendedSetup: 15000,
    recommendedMonthly: 5000,
  };
}
