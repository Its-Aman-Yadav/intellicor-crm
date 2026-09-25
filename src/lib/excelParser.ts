import * as XLSX from 'xlsx';
import { Lead, ScoringSignals } from '@/types/crm';
import { cleanPhoneNumber } from './whatsapp';
import { detectColumnTypes, DetectedField, splitRowIntoCells } from './smartParser';
import { calculateLeadScore, determineLeadPriority } from './scoring';

export interface ParsedSheetResult {
  sheetName: string;
  totalRows: number;
  headers: string[];
  sampleRows: string[][];
  rawMatrix: string[][];
  detectedMappings: DetectedField[];
  hasHeader: boolean;
}

/**
 * Reads an Excel file (.xlsx, .xls) or CSV / TSV file and converts to a 2D string matrix
 */
export async function readSpreadsheetFile(file: File): Promise<ParsedSheetResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0] || 'Sheet1';
  const worksheet = workbook.Sheets[sheetName];

  // Convert sheet to 2D array of rows
  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  const matrix: string[][] = rawRows
    .map((row) =>
      row.map((cell) => {
        if (cell === null || cell === undefined) return '';
        return String(cell).trim();
      })
    )
    .filter((row) => row.some((cell) => cell.length > 0));

  if (matrix.length === 0) {
    throw new Error('The uploaded file contains no readable data rows.');
  }

  // Detect column mappings
  const detection = detectColumnTypes(matrix);
  const headers = detection.hasHeader
    ? matrix[0]
    : matrix[0].map((_, i) => `Column ${i + 1}`);

  const sampleRows = (detection.hasHeader ? matrix.slice(1, 6) : matrix.slice(0, 5));

  return {
    sheetName,
    totalRows: detection.hasHeader ? matrix.length - 1 : matrix.length,
    headers,
    sampleRows,
    rawMatrix: matrix,
    detectedMappings: detection.mappings,
    hasHeader: detection.hasHeader,
  };
}

/**
 * Parses raw text copied and pasted from Excel or Google Sheets
 */
export function parsePastedSpreadsheetText(text: string): ParsedSheetResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    throw new Error('No text to parse.');
  }

  const matrix = lines.map((line) => splitRowIntoCells(line));
  const detection = detectColumnTypes(matrix);
  const headers = detection.hasHeader
    ? matrix[0]
    : matrix[0].map((_, i) => `Column ${i + 1}`);
  const sampleRows = detection.hasHeader ? matrix.slice(1, 6) : matrix.slice(0, 5);

  return {
    sheetName: 'Pasted Data',
    totalRows: detection.hasHeader ? matrix.length - 1 : matrix.length,
    headers,
    sampleRows,
    rawMatrix: matrix,
    detectedMappings: detection.mappings,
    hasHeader: detection.hasHeader,
  };
}

export interface ConvertOptions {
  mappings: DetectedField[];
  hasHeader: boolean;
  defaultCity?: string;
  defaultIndustry?: string;
  assignedRep?: string;
}

/**
 * Converts parsed matrix and mappings into standardized Lead records
 */
export function convertMatrixToLeads(
  matrix: string[][],
  options: ConvertOptions
): Lead[] {
  const {
    mappings,
    hasHeader,
    defaultCity = 'Local Area',
    defaultIndustry = 'Other Local Business',
    assignedRep = 'Aman',
  } = options;

  const dataRows = hasHeader ? matrix.slice(1) : matrix;
  const nowIso = new Date().toISOString();
  const leads: Lead[] = [];

  dataRows.forEach((row, rowIdx) => {
    let businessName = '';
    let ownerName = '';
    let phone = '';
    let city = defaultCity;
    let industry = defaultIndustry;
    let website = '';
    let instagram = '';
    let notes = '';

    row.forEach((cellVal, colIdx) => {
      const field = mappings[colIdx] || 'skip';
      const val = (cellVal || '').trim();
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
        default:
          break;
      }
    });

    // Skip empty lines without phone and business name
    if (!phone && !businessName && !ownerName) return;

    // Clean and validate phone number
    const cleanedPhone = cleanPhoneNumber(phone || '0000000000');
    const finalBusinessName = businessName || ownerName || `Client #${rowIdx + 1}`;
    const finalOwnerName = ownerName || (businessName !== finalBusinessName ? businessName : '');

    const defaultSignals: ScoringSignals = {
      noWebsite: !website,
      badWebsite: false,
      poorGoogleProfile: true,
      inactiveInstagram: !instagram,
      goodBusinessReputation: true,
      clearlySpendsOnMarketing: false,
      multipleBranches: false,
    };

    const score = calculateLeadScore(defaultSignals);
    const priority = determineLeadPriority(score);

    const lead: Lead = {
      id: `lead-${Date.now()}-${rowIdx}-${Math.random().toString(36).slice(2, 6)}`,
      businessName: finalBusinessName,
      ownerName: finalOwnerName,
      phone: cleanedPhone,
      city: city || 'Local Area',
      industry: industry || 'Other Local Business',
      website: website || '',
      googleProfile: '',
      instagram: instagram || '',
      signals: defaultSignals,
      score,
      priority,
      status: 'New',
      quotationStatus: 'Not Sent',
      expectedValue: 15000,
      notes: notes || '',
      requirement: notes || '',
      whatsappSent: false,
      demoSent: false,
      brochureSent: false,
      callLogs: [],
      assignedRep,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    leads.push(lead);
  });

  return leads;
}

/**
 * Downloads a sample Excel file template for the user
 */
export function downloadSampleExcelTemplate(): void {
  const sampleData = [
    {
      'Business / Company Name': 'Apex Dental Clinic',
      'Owner / Contact Name': 'Dr. Rajesh Sharma',
      'Phone / Mobile': '9876543210',
      'City / Location': 'Mumbai',
      'Notes / Requirement': 'Interested in website revamp and local SEO',
    },
    {
      'Business / Company Name': 'Bella Vista Bistro & Cafe',
      'Owner / Contact Name': 'Ananya Roy',
      'Phone / Mobile': '9823456789',
      'City / Location': 'Pune',
      'Notes / Requirement': 'Looking for digital menu and Instagram marketing',
    },
    {
      'Business / Company Name': 'Prime Fitness & Gym',
      'Owner / Contact Name': 'Vikram Singh',
      'Phone / Mobile': '9912345678',
      'City / Location': 'Bangalore',
      'Notes / Requirement': 'Need brochure sent on WhatsApp for corporate membership',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sample Leads');
  XLSX.writeFile(workbook, 'leads_upload_template.xlsx');
}

/**
 * Exports all leads to a formatted .xlsx Excel spreadsheet
 */
export function exportLeadsToExcel(leads: Lead[], filename?: string): void {
  if (!leads || leads.length === 0) {
    alert('No leads to export!');
    return;
  }

  const exportData = leads.map((l, idx) => {
    const isWon = l.status === 'Won' || l.callResult === 'Deal Won';
    const wonAmt = l.dealValue || (isWon ? l.expectedValue : '');

    return {
      '#': idx + 1,
      'Business / Company Name': l.businessName || '',
      'Owner / Contact Name': l.ownerName || '',
      'Phone Number': l.phone || '',
      'City': l.city || '',
      'Industry': l.industry || '',
      'Last Call Outcome': l.callResult || 'Not Called',
      'Lead Status': l.status || 'New',
      'Requirement / Notes': l.requirement || l.notes || '',
      'Follow-up Date': l.followUpDate || '',
      'Follow-up Time': l.followUpTime || '',
      'Brochure Sent': l.brochureSent ? 'Yes' : 'No',
      'Brochure Sent Date': l.brochureSentDate || '',
      'Deal Won Amount (INR)': wonAmt,
      'Assigned Rep': l.assignedRep || 'Aman',
      'Created Date': l.createdAt ? l.createdAt.slice(0, 10) : '',
      'Last Updated': l.updatedAt ? l.updatedAt.slice(0, 10) : '',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  worksheet['!cols'] = [
    { wch: 5 },  // #
    { wch: 28 }, // Business Name
    { wch: 22 }, // Contact Name
    { wch: 16 }, // Phone
    { wch: 15 }, // City
    { wch: 20 }, // Industry
    { wch: 18 }, // Last Call Outcome
    { wch: 14 }, // Lead Status
    { wch: 38 }, // Requirement / Notes
    { wch: 14 }, // Follow-up Date
    { wch: 14 }, // Follow-up Time
    { wch: 14 }, // Brochure Sent
    { wch: 16 }, // Brochure Sent Date
    { wch: 22 }, // Deal Won Amount
    { wch: 15 }, // Rep
    { wch: 14 }, // Created Date
    { wch: 14 }, // Last Updated
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Client Leads');
  const dateStr = new Date().toISOString().slice(0, 10);
  const outName = filename || `Intellicor_Leads_${dateStr}.xlsx`;
  XLSX.writeFile(workbook, outName);
}
