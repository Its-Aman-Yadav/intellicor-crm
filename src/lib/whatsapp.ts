import { Lead, WhatsAppTemplate } from '@/types/crm';

export const DEFAULT_WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'day-1',
    day: 1,
    label: 'Day 1: Demo View Check',
    purpose: 'Check if they viewed the demo video / audit',
    template:
      'Hi {{ownerName}}, this is {{repName}} from Intellicor Technologies. Just checking in to see if you had a chance to check out the personalized demo & audit we put together for {{businessName}}? Let me know what you thought!',
  },
  {
    id: 'day-3',
    day: 3,
    label: 'Day 3: Value-Add Insight',
    purpose: 'Re-engage with a high-value suggestion or competitor insight',
    template:
      'Hey {{ownerName}}, was looking at local search trends in {{city}} today. 3 of your competitors just updated their Google Maps listings with new photo updates and are taking local queries. We can easily get {{businessName}} outranking them with the {{packageName}} setup. Open for a quick 5-min chat today?',
  },
  {
    id: 'day-7',
    day: 7,
    label: 'Day 7: Soft Follow-Up',
    purpose: 'Low-pressure check-in',
    template:
      'Hi {{ownerName}}, hope your week is going great! Know you are busy running {{businessName}}. Whenever you have a minute, let me know if you would like us to reserve your promotional setup pricing for this month.',
  },
  {
    id: 'day-15',
    day: 15,
    label: 'Day 15: Final Check & Loop Close',
    purpose: 'Final courteous touchpoint before marking follow-up complete',
    template:
      'Hi {{ownerName}}, I assume revamping {{businessName}}\'s online presence isn\'t a priority right now, which is completely fine! I will close out our notes for now so I don\'t bug you. Feel free to reach out if you ever want more local customer leads.',
  },
];

export interface CadenceStep {
  day: number;
  label: string;
  purpose: string;
  dueDate: Date;
  dueDateString: string;
  isDue: boolean;
  isOverdue: boolean;
  isCompleted: boolean;
  template: string;
}

export function formatTemplate(
  template: string,
  lead: Lead,
  repName: string = 'Intellicor Team'
): string {
  const owner = lead.ownerName?.trim() || lead.businessName;
  const pkg = lead.packageRecommended || 'Growth';

  return template
    .replace(/\{\{ownerName\}\}/g, owner)
    .replace(/\{\{businessName\}\}/g, lead.businessName)
    .replace(/\{\{city\}\}/g, lead.city || 'your area')
    .replace(/\{\{packageName\}\}/g, pkg)
    .replace(/\{\{repName\}\}/g, lead.assignedRep || repName);
}

export function getWhatsAppFollowUpCadence(
  lead: Lead,
  templates: WhatsAppTemplate[] = DEFAULT_WHATSAPP_TEMPLATES,
  currentDate: Date = new Date()
): CadenceStep[] | null {
  // Only applies if Demo Sent is true and not closed/progressed past follow-up
  if (!lead.demoSent || !lead.demoSentDate) {
    return null;
  }

  // If already reached Discovery Call, Proposal Sent, Won, or Lost, cadence is satisfied
  const inactiveStages = ['Discovery Call', 'Proposal Sent', 'Won', 'Lost'];
  if (inactiveStages.includes(lead.status)) {
    return null;
  }

  const demoSentDate = new Date(lead.demoSentDate);
  const now = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

  return templates.map((tmpl) => {
    const dueDate = new Date(demoSentDate);
    dueDate.setDate(dueDate.getDate() + tmpl.day);
    dueDate.setHours(0, 0, 0, 0);

    const isDue = dueDate.getTime() === now.getTime();
    const isOverdue = dueDate.getTime() < now.getTime();

    // Check if subsequent actions or status marked complete
    const isCompleted = false; // can be flagged or based on follow-up log

    return {
      day: tmpl.day,
      label: tmpl.label,
      purpose: tmpl.purpose,
      dueDate,
      dueDateString: dueDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      }),
      isDue,
      isOverdue,
      isCompleted,
      template: tmpl.template,
    };
  });
}

export function cleanPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+') && !cleaned.startsWith('91') && cleaned.length === 10) {
    cleaned = '91' + cleaned;
  } else if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  return cleaned;
}

export function createWhatsAppLink(phone: string, message: string): string {
  const cleaned = cleanPhoneNumber(phone);
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}
