export type PipelineStage =
  | 'New'
  | 'Called'
  | 'Interested'
  | 'Demo Sent'
  | 'Discovery Call'
  | 'Proposal Sent'
  | 'Follow-up'
  | 'Won'
  | 'Lost';

export const PIPELINE_STAGES: PipelineStage[] = [
  'New',
  'Called',
  'Interested',
  'Demo Sent',
  'Discovery Call',
  'Proposal Sent',
  'Follow-up',
  'Won',
  'Lost',
];

export type LeadPriority = 'HOT' | 'WARM' | 'COLD';

export type CallResult =
  | 'Connected'
  | 'No Answer'
  | 'Not Picked Up'
  | 'Not Interested'
  | 'Interested'
  | 'Callback'
  | 'Call Back Later'
  | 'Wrong Number';

export type PackageName = 'Starter' | 'Growth' | 'Complete';

export type QuotationStatus = 'Not Sent' | 'Sent' | 'Accepted' | 'Rejected';

export type CallOpenerScript =
  | 'Direct GBP Audit'
  | 'Competitor Comparison'
  | 'Website Refresh Proposal'
  | 'Social Media Growth Gap'
  | 'Google Maps Ranking Miss';

export const CALL_OPENER_SCRIPTS: CallOpenerScript[] = [
  'Direct GBP Audit',
  'Competitor Comparison',
  'Website Refresh Proposal',
  'Social Media Growth Gap',
  'Google Maps Ranking Miss',
];

export type CommonObjection =
  | 'Already have website'
  | 'Already have marketing'
  | 'Not interested'
  | 'Price too high'
  | 'No budget'
  | 'Call later';

export const COMMON_OBJECTIONS: CommonObjection[] = [
  'Already have website',
  'Already have marketing',
  'Not interested',
  'Price too high',
  'No budget',
  'Call later',
];

export const INDUSTRIES = [
  'Healthcare & Dental',
  'Salon, Spa & Aesthetics',
  'Restaurant, Cafe & Bakery',
  'Real Estate & Interior Design',
  'Gym & Fitness Studio',
  'Retail & Boutique',
  'Education & Coaching',
  'Automotive & Detailing',
  'Professional & Legal Services',
  'Travel & Hospitality',
  'Other Local Business',
] as const;

export interface CallLog {
  id: string;
  leadId: string;
  date: string; // ISO date-time string
  repName: string;
  openerScript?: CallOpenerScript | string;
  result: CallResult | string;
  objection?: CommonObjection | string;
  objections?: string[]; // multi-select objection tags
  askedForWhatsApp: boolean;
  notes: string;
  nextFollowUpDate?: string;
  nextFollowUpTime?: string;
  brochureSent?: boolean;
}

export interface ScoringSignals {
  noWebsite: boolean; // +3
  badWebsite: boolean; // +2
  poorGoogleProfile: boolean; // +2
  inactiveInstagram: boolean; // +2
  goodBusinessReputation: boolean; // +2
  clearlySpendsOnMarketing: boolean; // +2
  multipleBranches: boolean; // +3
}

export interface Lead {
  id: string;
  businessName: string;
  ownerName: string;
  phone: string;
  city: string;
  industry: string;
  website: string;
  googleProfile: string;
  instagram: string;

  // Scoring
  signals: ScoringSignals;
  score: number; // auto-calculated
  priority: LeadPriority; // auto-tagged

  // Funnel & Activity
  status: PipelineStage;
  call1Date?: string;
  callResult?: CallResult;
  requirement?: string;
  whatsappSent: boolean;
  whatsappSentDate?: string;
  demoSent: boolean;
  demoSentDate?: string;
  brochureSent?: boolean;
  brochureSentDate?: string;
  followUpDate?: string;
  followUpTime?: string;
  discoveryCallDate?: string;
  packageRecommended?: PackageName;
  quotationStatus: QuotationStatus;
  expectedValue: number; // in ₹
  notes: string;

  // Multi-attempt Call History
  callLogs: CallLog[];

  // Meta
  assignedRep: string;
  createdAt: string;
  updatedAt: string;
}

export interface PackagePricing {
  name: PackageName;
  setupMin: number;
  setupMax: number;
  monthly: number;
  positioning: string;
  description: string;
}

export interface WhatsAppTemplate {
  id: string;
  day: number;
  label: string;
  purpose: string;
  template: string;
}

export interface DailyTargets {
  researchedTarget: number; // 100
  qualityCallsTarget: number; // 60 (50-70 range)
  conversationsTarget: number; // 20 (15-25 range)
  whatsappSentTarget: number; // 8 (5-10 range)
  demosSentTarget: number; // 3 (2-5 range)
  discoveryCallsTarget: number; // 2 (1-2 range)
}

// In-Call Script Assistant Config Types
export interface ObjectionItem {
  id: string;
  objection: string;
  reply: string;
  category?: string;
}

export interface CallStageItem {
  id: string;
  stageName: string;
  description: string;
  suggestedPrompt?: string;
}

export interface QualificationPrompt {
  id: string;
  question: string;
  mapsTo: 'notes' | 'requirement';
  headerPrefix: string;
  hint: string;
}

export interface CallScriptConfig {
  openingScript: string;
  stages: CallStageItem[];
  objections: ObjectionItem[];
  counterQuestions: string[];
  qualificationPrompts: QualificationPrompt[];
}
