import * as XLSX from 'xlsx';
import { Lead, ScoringSignals } from '@/types/crm';
import { cleanPhoneNumber } from './whatsapp';
import { detectColumnTypes, DetectedField, splitRowIntoCells } from './smartParser';
import { calculateLeadScore, determineLeadPriority } from './scoring';

export interface ColumnStat {
  index: number;
  header: string;
  nonEmptyCount: number;
  totalRows: number;
  fillPercentage: number;
  sampleValues: string[];
  suggestedField: DetectedField;
  confidence: 'High' | 'Medium' | 'Low';
}

export interface ParsedSheetResult {
  sheetName: string;
  availableSheets: string[];
  totalRows: number;
  totalColumns: number;
  headers: string[];
  sampleRows: string[][];
  dataRows: string[][];
  rawMatrix: string[][];
  detectedMappings: DetectedField[];
  hasHeader: boolean;
  headerRowIndex: number;
  columnStats: ColumnStat[];
  workbookBuffer?: ArrayBuffer;
}

/**
 * Normalizes raw rows from sheet_to_json so every row has identical length (maxCols)
 * and empty trailing cells aren't truncated.
 */
function normalizeRawRows(rawRows: unknown[][]): string[][] {
  const maxCols = Math.max(
    ...rawRows.map((r) => (Array.isArray(r) ? r.length : 0)),
    1
  );

  return rawRows
    .map((row) => {
      const arr = Array.isArray(row) ? row : [];
      const normalized: string[] = [];
      for (let c = 0; c < maxCols; c++) {
        const cell = arr[c];
        if (cell === null || cell === undefined) {
          normalized.push('');
        } else {
          normalized.push(String(cell).trim());
        }
      }
      return normalized;
    })
    .filter((row) => row.some((cell) => cell.length > 0));
}

/**
 * Ensures worksheet['!ref'] encompasses all existing cells in the sheet.
 * Many spreadsheet generators/exporters write an outdated or truncated `dimension`
 * tag (e.g. A1:N100 = 14 columns) even when there are 30+ columns (O, P, Q ... AD).
 * SheetJS's sheet_to_json strictly bounds its iteration to `!ref`, which drops
 * all columns beyond column 14. This function scans all cell coordinates and properties
 * to dynamically expand !ref so 100% of the columns are read.
 */
export function ensureFullWorksheetRange(worksheet: XLSX.WorkSheet): void {
  if (!worksheet) return;

  let minC = 0;
  let minR = 0;
  let maxC = -1;
  let maxR = -1;

  // 1. Initial bounds from worksheet['!ref'] if available
  if (worksheet['!ref']) {
    try {
      const decoded = XLSX.utils.decode_range(worksheet['!ref']);
      minC = Math.min(minC, decoded.s.c);
      minR = Math.min(minR, decoded.s.r);
      maxC = Math.max(maxC, decoded.e.c);
      maxR = Math.max(maxR, decoded.e.r);
    } catch {
      // ignore malformed !ref
    }
  }

  // 2. Check '!fullref' property if present
  const fullref = (worksheet as Record<string, unknown>)['!fullref'];
  if (typeof fullref === 'string') {
    try {
      const decoded = XLSX.utils.decode_range(fullref);
      minC = Math.min(minC, decoded.s.c);
      minR = Math.min(minR, decoded.s.r);
      maxC = Math.max(maxC, decoded.e.c);
      maxR = Math.max(maxR, decoded.e.r);
    } catch {
      // ignore
    }
  }

  // 3. Check column formatting array '!cols' length if present
  const cols = (worksheet as Record<string, unknown>)['!cols'];
  if (Array.isArray(cols) && cols.length > 0) {
    maxC = Math.max(maxC, cols.length - 1);
  }

  // 4. Check autofilter range if present
  const autofilter = (worksheet as Record<string, unknown>)['!autofilter'] as { ref?: string } | undefined;
  if (autofilter && typeof autofilter.ref === 'string') {
    try {
      const decoded = XLSX.utils.decode_range(autofilter.ref);
      maxC = Math.max(maxC, decoded.e.c);
      maxR = Math.max(maxR, decoded.e.r);
    } catch {
      // ignore
    }
  }

  // 5. Check dense mode array '!data' if present
  const data = (worksheet as Record<string, unknown>)['!data'];
  if (Array.isArray(data)) {
    for (let r = 0; r < data.length; r++) {
      if (Array.isArray(data[r])) {
        for (let c = 0; c < data[r].length; c++) {
          if (data[r][c] !== undefined && data[r][c] !== null) {
            if (c > maxC) maxC = c;
            if (r > maxR) maxR = r;
          }
        }
      }
    }
  }

  // 6. Scan ALL cell keys in the worksheet object (e.g. 'A1', 'AD10', etc.)
  for (const key of Object.keys(worksheet)) {
    if (key.charCodeAt(0) === 33) continue; // skip '!ref', '!cols', '!rows', '!merges', etc.
    try {
      const cell = XLSX.utils.decode_cell(key);
      if (cell.c > maxC) maxC = cell.c;
      if (cell.r > maxR) maxR = cell.r;
      if (cell.c < minC) minC = cell.c;
      if (cell.r < minR) minR = cell.r;
    } catch {
      // key was not a standard cell coordinate
    }
  }

  // 7. Update !ref to encompass the true maximum dimensions
  if (maxC >= 0 && maxR >= 0) {
    worksheet['!ref'] = XLSX.utils.encode_range({
      s: { c: minC === Infinity ? 0 : minC, r: minR === Infinity ? 0 : minR },
      e: { c: maxC, r: maxR },
    });
  }
}

/**
 * Builds ParsedSheetResult with accurate column headers, statistics, and mappings
 */
export function buildParsedSheetResult(params: {
  sheetName: string;
  availableSheets: string[];
  matrix: string[][];
  headerRowIndex?: number;
  workbookBuffer?: ArrayBuffer;
}): ParsedSheetResult {
  const { sheetName, availableSheets, matrix, workbookBuffer } = params;

  if (matrix.length === 0) {
    throw new Error('The selected sheet contains no readable data rows.');
  }

  const numCols = Math.max(...matrix.map((r) => r.length), 1);

  // Determine header row index
  let headerRowIndex: number;
  let hasHeader: boolean;

  if (params.headerRowIndex !== undefined) {
    headerRowIndex = params.headerRowIndex;
    hasHeader = headerRowIndex >= 0;
  } else {
    // Auto-detect header row
    const autoDetect = detectColumnTypes(matrix);
    if (autoDetect.hasHeader) {
      headerRowIndex = 0;
      hasHeader = true;
    } else {
      // Check if row 1 might be the header if row 0 was a title or banner
      if (matrix.length > 2) {
        const row1Detection = detectColumnTypes(matrix.slice(1));
        if (row1Detection.hasHeader) {
          headerRowIndex = 1;
          hasHeader = true;
        } else {
          headerRowIndex = -1;
          hasHeader = false;
        }
      } else {
        headerRowIndex = -1;
        hasHeader = false;
      }
    }
  }

  // Build headers & data rows
  let headers: string[];
  let dataRows: string[][];

  if (hasHeader && headerRowIndex >= 0 && headerRowIndex < matrix.length) {
    const rawHeaderRow = matrix[headerRowIndex] || [];
    headers = Array.from({ length: numCols }, (_, i) => {
      const text = (rawHeaderRow[i] || '').trim();
      return text || `Column ${i + 1}`;
    });
    dataRows = matrix.slice(headerRowIndex + 1);
  } else {
    headers = Array.from({ length: numCols }, (_, i) => `Column ${i + 1}`);
    dataRows = matrix;
    hasHeader = false;
    headerRowIndex = -1;
  }

  // Detect column types on the active header + data rows
  const matrixForDetection = hasHeader ? [headers, ...dataRows] : dataRows;
  const detection = detectColumnTypes(matrixForDetection);

  // Build column statistics for user review
  const columnStats: ColumnStat[] = [];
  for (let c = 0; c < numCols; c++) {
    const colHeader = headers[c] || `Column ${c + 1}`;
    let nonEmptyCount = 0;
    const sampleSet = new Set<string>();

    for (let r = 0; r < dataRows.length; r++) {
      const val = (dataRows[r][c] || '').trim();
      if (val) {
        nonEmptyCount++;
        if (sampleSet.size < 5) {
          sampleSet.add(val);
        }
      }
    }

    const fillPercentage = Math.round(
      (nonEmptyCount / Math.max(dataRows.length, 1)) * 100
    );

    const analysisItem = detection.analysis.find((a) => a.index === c);
    const suggestedField = detection.mappings[c] || 'skip';
    const confidence = analysisItem?.confidence || 'Medium';

    columnStats.push({
      index: c,
      header: colHeader,
      nonEmptyCount,
      totalRows: dataRows.length,
      fillPercentage,
      sampleValues: Array.from(sampleSet),
      suggestedField,
      confidence,
    });
  }

  return {
    sheetName,
    availableSheets: availableSheets.length > 0 ? availableSheets : [sheetName],
    totalRows: dataRows.length,
    totalColumns: numCols,
    headers,
    sampleRows: dataRows.slice(0, 25),
    dataRows,
    rawMatrix: matrix,
    detectedMappings: detection.mappings,
    hasHeader,
    headerRowIndex,
    columnStats,
    workbookBuffer,
  };
}

/**
 * Reads an Excel file (.xlsx, .xls) or CSV / TSV file and converts to a full 2D matrix
 */
export async function readSpreadsheetFile(
  file: File,
  options?: { selectedSheet?: string; headerRowIndex?: number }
): Promise<ParsedSheetResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const availableSheets = workbook.SheetNames || ['Sheet1'];

  // Expand bounds on ALL sheets in the workbook to prevent 14-column truncation
  for (const sName of availableSheets) {
    if (workbook.Sheets[sName]) {
      ensureFullWorksheetRange(workbook.Sheets[sName]);
    }
  }

  let chosenSheet = options?.selectedSheet || availableSheets[0] || 'Sheet1';
  if (!availableSheets.includes(chosenSheet)) {
    chosenSheet = availableSheets[0] || 'Sheet1';
  }

  const worksheet = workbook.Sheets[chosenSheet];
  if (!worksheet) {
    throw new Error(`Sheet "${chosenSheet}" was empty or not found in workbook.`);
  }

  ensureFullWorksheetRange(worksheet);

  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  let matrix = normalizeRawRows(rawRows);

  // If this was a text-based sheet (.csv, .tsv, .txt), also verify against raw text parsing
  const lowerFileName = file.name.toLowerCase();
  if (lowerFileName.endsWith('.csv') || lowerFileName.endsWith('.tsv') || lowerFileName.endsWith('.txt')) {
    try {
      const rawText = await file.text();
      const textLines = rawText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      if (textLines.length > 0) {
        const textRawRows = textLines.map((line) => splitRowIntoCells(line));
        const textMatrix = normalizeRawRows(textRawRows);
        const textCols = textMatrix.length > 0 ? textMatrix[0].length : 0;
        const currentCols = matrix.length > 0 ? matrix[0].length : 0;
        if (textCols > currentCols) {
          matrix = textMatrix;
        }
      }
    } catch {
      // ignore text fallback error
    }
  }

  return buildParsedSheetResult({
    sheetName: chosenSheet,
    availableSheets,
    matrix,
    headerRowIndex: options?.headerRowIndex,
    workbookBuffer: buffer,
  });
}

/**
 * Switches to another sheet tab within the cached workbook
 */
export function switchParsedSheet(
  buffer: ArrayBuffer,
  sheetName: string,
  headerRowIndex?: number
): ParsedSheetResult {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const availableSheets = workbook.SheetNames || [sheetName];
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error(`Sheet "${sheetName}" not found in workbook.`);
  }

  ensureFullWorksheetRange(worksheet);

  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  const matrix = normalizeRawRows(rawRows);

  return buildParsedSheetResult({
    sheetName,
    availableSheets,
    matrix,
    headerRowIndex,
    workbookBuffer: buffer,
  });
}

/**
 * Re-parses an existing sheet with a user-selected header row index
 */
export function reparseWithHeaderRow(
  parsed: ParsedSheetResult,
  newHeaderRowIndex: number
): ParsedSheetResult {
  return buildParsedSheetResult({
    sheetName: parsed.sheetName,
    availableSheets: parsed.availableSheets,
    matrix: parsed.rawMatrix,
    headerRowIndex: newHeaderRowIndex,
    workbookBuffer: parsed.workbookBuffer,
  });
}

/**
 * Parses raw text copied and pasted from Excel or Google Sheets
 */
export function parsePastedSpreadsheetText(
  text: string,
  headerRowIndex?: number
): ParsedSheetResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    throw new Error('No text to parse.');
  }

  const rawRows = lines.map((line) => splitRowIntoCells(line));
  const matrix = normalizeRawRows(rawRows);

  return buildParsedSheetResult({
    sheetName: 'Pasted Rows',
    availableSheets: ['Pasted Rows'],
    matrix,
    headerRowIndex,
  });
}

export interface ConvertOptions {
  mappings: DetectedField[];
  hasHeader: boolean;
  headerRowIndex?: number;
  defaultCity?: string;
  defaultIndustry?: string;
  assignedRep?: string;
  groupName?: string;
  sheetName?: string;
  batchId?: string;
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
    headerRowIndex,
    defaultCity = 'Local Area',
    defaultIndustry = 'Other Local Business',
    assignedRep = 'Aman',
    groupName = 'General Leads',
    sheetName = 'Uploaded Sheet',
    batchId,
  } = options;

  let dataRows: string[][];
  if (headerRowIndex !== undefined) {
    if (headerRowIndex === -1) {
      dataRows = matrix;
    } else {
      dataRows = matrix.slice(headerRowIndex + 1);
    }
  } else {
    dataRows = hasHeader ? matrix.slice(1) : matrix;
  }

  const nowIso = new Date().toISOString();
  const leads: Lead[] = [];

  dataRows.forEach((row, rowIdx) => {
    let businessName = '';
    let ownerName = '';
    let phone = '';
    let city = defaultCity;
    let industry = defaultIndustry;
    let website = '';
    let googleProfile = '';
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
        case 'googleProfile':
          googleProfile = val;
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
      poorGoogleProfile: !googleProfile,
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
      groupName: groupName.trim() || 'General Leads',
      sheetName: sheetName.trim() || 'Uploaded Sheet',
      batchId: batchId || `batch-${Date.now()}`,
      website: website || '',
      googleProfile: googleProfile || '',
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
      'Category / Group': l.groupName || 'General Leads',
      'Sheet / Source': l.sheetName || 'Uploaded Sheet',
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
