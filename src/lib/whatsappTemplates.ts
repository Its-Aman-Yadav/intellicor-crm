import { Lead } from '@/types/crm';
import { cleanPhoneNumber } from './whatsapp';
import { getStoredBrochureConfig } from './brochureSettings';

export interface QuickWATemplate {
  id: string;
  title: string;
  badge: string;
  iconName: 'missed' | 'brochure' | 'reminder' | 'proposal' | 'intro';
  generateText: (lead: Lead, brochureUrl?: string, customTime?: string) => string;
}

export const QUICK_WA_TEMPLATES: QuickWATemplate[] = [
  {
    id: 'missed_call',
    title: "Didn't Pick Up / Missed Call",
    badge: 'No Answer',
    iconName: 'missed',
    generateText: (lead) => {
      const name = lead.ownerName || lead.businessName || 'there';
      const company = 'Intellicor';
      const service = lead.requirement ? lead.requirement.slice(0, 40) : 'your business inquiry';
      return `Hi ${name}, I tried calling you from ${company} regarding ${service}. When would be a convenient time for a quick 2-minute catch up? Thanks!`;
    },
  },
  {
    id: 'brochure_info',
    title: 'Brochure & Introduction',
    badge: 'Brochure',
    iconName: 'brochure',
    generateText: (lead, brochureUrl) => {
      const name = lead.ownerName || lead.businessName || 'there';
      const config = getStoredBrochureConfig();
      const bUrl = brochureUrl || config.brochureUrl || 'https://intellicor.in/portfolio';
      return `Hi ${name}, here is the company introduction and brochure link: ${bUrl} as requested. Please take a look and let me know if you have any questions!`;
    },
  },
  {
    id: 'followup_reminder',
    title: 'Scheduled Call Reminder',
    badge: 'Follow-up',
    iconName: 'reminder',
    generateText: (lead, _, customTime) => {
      const name = lead.ownerName || lead.businessName || 'there';
      const time = customTime || lead.followUpTime || 'our scheduled time';
      return `Hi ${name}, reminding you about our scheduled call today at ${time}. Looking forward to connecting!`;
    },
  },
  {
    id: 'proposal_deal',
    title: 'Proposal & Pricing Link',
    badge: 'Proposal',
    iconName: 'proposal',
    generateText: (lead, brochureUrl) => {
      const name = lead.ownerName || lead.businessName || 'there';
      const config = getStoredBrochureConfig();
      const bUrl = brochureUrl || config.brochureUrl || 'https://intellicor.in/portfolio';
      return `Hi ${name}, thank you for speaking with me earlier! As agreed, here is our service overview & package details: ${bUrl}. Looking forward to working together!`;
    },
  },
  {
    id: 'intro_pitch',
    title: 'Quick Intro / Service Pitch',
    badge: 'Intro',
    iconName: 'intro',
    generateText: (lead) => {
      const name = lead.ownerName || lead.businessName || 'there';
      const biz = lead.businessName || 'your business';
      return `Hi ${name}, reaching out regarding ${biz}. We help local businesses rank on top of Google Maps and drive fresh inquiries. Would love to share a free 2-min audit if you're open to it!`;
    },
  },
];

/**
 * Creates direct WhatsApp link with encoded message for a specific template
 */
export function createTemplateWhatsAppLink(
  phone: string,
  templateId: string,
  lead: Lead,
  customBrochureUrl?: string,
  customTime?: string
): string {
  const clean = cleanPhoneNumber(phone);
  const tpl = QUICK_WA_TEMPLATES.find((t) => t.id === templateId) || QUICK_WA_TEMPLATES[0];
  const message = tpl.generateText(lead, customBrochureUrl, customTime);
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}
