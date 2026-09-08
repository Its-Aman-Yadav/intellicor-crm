import { Lead, CallLog, WhatsAppTemplate, ScoringSignals } from '@/types/crm';
import { INITIAL_LEADS } from '@/data/seedData';
import { DEFAULT_WHATSAPP_TEMPLATES } from './whatsapp';
import { calculateLeadScore, determineLeadPriority } from './scoring';

const LEADS_STORAGE_KEY = 'intellicor_crm_leads_v1';
const TEMPLATES_STORAGE_KEY = 'intellicor_crm_templates_v1';
const ACTIVE_REP_KEY = 'intellicor_crm_active_rep_v1';

export function getStoredActiveRep(): string {
  if (typeof window === 'undefined') return 'All';
  return localStorage.getItem(ACTIVE_REP_KEY) || 'All';
}

export function setStoredActiveRep(rep: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVE_REP_KEY, rep);
}

export function getStoredLeads(): Lead[] {
  if (typeof window === 'undefined') return INITIAL_LEADS;
  try {
    const raw = localStorage.getItem(LEADS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(INITIAL_LEADS));
      return INITIAL_LEADS;
    }
    const parsed: Lead[] = JSON.parse(raw);
    return parsed;
  } catch (err) {
    console.error('Failed to load leads from localStorage', err);
    return INITIAL_LEADS;
  }
}

export function saveStoredLeads(leads: Lead[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads));
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

export function resetToSeedData(): Lead[] {
  if (typeof window === 'undefined') return INITIAL_LEADS;
  localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(INITIAL_LEADS));
  localStorage.setItem(
    TEMPLATES_STORAGE_KEY,
    JSON.stringify(DEFAULT_WHATSAPP_TEMPLATES)
  );
  return INITIAL_LEADS;
}

export function exportLeadsToCSV(leads: Lead[]): void {
  const headers = [
    'ID',
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

