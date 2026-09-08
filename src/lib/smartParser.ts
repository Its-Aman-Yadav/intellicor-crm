import { cleanPhoneNumber } from './whatsapp';

export type DetectedField =
  | 'businessName'
  | 'ownerName'
  | 'phone'
  | 'city'
  | 'industry'
  | 'website'
  | 'instagram'
  | 'notes'
  | 'skip';

export const DETECTED_FIELD_LABELS: Record<DetectedField, string> = {
  businessName: '🏢 Business Name',
  ownerName: '👤 Owner / Contact',
  phone: '📞 Phone / Mobile',
  city: '📍 City / Location',
  industry: '🏷️ Industry / Category',
  website: '🌐 Website URL',
  instagram: '📸 Instagram',
  notes: '📝 Notes / Requirement',
  skip: '🚫 Skip this column',
};

export const COMMON_INDIAN_CITIES = new Set([
  'mumbai', 'delhi', 'new delhi', 'ncr', 'gurgaon', 'gurugram', 'noida', 'faridabad', 'ghaziabad',
  'bengaluru', 'bangalore', 'pune', 'hyderabad', 'chennai', 'kolkata', 'ahmedabad', 'surat',
  'jaipur', 'lucknow', 'kanpur', 'nagpur', 'indore', 'thane', 'bhopal', 'visakhapatnam',
  'patna', 'vadodara', 'ludhiana', 'agra', 'nashik', 'meerut', 'rajkot', 'varanasi', 'srinagar',
  'aurangabad', 'dhanbad', 'amritsar', 'navi mumbai', 'allahabad', 'prayagraj', 'ranchi', 'howrah',
  'coimbatore', 'jabalpur', 'gwalior', 'vijayawada', 'jodhpur', 'madurai', 'raipur', 'kota',
  'chandigarh', 'guwahati', 'solapur', 'hubli', 'dharwad', 'bareilly', 'mysore', 'mysuru',
  'tiruchirappalli', 'dehradun', 'kochi', 'cochin', 'mangalore', 'mangaluru', 'panaji', 'goa',
  'trichy', 'salem', 'tiruppur', 'bhubaneswar', 'cuttack', 'pondicherry', 'puducherry', 'shimla',
  'jammu', 'udaipur', 'ajmer', 'bikaner', 'alwar', 'haridwar', 'rishikesh', 'mathura', 'gaya',
  'siliguri', 'asansol', 'kolhapur', 'sangli', 'belgaum', 'belagavi', 'warangal', 'tirupati',
]);

const BUSINESS_KEYWORDS = [
  'clinic', 'dental', 'hospital', 'dentist', 'healthcare', 'care', 'med', 'pharma', 'diagnostics',
  'salon', 'spa', 'beauty', 'hair', 'parlour', 'parlor', 'barber', 'makeup',
  'cafe', 'coffee', 'restaurant', 'pizzeria', 'bistro', 'diner', 'kitchen', 'dhaba', 'bakery', 'sweets', 'hotel', 'resort',
  'gym', 'fitness', 'crossfit', 'yoga', 'pilates', 'studio', 'martial',
  'interiors', 'interior', 'architects', 'architect', 'designs', 'design', 'decors', 'decor', 'furniture',
  'realty', 'real estate', 'properties', 'realtors', 'builders', 'developers', 'estates',
  'boutique', 'fashion', 'apparels', 'textiles', 'garments', 'tailors', 'couture', 'collections',
  'jewellers', 'jewellery', 'goldsmith', 'diamonds',
  'enterprises', 'solutions', 'technologies', 'infotech', 'services', 'agency', 'consultants', 'consultancy',
  'pvt', 'ltd', 'llp', 'inc', 'co', 'corp', 'industries', 'group', 'associates',
  'motors', 'auto', 'automotive', 'garage', 'tyres', 'spares',
  'classes', 'academy', 'institute', 'school', 'tutorials', 'coaching',
  'law', 'legal', 'advocates', 'associates', 'ca', 'consultants',
  'store', 'shop', 'mart', 'supermarket', 'emporium', 'traders',
];

const OWNER_PREFIXES = [
  'dr.', 'dr ', 'doctor', 'mr.', 'mr ', 'mrs.', 'mrs ', 'ms.', 'ms ', 'shri', 'advocate', 'adv.', 'ca ', 'prof.'
];

export interface ColumnAnalysis {
  index: number;
  detectedType: DetectedField;
  confidence: 'High' | 'Medium' | 'Low';
  score: number;
  sampleValues: string[];
}

export interface SmartParseResult {
  hasHeader: boolean;
  mappings: DetectedField[];
  analysis: ColumnAnalysis[];
}

/**
 * Robust row parser supporting tab, comma (with quotes), semicolon, pipe, or space-separated with phone
 */
export function splitRowIntoCells(line: string): string[] {
  // Tab-separated (Excel / Sheets copy-paste)
  if (line.includes('\t')) {
    return line.split('\t').map((c) => c.trim());
  }

  // Semicolon-separated (European Excel CSV)
  if (line.includes(';') && !line.includes(',')) {
    return line.split(';').map((c) => c.trim());
  }

  // Comma parsing respecting quotes
  if (line.includes(',')) {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    result.push(cur.trim());
    return result;
  }

  if (line.includes('|')) {
    return line.split('|').map((c) => c.trim());
  }

  if (line.includes(' - ')) {
    return line.split(' - ').map((c) => c.trim());
  }

  // Fallback: search for phone number in line and split around it
  const phoneMatch = line.match(/(\+?\d[\d\s-]{8,}\d)/);
  if (phoneMatch && phoneMatch.index !== undefined) {
    const before = line.substring(0, phoneMatch.index).trim();
    const phone = phoneMatch[0].trim();
    const after = line.substring(phoneMatch.index + phoneMatch[0].length).trim();
    return [before, phone, after].filter((p) => p.length > 0);
  }

  return [line.trim()];
}

/**
 * Intelligent detector that automatically determines column types
 * by analyzing header strings AND actual data patterns
 */
export function detectColumnTypes(matrix: string[][]): SmartParseResult {
  if (matrix.length === 0) {
    return { hasHeader: false, mappings: [], analysis: [] };
  }

  const numCols = Math.max(...matrix.map((r) => r.length));
  const firstRow = matrix[0] || [];

  // 1. Check if first row is a header row
  let headerMatchesCount = 0;
  firstRow.forEach((cell) => {
    const lower = cell.toLowerCase().trim();
    if (
      lower.includes('name') ||
      lower.includes('business') ||
      lower.includes('company') ||
      lower.includes('phone') ||
      lower.includes('mobile') ||
      lower.includes('contact') ||
      lower.includes('city') ||
      lower.includes('location') ||
      lower.includes('address') ||
      lower.includes('industry') ||
      lower.includes('category') ||
      lower.includes('website') ||
      lower.includes('url') ||
      lower.includes('notes') ||
      lower.includes('remark') ||
      lower.includes('instagram') ||
      lower.includes('status')
    ) {
      headerMatchesCount++;
    }
  });

  // A row is a header if it matched header keywords and does NOT look like actual phone numbers
  const hasHeader =
    headerMatchesCount >= 1 &&
    !firstRow.some((c) => c.replace(/\D/g, '').length >= 10);

  const dataRows = hasHeader ? matrix.slice(1) : matrix;

  const analysis: ColumnAnalysis[] = [];
  const mappings: DetectedField[] = [];
  const assignedTypes = new Set<DetectedField>();

  for (let colIdx = 0; colIdx < numCols; colIdx++) {
    const headerName = hasHeader ? (firstRow[colIdx] || '').toLowerCase().trim() : '';
    const colValues = dataRows
      .map((r) => (r[colIdx] || '').trim())
      .filter((v) => v.length > 0);

    // Heuristics scores
    let phoneScore = 0;
    let webScore = 0;
    let igScore = 0;
    let cityScore = 0;
    let bizScore = 0;
    let ownerScore = 0;
    let indScore = 0;
    let noteScore = 0;

    // A. Header Keyword Analysis (Strong Signals)
    if (
      headerName.includes('phone') ||
      headerName.includes('mobile') ||
      headerName.includes('contact no') ||
      headerName.includes('whatsapp') ||
      headerName.includes('tel') ||
      headerName.includes('cell') ||
      headerName === 'ph'
    ) {
      phoneScore += 80;
    }

    if (
      headerName.includes('website') ||
      headerName.includes('url') ||
      headerName.includes('domain') ||
      headerName.includes('site') ||
      headerName.includes('link')
    ) {
      webScore += 80;
    }

    if (
      headerName.includes('instagram') ||
      headerName.includes('insta') ||
      headerName === 'ig'
    ) {
      igScore += 80;
    }

    if (
      headerName.includes('city') ||
      headerName.includes('location') ||
      headerName.includes('address') ||
      headerName.includes('area') ||
      headerName.includes('town')
    ) {
      cityScore += 80;
    }

    if (
      headerName.includes('business') ||
      headerName.includes('company') ||
      headerName.includes('firm') ||
      headerName.includes('shop') ||
      headerName.includes('store') ||
      headerName.includes('clinic') ||
      headerName.includes('brand') ||
      headerName.includes('account')
    ) {
      bizScore += 75;
    }

    if (
      headerName.includes('owner') ||
      headerName.includes('person') ||
      headerName.includes('contact name') ||
      headerName.includes('founder') ||
      headerName.includes('director') ||
      headerName.includes('client name')
    ) {
      ownerScore += 75;
    } else if (headerName === 'name' || headerName === 'full name') {
      // Could be owner or business, give base boost to both
      bizScore += 40;
      ownerScore += 40;
    }

    if (
      headerName.includes('industry') ||
      headerName.includes('category') ||
      headerName.includes('type') ||
      headerName.includes('niche') ||
      headerName.includes('sector')
    ) {
      indScore += 80;
    }

    if (
      headerName.includes('note') ||
      headerName.includes('remark') ||
      headerName.includes('comment') ||
      headerName.includes('requirement') ||
      headerName.includes('detail')
    ) {
      noteScore += 80;
    }

    // B. Value Pattern Inspection across sample rows (Up to 25 sample cells)
    const samples = colValues.slice(0, 25);
    samples.forEach((val) => {
      const lower = val.toLowerCase();
      const digitsOnly = val.replace(/\D/g, '');

      // 1. Phone number checking (Indian 10-digit mobile, +91, landline formats)
      if (
        (digitsOnly.length >= 10 && digitsOnly.length <= 13) &&
        (lower.startsWith('+91') || lower.startsWith('91') || lower.startsWith('0') || /^[6-9]\d{9}/.test(digitsOnly))
      ) {
        phoneScore += 40;
      } else if (digitsOnly.length >= 8 && digitsOnly.length <= 14) {
        phoneScore += 20;
      }

      // 2. Website URL checking
      if (
        !lower.includes('@') &&
        (lower.startsWith('http://') ||
          lower.startsWith('https://') ||
          lower.startsWith('www.') ||
          /\.(com|in|co\.in|org|net|io|store|online|tech|biz|info)(\/|$)/.test(lower))
      ) {
        webScore += 45;
      }

      // 3. Instagram checking
      if (lower.includes('instagram.com') || lower.includes('instagr.am')) {
        igScore += 45;
      } else if (val.startsWith('@') && !val.includes(' ') && val.length > 2 && val.length < 35) {
        igScore += 35;
      }

      // 4. City checking
      if (COMMON_INDIAN_CITIES.has(lower)) {
        cityScore += 40;
      } else if (
        lower.endsWith('nagar') ||
        lower.endsWith('pur') ||
        lower.endsWith('bad') ||
        lower.endsWith(' road') ||
        lower.endsWith(' street')
      ) {
        cityScore += 20;
      }

      // 5. Industry keywords
      if (
        BUSINESS_KEYWORDS.some((kw) => lower === kw || lower.includes(kw)) &&
        val.length <= 25
      ) {
        indScore += 20;
      }

      // 6. Owner name honorifics
      if (OWNER_PREFIXES.some((p) => lower.startsWith(p))) {
        ownerScore += 30;
      }

      // 7. Business name indicator words
      if (BUSINESS_KEYWORDS.some((kw) => lower.includes(kw))) {
        bizScore += 20;
      }

      // 8. General name check (non-numeric text)
      if (val.length >= 3 && val.length <= 60 && digitsOnly.length < 4 && !lower.startsWith('http')) {
        if (!lower.includes('.') || OWNER_PREFIXES.some((p) => lower.startsWith(p))) {
          bizScore += 6;
          ownerScore += 6;
        }
      }

      // 9. Notes / Comments check (long strings)
      if (val.length > 50 || lower.includes('interested') || lower.includes('quoted') || lower.includes('call back')) {
        noteScore += 25;
      }
    });

    // Score comparison for this column
    const scores: { field: DetectedField; score: number }[] = [
      { field: 'phone', score: phoneScore },
      { field: 'website', score: webScore },
      { field: 'instagram', score: igScore },
      { field: 'city', score: cityScore },
      { field: 'industry', score: indScore },
      { field: 'ownerName', score: ownerScore },
      { field: 'businessName', score: bizScore },
      { field: 'notes', score: noteScore },
    ];

    scores.sort((a, b) => b.score - a.score);
    const top = scores[0];

    let fieldAssigned: DetectedField = 'notes';
    let confidence: 'High' | 'Medium' | 'Low' = 'Low';

    if (top.score >= 20) {
      confidence = top.score >= 50 ? 'High' : top.score >= 30 ? 'Medium' : 'Low';

      // Avoid assigning phone/website/instagram/city more than once unless intentional
      if (top.field === 'phone' && !assignedTypes.has('phone')) {
        fieldAssigned = 'phone';
        assignedTypes.add('phone');
      } else if (top.field === 'website' && !assignedTypes.has('website')) {
        fieldAssigned = 'website';
        assignedTypes.add('website');
      } else if (top.field === 'instagram' && !assignedTypes.has('instagram')) {
        fieldAssigned = 'instagram';
        assignedTypes.add('instagram');
      } else if (top.field === 'city' && !assignedTypes.has('city')) {
        fieldAssigned = 'city';
        assignedTypes.add('city');
      } else if (top.field === 'industry' && !assignedTypes.has('industry')) {
        fieldAssigned = 'industry';
        assignedTypes.add('industry');
      } else if (top.field === 'ownerName' && !assignedTypes.has('ownerName')) {
        fieldAssigned = 'ownerName';
        assignedTypes.add('ownerName');
      } else if (top.field === 'businessName' && !assignedTypes.has('businessName')) {
        fieldAssigned = 'businessName';
        assignedTypes.add('businessName');
      } else if (!assignedTypes.has('businessName') && top.field !== 'phone') {
        fieldAssigned = 'businessName';
        assignedTypes.add('businessName');
      } else if (!assignedTypes.has('ownerName') && top.field !== 'phone') {
        fieldAssigned = 'ownerName';
        assignedTypes.add('ownerName');
      } else {
        fieldAssigned = 'notes';
      }
    } else {
      // Default heuristic sequence if score is very low
      if (!assignedTypes.has('businessName')) {
        fieldAssigned = 'businessName';
        assignedTypes.add('businessName');
      } else if (!assignedTypes.has('phone')) {
        fieldAssigned = 'phone';
        assignedTypes.add('phone');
      } else if (!assignedTypes.has('city')) {
        fieldAssigned = 'city';
        assignedTypes.add('city');
      } else {
        fieldAssigned = 'notes';
      }
    }

    mappings.push(fieldAssigned);
    analysis.push({
      index: colIdx,
      detectedType: fieldAssigned,
      confidence,
      score: top.score,
      sampleValues: samples.slice(0, 3),
    });
  }

  // Safety Pass 1: Ensure at least one 'phone' column exists if there is any column with digits
  if (!mappings.includes('phone')) {
    let bestPhoneIdx = -1;
    let maxDigits = 0;
    for (let c = 0; c < numCols; c++) {
      let dCount = 0;
      dataRows.slice(0, 15).forEach((r) => {
        if ((r[c] || '').replace(/\D/g, '').length >= 10) dCount++;
      });
      if (dCount > maxDigits) {
        maxDigits = dCount;
        bestPhoneIdx = c;
      }
    }
    if (bestPhoneIdx !== -1) {
      mappings[bestPhoneIdx] = 'phone';
      if (analysis[bestPhoneIdx]) {
        analysis[bestPhoneIdx].detectedType = 'phone';
        analysis[bestPhoneIdx].confidence = 'Medium';
      }
    }
  }

  // Safety Pass 2: Ensure at least one 'businessName' column exists
  if (!mappings.includes('businessName')) {
    const firstNonPhoneIdx = mappings.findIndex((m) => m !== 'phone');
    if (firstNonPhoneIdx !== -1) {
      mappings[firstNonPhoneIdx] = 'businessName';
      if (analysis[firstNonPhoneIdx]) {
        analysis[firstNonPhoneIdx].detectedType = 'businessName';
      }
    } else {
      mappings[0] = 'businessName';
    }
  }

  return { hasHeader, mappings, analysis };
}

