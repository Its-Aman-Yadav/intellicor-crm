import { Lead, CallLog, WhatsAppTemplate, ScoringSignals, CallScriptConfig, UserDailyTarget } from '@/types/crm';
import { INITIAL_LEADS } from '@/data/seedData';
import { DEFAULT_WHATSAPP_TEMPLATES } from './whatsapp';
import { DEFAULT_CALL_SCRIPT_CONFIG } from '@/data/callScripts';
import { calculateLeadScore, determineLeadPriority } from './scoring';

export const MOCK_BUSINESS_NAMES = new Set([
  'Apex Dental & Implant Clinic',
  'Blissful Glow Luxury Salon & Spa',
  'The Urban Crust Woodfired Pizzeria',
  'FitCore Crossfit & High-Performance Gym',
  'Studio Vistara Architecture & Interiors',
  'Royal Heritage Haveli & Resort',
  'Dr. Rao Orthopedic Specialty Care',
  'AutoShine Ceramic Detailing Studio',
  'Sparkle Kids Montessori & Daycare',
  'Chai & Stories Artisan Bakery',
  'Elite Law Chambers',
]);

export function isMockLead(lead: Lead): boolean {
  if (!lead) return true;
  if (MOCK_BUSINESS_NAMES.has(lead.businessName)) return true;
  if (/^lead-(\d+|101|701|901|1101)$/.test(lead.id)) return true;
  if (lead.ownerName === 'Dr. Sameer Joshi') return true;
  if (lead.phone === '+91 98201 44521') return true;
  return false;
}

const LEADS_STORAGE_KEY = 'intellicor_crm_leads_v4';
const TEMPLATES_STORAGE_KEY = 'intellicor_crm_templates_v1';
const CALL_SCRIPTS_STORAGE_KEY = 'intellicor_crm_call_scripts_v1';
const ACTIVE_REP_KEY = 'intellicor_crm_active_rep_v1';
const DAILY_TARGET_KEY = 'intellicor_crm_daily_target_v1';

export const DEFAULT_DAILY_TARGET: UserDailyTarget = {
  contactsTarget: 50,
  durationMinutesTarget: 120, // 2 hours
  mode: 'both',
};

export function getStoredDailyTarget(): UserDailyTarget {
  if (typeof window === 'undefined') return DEFAULT_DAILY_TARGET;
  try {
    const raw = localStorage.getItem(DAILY_TARGET_KEY);
    if (!raw) return DEFAULT_DAILY_TARGET;
    const parsed = JSON.parse(raw);
    return {
      contactsTarget: Number(parsed.contactsTarget) || 50,
      durationMinutesTarget: Number(parsed.durationMinutesTarget) || 120,
      mode: parsed.mode || 'both',
    };
  } catch {
    return DEFAULT_DAILY_TARGET;
  }
}

export function saveStoredDailyTarget(target: UserDailyTarget): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DAILY_TARGET_KEY, JSON.stringify(target));
  } catch (err) {
    console.error('Failed to save daily target to localStorage', err);
  }
}

export function generateSampleCategoryLeads(): Lead[] {
  const nowIso = new Date().toISOString();
  const sampleLeads: Lead[] = [
    // ----------------------------------------------------
    // CATEGORY: Airbnb (Sheet: Airbnb Goa Hosts.xlsx)
    // ----------------------------------------------------
    {
      id: `sample-abnb-1`,
      businessName: 'Casa Azure Luxury Villa',
      ownerName: 'Sunil D’Souza',
      phone: '9822114455',
      city: 'Goa (Candolim)',
      industry: 'Travel & Hospitality',
      groupName: 'Airbnb',
      sheetName: 'Airbnb Goa Hosts.xlsx',
      website: '',
      googleProfile: '',
      instagram: '',
      signals: {
        noWebsite: true,
        badWebsite: false,
        poorGoogleProfile: true,
        inactiveInstagram: false,
        goodBusinessReputation: true,
        clearlySpendsOnMarketing: true,
        multipleBranches: false,
      },
      score: 7,
      priority: 'HOT',
      status: 'New',
      quotationStatus: 'Not Sent',
      expectedValue: 15000,
      notes: '4BHK private pool villa listed on Airbnb. Wants direct guest bookings to save 18% OTA commission.',
      requirement: 'Direct booking website with WhatsApp widget and Google Maps listing.',
      whatsappSent: false,
      demoSent: false,
      brochureSent: false,
      callLogs: [],
      assignedRep: 'Aman',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: `sample-abnb-2`,
      businessName: 'Sunset Palms Beachfront Stay',
      ownerName: 'Maria Fernandez',
      phone: '9822336677',
      city: 'Goa (Morjim)',
      industry: 'Travel & Hospitality',
      groupName: 'Airbnb',
      sheetName: 'Airbnb Goa Hosts.xlsx',
      website: '',
      googleProfile: '',
      instagram: '',
      signals: {
        noWebsite: true,
        badWebsite: false,
        poorGoogleProfile: true,
        inactiveInstagram: true,
        goodBusinessReputation: true,
        clearlySpendsOnMarketing: false,
        multipleBranches: false,
      },
      score: 8,
      priority: 'HOT',
      status: 'New',
      quotationStatus: 'Not Sent',
      expectedValue: 12000,
      notes: 'Cottage resort near beach. Heavily dependent on Airbnb and Agoda.',
      requirement: 'Looking for fast mobile site with photo gallery and booking calendar.',
      whatsappSent: false,
      demoSent: false,
      brochureSent: false,
      callLogs: [],
      assignedRep: 'Aman',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: `sample-abnb-3`,
      businessName: 'Serene Heritage Portuguese Villa',
      ownerName: 'Karan Mehra',
      phone: '9823447788',
      city: 'Goa (Assagao)',
      industry: 'Travel & Hospitality',
      groupName: 'Airbnb',
      sheetName: 'Airbnb Goa Hosts.xlsx',
      website: '',
      googleProfile: '',
      instagram: '',
      signals: {
        noWebsite: true,
        badWebsite: false,
        poorGoogleProfile: false,
        inactiveInstagram: false,
        goodBusinessReputation: true,
        clearlySpendsOnMarketing: true,
        multipleBranches: false,
      },
      score: 6,
      priority: 'WARM',
      status: 'New',
      quotationStatus: 'Not Sent',
      expectedValue: 18000,
      notes: 'High-end ₹35k/night villa. Looking to build direct guest database.',
      requirement: 'Custom luxury branding and Google ranking.',
      whatsappSent: false,
      demoSent: false,
      brochureSent: false,
      callLogs: [],
      assignedRep: 'Aman',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: `sample-abnb-4`,
      businessName: 'Ocean Breeze Studio Apartments',
      ownerName: 'Nikhil Rane',
      phone: '9822558899',
      city: 'Goa (Baga)',
      industry: 'Travel & Hospitality',
      groupName: 'Airbnb',
      sheetName: 'Airbnb Goa Hosts.xlsx',
      website: '',
      googleProfile: '',
      instagram: '',
      signals: {
        noWebsite: true,
        badWebsite: false,
        poorGoogleProfile: true,
        inactiveInstagram: true,
        goodBusinessReputation: true,
        clearlySpendsOnMarketing: false,
        multipleBranches: false,
      },
      score: 7,
      priority: 'HOT',
      status: 'New',
      quotationStatus: 'Not Sent',
      expectedValue: 10000,
      notes: '6 service apartments. Wants WhatsApp integration for guest check-ins.',
      requirement: 'Affordable booking landing page.',
      whatsappSent: false,
      demoSent: false,
      brochureSent: false,
      callLogs: [],
      assignedRep: 'Aman',
      createdAt: nowIso,
      updatedAt: nowIso,
    },

    // ----------------------------------------------------
    // CATEGORY: Hotels (Sheet: Hotels Mumbai & Pune.xlsx)
    // ----------------------------------------------------
    {
      id: `sample-htl-1`,
      businessName: 'Grand Imperial Boutique Hotel',
      ownerName: 'Vikramaditya Singhania',
      phone: '9820011223',
      city: 'Mumbai (Andheri)',
      industry: 'Travel & Hospitality',
      groupName: 'Hotels',
      sheetName: 'Hotels Mumbai & Pune.xlsx',
      website: '',
      googleProfile: '',
      instagram: '',
      signals: {
        noWebsite: false,
        badWebsite: true,
        poorGoogleProfile: true,
        inactiveInstagram: true,
        goodBusinessReputation: true,
        clearlySpendsOnMarketing: true,
        multipleBranches: true,
      },
      score: 9,
      priority: 'HOT',
      status: 'New',
      quotationStatus: 'Not Sent',
      expectedValue: 35000,
      notes: '40 room hotel with banquet. Old outdated website without mobile compatibility.',
      requirement: 'Complete web revamp + direct tariff engine + banquet lead generation.',
      whatsappSent: false,
      demoSent: false,
      brochureSent: false,
      callLogs: [],
      assignedRep: 'Aman',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: `sample-htl-2`,
      businessName: 'The Sapphire Executive Suites',
      ownerName: 'Gaurav Kulkarni',
      phone: '9820122334',
      city: 'Pune (Hinjawadi)',
      industry: 'Travel & Hospitality',
      groupName: 'Hotels',
      sheetName: 'Hotels Mumbai & Pune.xlsx',
      website: '',
      googleProfile: '',
      instagram: '',
      signals: {
        noWebsite: true,
        badWebsite: false,
        poorGoogleProfile: true,
        inactiveInstagram: false,
        goodBusinessReputation: true,
        clearlySpendsOnMarketing: true,
        multipleBranches: false,
      },
      score: 7,
      priority: 'HOT',
      status: 'New',
      quotationStatus: 'Not Sent',
      expectedValue: 25000,
      notes: 'Corporate business hotel in tech park. Corporate inquiries mostly via phone.',
      requirement: 'Corporate corporate rates form and Google local SEO.',
      whatsappSent: false,
      demoSent: false,
      brochureSent: false,
      callLogs: [],
      assignedRep: 'Aman',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: `sample-htl-3`,
      businessName: 'Orchid Residency & Banquet',
      ownerName: 'Rajeev Malhotra',
      phone: '9820233445',
      city: 'Mumbai (Chembur)',
      industry: 'Travel & Hospitality',
      groupName: 'Hotels',
      sheetName: 'Hotels Mumbai & Pune.xlsx',
      website: '',
      googleProfile: '',
      instagram: '',
      signals: {
        noWebsite: true,
        badWebsite: false,
        poorGoogleProfile: true,
        inactiveInstagram: true,
        goodBusinessReputation: true,
        clearlySpendsOnMarketing: false,
        multipleBranches: false,
      },
      score: 7,
      priority: 'HOT',
      status: 'New',
      quotationStatus: 'Not Sent',
      expectedValue: 28000,
      notes: 'Wedding banquet hall and 25 rooms. Looking to get weekend wedding leads.',
      requirement: 'Banquet package showcase and WhatsApp brochure flow.',
      whatsappSent: false,
      demoSent: false,
      brochureSent: false,
      callLogs: [],
      assignedRep: 'Aman',
      createdAt: nowIso,
      updatedAt: nowIso,
    },

    // ----------------------------------------------------
    // CATEGORY: Manufacturing (Sheet: MIDC Industrial Units.xlsx)
    // ----------------------------------------------------
    {
      id: `sample-mfg-1`,
      businessName: 'Precision CNC Works & Tooling',
      ownerName: 'Dinesh Panchal',
      phone: '9819033445',
      city: 'Pune (Bhosari MIDC)',
      industry: 'Other Local Business',
      groupName: 'Manufacturing',
      sheetName: 'MIDC Industrial Units.xlsx',
      website: '',
      googleProfile: '',
      instagram: '',
      signals: {
        noWebsite: true,
        badWebsite: false,
        poorGoogleProfile: true,
        inactiveInstagram: true,
        goodBusinessReputation: true,
        clearlySpendsOnMarketing: false,
        multipleBranches: false,
      },
      score: 7,
      priority: 'HOT',
      status: 'New',
      quotationStatus: 'Not Sent',
      expectedValue: 30000,
      notes: 'Precision auto component tooling manufacturer. Seeking domestic and export RFQs.',
      requirement: 'B2B machinery portfolio and instant WhatsApp RFQ inquiry form.',
      whatsappSent: false,
      demoSent: false,
      brochureSent: false,
      callLogs: [],
      assignedRep: 'Aman',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: `sample-mfg-2`,
      businessName: 'Apex Polymers & Moulding Corp',
      ownerName: 'Hemant Shah',
      phone: '9819144556',
      city: 'Mumbai (Thane MIDC)',
      industry: 'Other Local Business',
      groupName: 'Manufacturing',
      sheetName: 'MIDC Industrial Units.xlsx',
      website: '',
      googleProfile: '',
      instagram: '',
      signals: {
        noWebsite: false,
        badWebsite: true,
        poorGoogleProfile: true,
        inactiveInstagram: true,
        goodBusinessReputation: true,
        clearlySpendsOnMarketing: true,
        multipleBranches: false,
      },
      score: 8,
      priority: 'HOT',
      status: 'New',
      quotationStatus: 'Not Sent',
      expectedValue: 40000,
      notes: 'Plastic injection moulding plant. Current site broken on mobile phones.',
      requirement: 'Digital product catalog with spec downloads.',
      whatsappSent: false,
      demoSent: false,
      brochureSent: false,
      callLogs: [],
      assignedRep: 'Aman',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: `sample-mfg-3`,
      businessName: 'Shree Krishna Fabrications & Sheet Metal',
      ownerName: 'Sanjay Patil',
      phone: '9819255667',
      city: 'Navi Mumbai (Rabale MIDC)',
      industry: 'Other Local Business',
      groupName: 'Manufacturing',
      sheetName: 'MIDC Industrial Units.xlsx',
      website: '',
      googleProfile: '',
      instagram: '',
      signals: {
        noWebsite: true,
        badWebsite: false,
        poorGoogleProfile: true,
        inactiveInstagram: true,
        goodBusinessReputation: true,
        clearlySpendsOnMarketing: false,
        multipleBranches: false,
      },
      score: 7,
      priority: 'HOT',
      status: 'New',
      quotationStatus: 'Not Sent',
      expectedValue: 25000,
      notes: 'Laser cutting and heavy industrial sheet metal fabrication.',
      requirement: 'Google ranking for industrial sheet metal fabrication in Navi Mumbai.',
      whatsappSent: false,
      demoSent: false,
      brochureSent: false,
      callLogs: [],
      assignedRep: 'Aman',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  return sampleLeads;
}

export function getStoredActiveRep(): string {
  if (typeof window === 'undefined') return 'All';
  return localStorage.getItem(ACTIVE_REP_KEY) || 'All';
}

export function setStoredActiveRep(rep: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVE_REP_KEY, rep);
}

export function getStoredLeads(): Lead[] {
  if (typeof window === 'undefined') return [];
  try {
    // Purge older mock/sample storage keys
    localStorage.removeItem('intellicor_crm_leads_v1');
    localStorage.removeItem('intellicor_crm_leads_v2');
    localStorage.removeItem('intellicor_crm_leads_v3');

    const raw = localStorage.getItem(LEADS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    const parsed: Lead[] = JSON.parse(raw);
    const filtered = parsed.filter((l) => !isMockLead(l));
    return filtered;
  } catch (err) {
    console.error('Failed to load leads from localStorage', err);
    return [];
  }
}

export function clearAllStoredLeads(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify([]));
  localStorage.removeItem('intellicor_crm_leads_v1');
  localStorage.removeItem('intellicor_crm_leads_v2');
  localStorage.removeItem('intellicor_crm_leads_v3');
}

export function saveStoredLeads(leads: Lead[]): void {
  if (typeof window === 'undefined') return;
  try {
    const clean = leads.filter((l) => !isMockLead(l));
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(clean));
  } catch (err) {
    console.error('Failed to save leads to localStorage', err);
  }
}

export function getStoredTemplates(): WhatsAppTemplate[] {
  if (typeof window === 'undefined') return DEFAULT_WHATSAPP_TEMPLATES;
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(
        TEMPLATES_STORAGE_KEY,
        JSON.stringify(DEFAULT_WHATSAPP_TEMPLATES)
      );
      return DEFAULT_WHATSAPP_TEMPLATES;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_WHATSAPP_TEMPLATES;
  }
}

export function saveStoredTemplates(templates: WhatsAppTemplate[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
}

export function getStoredCallScripts(): CallScriptConfig {
  if (typeof window === 'undefined') return DEFAULT_CALL_SCRIPT_CONFIG;
  try {
    const raw = localStorage.getItem(CALL_SCRIPTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(
        CALL_SCRIPTS_STORAGE_KEY,
        JSON.stringify(DEFAULT_CALL_SCRIPT_CONFIG)
      );
      return DEFAULT_CALL_SCRIPT_CONFIG;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_CALL_SCRIPT_CONFIG;
  }
}

export function saveStoredCallScripts(config: CallScriptConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CALL_SCRIPTS_STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save call scripts to localStorage', err);
  }
}

export function resetToSeedData(): Lead[] {
  if (typeof window === 'undefined') return INITIAL_LEADS;
  localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(INITIAL_LEADS));
  localStorage.setItem(
    TEMPLATES_STORAGE_KEY,
    JSON.stringify(DEFAULT_WHATSAPP_TEMPLATES)
  );
  localStorage.setItem(
    CALL_SCRIPTS_STORAGE_KEY,
    JSON.stringify(DEFAULT_CALL_SCRIPT_CONFIG)
  );
  return INITIAL_LEADS;
}

export function exportLeadsToCSV(leads: Lead[]): void {
  const headers = [
    'ID',
    'Category / Group',
    'Sheet / Source',
    'Business Name',
    'Owner / Contact Name',
    'Phone',
    'City',
    'Industry',
    'Website',
    'Google Profile',
    'Instagram',
    'Lead Score',
    'Lead Priority',
    'Status',
    'Call 1 Date',
    'Call Result',
    'Requirement',
    'WhatsApp Sent',
    'WhatsApp Sent Date',
    'Demo Sent',
    'Demo Sent Date',
    'Follow-up Date',
    'Discovery Call Date',
    'Package Recommended',
    'Quotation Status',
    'Expected Value (INR)',
    'Total Call Attempts',
    'Assigned Rep',
    'Notes',
    'Created At',
  ];

  const escapeCSV = (val: unknown) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = leads.map((lead) => [
    escapeCSV(lead.id),
    escapeCSV(lead.groupName || 'General Leads'),
    escapeCSV(lead.sheetName || 'Uploaded Sheet'),
    escapeCSV(lead.businessName),
    escapeCSV(lead.ownerName),
    escapeCSV(lead.phone),
    escapeCSV(lead.city),
    escapeCSV(lead.industry),
    escapeCSV(lead.website),
    escapeCSV(lead.googleProfile),
    escapeCSV(lead.instagram),
    lead.score,
    escapeCSV(lead.priority),
    escapeCSV(lead.status),
    escapeCSV(lead.call1Date || ''),
    escapeCSV(lead.callResult || ''),
    escapeCSV(lead.requirement || ''),
    lead.whatsappSent ? 'Yes' : 'No',
    escapeCSV(lead.whatsappSentDate || ''),
    lead.demoSent ? 'Yes' : 'No',
    escapeCSV(lead.demoSentDate || ''),
    escapeCSV(lead.followUpDate || ''),
    escapeCSV(lead.discoveryCallDate || ''),
    escapeCSV(lead.packageRecommended || ''),
    escapeCSV(lead.quotationStatus),
    lead.expectedValue || 0,
    lead.callLogs?.length || 0,
    escapeCSV(lead.assignedRep || ''),
    escapeCSV(lead.notes || ''),
    escapeCSV(lead.createdAt || ''),
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute(
    'download',
    `intellicor_crm_leads_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

import { splitRowIntoCells, detectColumnTypes, DetectedField } from './smartParser';

export function parseCSVToLeads(csvText: string): Lead[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const matrix = lines.map((line) => splitRowIntoCells(line));
  const { hasHeader, mappings } = detectColumnTypes(matrix);

  const dataRows = hasHeader ? matrix.slice(1) : matrix;
  const newLeads: Lead[] = [];
  const nowIso = new Date().toISOString();

  dataRows.forEach((row, i) => {
    let businessName = '';
    let ownerName = '';
    let phone = '';
    let city = '';
    let industry = 'Other Local Business';
    let website = '';
    let instagram = '';
    let notes = '';

    row.forEach((cellVal, colIdx) => {
      const field = mappings[colIdx] || 'skip';
      const val = cellVal.trim();
      if (!val) return;

      switch (field) {
        case 'businessName':
          businessName = val;
          break;
        case 'ownerName':
          ownerName = val;
          break;
        case 'phone':
          phone = val;
          break;
        case 'city':
          city = val;
          break;
        case 'industry':
          industry = val;
          break;
        case 'website':
          website = val;
          break;
        case 'instagram':
          instagram = val;
          break;
        case 'notes':
          notes = notes ? `${notes} | ${val}` : val;
          break;
        case 'skip':
          break;
      }
    });

    // Fallback if businessName was empty but ownerName was present
    if (!businessName && ownerName) {
      businessName = ownerName;
    } else if (!ownerName && businessName) {
      ownerName = businessName;
    }

    // Must have at least phone or name to be considered a lead
    const digitsOnly = phone.replace(/\D/g, '');
    if (!businessName && digitsOnly.length < 8) {
      return;
    }

    const signals: ScoringSignals = {
      noWebsite: !website,
      badWebsite: false,
      poorGoogleProfile: false,
      inactiveInstagram: !instagram,
      goodBusinessReputation: true,
      clearlySpendsOnMarketing: false,
      multipleBranches: false,
    };
    const score = calculateLeadScore(signals);
    const priority = determineLeadPriority(score);

    newLeads.push({
      id: `lead-csv-${Date.now()}-${i}`,
      businessName: businessName || 'Unknown Business',
      ownerName: ownerName || '',
      phone: phone || '',
      city: city || 'Mumbai',
      industry: industry || 'Other Local Business',
      groupName: 'General Leads',
      sheetName: 'Imported CSV Sheet.csv',
      website: website || '',
      googleProfile: '',
      instagram: instagram || '',
      signals,
      score,
      priority,
      status: 'New',
      call1Date: undefined,
      requirement: notes || 'Imported via CSV file.',
      whatsappSent: false,
      demoSent: false,
      packageRecommended: !website ? 'Starter' : 'Growth',
      quotationStatus: 'Not Sent',
      expectedValue: !website ? 10000 : 18000,
      notes: notes ? `${notes} (CSV Upload)` : 'Imported via Smart CSV Upload.',
      callLogs: [],
      assignedRep: 'Aman',
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  });

  return newLeads;
}

