export interface BrochureConfig {
  brochureUrl: string;
  brochureTitle: string;
  whatsappMessageTemplate: string;
}

export const DEFAULT_BROCHURE_CONFIG: BrochureConfig = {
  brochureUrl: 'https://intellicor.in/brochure.pdf',
  brochureTitle: 'Intellicor Company Brochure & Solutions',
  whatsappMessageTemplate:
    'Hi {{ownerName}}, great speaking with you today! 📄 As discussed, here is our official company brochure & portfolio for {{businessName}}:\n\n👉 {{brochureUrl}}\n\nPlease take a quick look and let me know your thoughts. Looking forward to connecting again!',
};

const BROCHURE_STORAGE_KEY = 'intellicor_brochure_settings_v1';

export function getStoredBrochureConfig(): BrochureConfig {
  if (typeof window === 'undefined') return DEFAULT_BROCHURE_CONFIG;
  try {
    const raw = localStorage.getItem(BROCHURE_STORAGE_KEY);
    if (!raw) return DEFAULT_BROCHURE_CONFIG;
    return { ...DEFAULT_BROCHURE_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_BROCHURE_CONFIG;
  }
}

export function saveStoredBrochureConfig(config: BrochureConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BROCHURE_STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save brochure configuration', err);
  }
}

export function formatBrochureMessage(
  template: string,
  brochureUrl: string,
  ownerName: string,
  businessName: string,
  repName: string
): string {
  const cleanOwner = ownerName?.trim() || businessName || 'there';
  const cleanBiz = businessName || 'your business';
  return template
    .replace(/\{\{ownerName\}\}/g, cleanOwner)
    .replace(/\{\{businessName\}\}/g, cleanBiz)
    .replace(/\{\{brochureUrl\}\}/g, brochureUrl || DEFAULT_BROCHURE_CONFIG.brochureUrl)
    .replace(/\{\{repName\}\}/g, repName || 'Our Team');
}
