'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Lead, INDUSTRIES, ScoringSignals } from '@/types/crm';
import { calculateLeadScore, determineLeadPriority } from '@/lib/scoring';
import { cleanPhoneNumber } from '@/lib/whatsapp';
import {
  splitRowIntoCells,
  detectColumnTypes,
  DetectedField,
  DETECTED_FIELD_LABELS,
} from '@/lib/smartParser';
import {
  X,
  ClipboardPaste,
  CheckCircle2,
  AlertCircle,
  Users,
  MapPin,
  Briefcase,
  Sparkles,
  SlidersHorizontal,
  ArrowRight,
  HelpCircle,
  UploadCloud,
  FileText,
} from 'lucide-react';

interface BulkPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportLeads: (newLeads: Lead[]) => void;
  activeRep: string;
}

export default function BulkPasteModal({
  isOpen,
  onClose,
  onImportLeads,
  activeRep,
}: BulkPasteModalProps) {
  const [pasteText, setPasteText] = useState('');
  const [defaultCity, setDefaultCity] = useState('Mumbai');
  const [defaultIndustry, setDefaultIndustry] = useState<string>('Other Local Business');
  const [assignedRep, setAssignedRep] = useState(
    activeRep !== 'All' && activeRep !== 'All Reps' ? activeRep : 'Aman'
  );
  const [assumeNoWebsite, setAssumeNoWebsite] = useState(true);
  const [scheduleForToday, setScheduleForToday] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual column overrides if user changes them
  const [customMappings, setCustomMappings] = useState<Record<number, DetectedField>>({});
  const [overrideHasHeader, setOverrideHasHeader] = useState<boolean | null>(null);

  // 1. Split raw text into matrix of rows and cells
  const rawMatrix = useMemo(() => {
    if (!pasteText.trim()) return [];
    return pasteText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => splitRowIntoCells(line));
  }, [pasteText]);

  // 2. Run smart column detection engine
  const detection = useMemo(() => {
    return detectColumnTypes(rawMatrix);
  }, [rawMatrix]);

  const hasHeader = overrideHasHeader !== null ? overrideHasHeader : detection.hasHeader;

  // Active mappings (auto-detected merged with any user manual adjustments)
  const activeMappings: DetectedField[] = useMemo(() => {
    return detection.mappings.map((detected, idx) => {
      return customMappings[idx] !== undefined ? customMappings[idx] : detected;
    });
  }, [detection.mappings, customMappings]);

  // 3. Process data rows with the smart mappings
  const parsedData = useMemo(() => {
    if (rawMatrix.length === 0) return [];
    const dataRows = hasHeader ? rawMatrix.slice(1) : rawMatrix;

    return dataRows.map((cells, rowIdx) => {
      let bName = '';
      let oName = '';
      let phone = '';
      let city = '';
      let industry = defaultIndustry;
      let website = '';
      let instagram = '';
      let notes = '';

      cells.forEach((cellVal, colIdx) => {
        const field = activeMappings[colIdx] || 'skip';
        const val = cellVal.trim();
        if (!val) return;

        switch (field) {
          case 'businessName':
            bName = val;
            break;
          case 'ownerName':
            oName = val;
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

      // Validation
      const digitsOnly = phone.replace(/\D/g, '');
      const hasValidPhone = digitsOnly.length >= 10;
      const hasValidName = bName.length >= 2 || oName.length >= 2;

      let error = '';
      if (!hasValidPhone && !hasValidName) {
        error = 'Missing valid name & phone number';
      } else if (!hasValidPhone) {
        error = 'Phone number missing or < 10 digits';
      } else if (!hasValidName) {
        error = 'Missing business or client name';
      }

      return {
        id: `bulk-row-${rowIdx}`,
        businessName: bName || oName || phone,
        ownerName: oName || bName,
        phone,
        city: city || defaultCity,
        industry,
        website,
        instagram,
        notes,
        isValid: hasValidPhone && hasValidName,
        error: error || undefined,
      };
    });
  }, [rawMatrix, hasHeader, activeMappings, defaultCity, defaultIndustry]);

  const validRows = parsedData.filter((r) => r.isValid);
  const invalidRows = parsedData.filter((r) => !r.isValid);

  const handleColumnChange = (colIdx: number, newField: DetectedField) => {
    setCustomMappings((prev) => ({
      ...prev,
      [colIdx]: newField,
    }));
  };

  const handleImport = () => {
    if (validRows.length === 0) {
      alert('No valid leads found to import. Please check column mappings or pasted text.');
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();

    const newLeads: Lead[] = validRows.map((row, idx) => {
      const signals: ScoringSignals = {
        noWebsite: !row.website && assumeNoWebsite,
        badWebsite: false,
        poorGoogleProfile: false,
        inactiveInstagram: !row.instagram,
        goodBusinessReputation: true,
        clearlySpendsOnMarketing: false,
        multipleBranches: false,
      };

      const score = calculateLeadScore(signals);
      const priority = determineLeadPriority(score);
      const cleaned = cleanPhoneNumber(row.phone);

      return {
        id: `lead-bulk-${Date.now()}-${idx}`,
        businessName: row.businessName,
        ownerName: row.ownerName,
        phone:
          cleaned.startsWith('91') && cleaned.length === 12
            ? `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`
            : row.phone,
        city: row.city,
        industry: row.industry || defaultIndustry,
        website: row.website,
        googleProfile: '',
        instagram: row.instagram,
        signals,
        score,
        priority,
        status: 'New',
        call1Date: undefined,
        requirement: row.notes || 'Raw contact imported. Call 1 qualification needed.',
        whatsappSent: false,
        demoSent: false,
        followUpDate: scheduleForToday ? todayStr : undefined,
        packageRecommended: !row.website && assumeNoWebsite ? 'Starter' : 'Growth',
        quotationStatus: 'Not Sent',
        expectedValue: !row.website && assumeNoWebsite ? 10000 : 18000,
        notes: row.notes
          ? `${row.notes} (Imported via Smart Bulk Paste on ${todayStr})`
          : `Imported via Smart Bulk Paste on ${todayStr}.`,
        callLogs: [],
        assignedRep,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
    });

    onImportLeads(newLeads);
    onClose();
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setPasteText(text);
        setCustomMappings({});
        setOverrideHasHeader(null);
      }
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFile(file);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      readFile(file);
    }
  };

  const handleLoadSample = (type: 'standard' | 'reversed' | 'messy') => {
    if (type === 'standard') {
      setPasteText(
        `Business Name\tMobile\tCity\tWebsite\nApex Dental Clinic\t9820144521\tMumbai\thttp://apexdental.in\nBlissful Glow Salon\t9930278119\tBengaluru\t\nUrban Crust Pizzeria\t9811055432\tDelhi NCR\thttps://urbancrust.co.in\nIronFit Studio\t9845011982\tPune\t`
      );
    } else if (type === 'reversed') {
      // Phone first, Name second! Tests auto-detection
      setPasteText(
        `9820199881\tDr. Anita Verma Clinic\tMumbai\n9830211445\tRoyal Touch Salon\tDelhi NCR\n9831122334\tKolkata Chai Cafe\tKolkata\n9765433211\tCrafted Interiors\tPune`
      );
    } else {
      // Just name and number copied from WhatsApp or notes without delimiters
      setPasteText(
        `Dr. Rajesh Sharma 9820144521\nSneha Salon & Spa 9930278119\nChai Point Cafe 9811055432\nFitZone Gym 9845011982\nMetro Diagnostics 9876543210`
      );
    }
    setCustomMappings({});
    setOverrideHasHeader(null);
  };


  // Rule of Hooks safe guard: placed at the end after all hooks have run unconditionally
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content bulk-paste-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="icon-badge">
              <ClipboardPaste size={20} />
            </div>
            <div>
              <div className="badge-smart-row">
                <h2 className="modal-title">Smart Bulk Lead Importer</h2>
                <span className="smart-badge">
                  <Sparkles size={11} /> Auto-Detect Columns
                </span>
              </div>
              <p className="modal-sub">
                Paste any messy data from Excel, Google Sheets, or WhatsApp — the CRM automatically identifies phone numbers, names, cities, and websites!
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon btn-secondary">
            <X size={16} />
          </button>
        </div>

        {/* Global Batch Settings */}
        <div className="batch-settings card">
          <div className="form-grid-3">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <span className="label-icon"><MapPin size={12} /> Default City</span>
              </label>
              <input
                type="text"
                value={defaultCity}
                onChange={(e) => setDefaultCity(e.target.value)}
                placeholder="e.g. Mumbai, Delhi NCR"
                className="form-input form-input-sm"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <span className="label-icon"><Briefcase size={12} /> Default Industry</span>
              </label>
              <select
                value={defaultIndustry}
                onChange={(e) => setDefaultIndustry(e.target.value)}
                className="form-select form-input-sm"
              >
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <span className="label-icon"><Users size={12} /> Assign to Rep</span>
              </label>
              <select
                value={assignedRep}
                onChange={(e) => setAssignedRep(e.target.value)}
                className="form-select form-input-sm"
              >
                <option value="Aman">Aman</option>
                <option value="Priya">Priya</option>
                <option value="Rahul">Rahul</option>
                <option value="Arjun">Arjun</option>
              </select>
            </div>
          </div>

          <div className="batch-toggles-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={assumeNoWebsite}
                onChange={(e) => setAssumeNoWebsite(e.target.checked)}
              />
              <span>Assume &quot;No Website&quot; (+3 pts) if website column is blank</span>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={scheduleForToday}
                onChange={(e) => setScheduleForToday(e.target.checked)}
              />
              <span>Set Follow-up to <strong>Today</strong> (direct into Today&apos;s Dialing Queue)</span>
            </label>
          </div>
        </div>

        {/* Paste Textarea */}
        <div
          className={`paste-area-wrapper ${isDragging ? 'drag-active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="paste-label-row">
            <label className="form-label" style={{ margin: 0 }}>
              Paste raw data (supports columns in <strong>any order</strong>, comma/tab separated):
            </label>
            <div className="sample-btn-group">
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv, .tsv, .txt"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="sample-btn upload-file-btn"
                title="Upload CSV, TSV, or TXT file"
              >
                <UploadCloud size={12} /> Upload File
              </button>
              <span className="sample-label">Try sample:</span>
              <button
                type="button"
                onClick={() => handleLoadSample('standard')}
                className="sample-btn"
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample('reversed')}
                className="sample-btn"
                title="Phone number in first column"
              >
                Phone First
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample('messy')}
                className="sample-btn"
                title="Messy names & numbers without headers or commas"
              >
                Messy Leads
              </button>
            </div>
          </div>

          <div className="textarea-container">
            <textarea
              rows={5}
              placeholder={`Paste columns here directly from Excel, Google Sheets, or WhatsApp (or drag & drop a .csv file).
The smart engine will automatically recognize which column is Business Name, Phone Number, City, or Website!`}
              value={pasteText}
              onChange={(e) => {
                setPasteText(e.target.value);
                setCustomMappings({});
                setOverrideHasHeader(null);
              }}
              className="form-textarea paste-textarea"
            />
            {isDragging && (
              <div className="drag-overlay">
                <UploadCloud size={32} />
                <span>Drop CSV or text file here to auto-detect columns</span>
              </div>
            )}
          </div>
        </div>

        {/* SMART COLUMN MAPPING CARD (Auto-detected) */}
        {activeMappings.length > 0 && (
          <div className="column-mapper-card card">
            <div className="mapper-header">
              <div className="mapper-title-row">
                <Sparkles size={15} className="sparkles-icon" />
                <span className="mapper-title">
                  Auto-Detected {activeMappings.length} Columns
                </span>
              </div>
              <label className="checkbox-label" style={{ fontSize: '0.75rem' }}>
                <input
                  type="checkbox"
                  checked={hasHeader}
                  onChange={(e) => setOverrideHasHeader(e.target.checked)}
                />
                <span>First line is header row (skip header)</span>
              </label>
            </div>

            {/* Auto-Detection Summary Bar */}
            <div className="auto-detect-summary-bar">
              <span className="summary-title">💡 Auto-Matched:</span>
              <div className="summary-pills-wrap">
                {activeMappings.map((field, idx) => {
                  const analysisItem = detection.analysis?.[idx];
                  return (
                    <div key={idx} className={`summary-pill pill-${field}`}>
                      <span className="pill-col">Col {idx + 1}:</span>
                      <span className="pill-name">{DETECTED_FIELD_LABELS[field]}</span>
                      {analysisItem && (
                        <span className={`pill-conf conf-${analysisItem.confidence.toLowerCase()}`}>
                          {analysisItem.confidence}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="columns-grid">
              {activeMappings.map((assignedField, idx) => {
                const sampleCell = rawMatrix[hasHeader ? 1 : 0]?.[idx] || '';
                const analysisItem = detection.analysis?.[idx];
                return (
                  <div key={idx} className="col-map-item">
                    <div className="col-meta-row">
                      <span className="col-num">Column {idx + 1}</span>
                      {analysisItem && (
                        <span className={`conf-chip conf-${analysisItem.confidence.toLowerCase()}`}>
                          {analysisItem.confidence} Conf.
                        </span>
                      )}
                    </div>
                    {sampleCell && (
                      <div className="col-sample-preview" title={sampleCell}>
                        &quot;{sampleCell.slice(0, 20)}&quot;
                      </div>
                    )}
                    <select
                      value={assignedField}
                      onChange={(e) =>
                        handleColumnChange(idx, e.target.value as DetectedField)
                      }
                      className={`form-select col-select ${
                        assignedField === 'phone'
                          ? 'highlight-phone'
                          : assignedField === 'businessName'
                          ? 'highlight-name'
                          : ''
                      }`}
                    >
                      {Object.entries(DETECTED_FIELD_LABELS).map(([k, label]) => (
                        <option key={k} value={k}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* LIVE PARSED PREVIEW */}
        {parsedData.length > 0 && (
          <div className="preview-container card">
            <div className="preview-header">
              <span className="preview-title">
                Ready to Import: <strong>{validRows.length} valid leads</strong>
                {invalidRows.length > 0 && (
                  <span className="invalid-count"> ({invalidRows.length} errors)</span>
                )}
              </span>
              <span className="preview-hint">
                Auto-assigned to <strong>{assignedRep}</strong>
              </span>
            </div>

            <div className="preview-table-wrapper">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Business Name</th>
                    <th>Cleaned Phone</th>
                    <th>City</th>
                    <th>Website</th>
                    <th>Score / Priority</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((r, i) => (
                    <tr key={i} className={r.isValid ? '' : 'error-row'}>
                      <td>{i + 1}</td>
                      <td>
                        <strong>{r.businessName}</strong>
                        {r.error && <span className="row-error-msg">{r.error}</span>}
                      </td>
                      <td>
                        <span className="phone-code">{r.phone || '—'}</span>
                      </td>
                      <td>{r.city}</td>
                      <td>
                        {r.website ? (
                          <span className="website-link">{r.website}</span>
                        ) : (
                          <span className="text-muted">None</span>
                        )}
                      </td>
                      <td>
                        {r.isValid ? (
                          <span
                            className={`badge ${
                              !r.website && assumeNoWebsite
                                ? 'badge-warm'
                                : 'badge-cold'
                            }`}
                          >
                            {!r.website && assumeNoWebsite
                              ? '⚡ WARM (5 pts)'
                              : '❄️ COLD (2 pts)'}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        {r.isValid ? (
                          <span className="stage-pill New">New</span>
                        ) : (
                          <span className="text-danger">Invalid</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            disabled={validRows.length === 0}
            onClick={handleImport}
            className="btn btn-primary import-btn"
          >
            <CheckCircle2 size={16} /> Import {validRows.length} Smart-Detected Leads
          </button>
        </div>
      </div>

      <style jsx>{`
        .bulk-paste-dialog {
          max-width: 860px;
          padding: 1.5rem;
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border);
          padding-bottom: 0.85rem;
          margin-bottom: 1rem;
        }
        .modal-header-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .badge-smart-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .smart-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.68rem;
          font-weight: 700;
          color: #7e22ce;
          background: #faf5ff;
          border: 1px solid #e9d5ff;
          padding: 0.15rem 0.45rem;
          border-radius: var(--radius-full);
        }
        .icon-badge {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background: #eff6ff;
          color: var(--brand-blue);
          border: 1px solid var(--brand-border);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--brand-navy);
        }
        .modal-sub {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .batch-settings {
          background: #f8fafc;
          padding: 1rem;
          margin-bottom: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .label-icon {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
        }
        .form-input-sm {
          padding: 0.4rem 0.6rem;
          font-size: 0.82rem;
        }
        .batch-toggles-row {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          flex-wrap: wrap;
          padding-top: 0.4rem;
          border-top: 1px solid var(--border-subtle);
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.8rem;
          color: var(--text-secondary);
          cursor: pointer;
        }
        .paste-area-wrapper {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          margin-bottom: 1rem;
        }
        .paste-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.4rem;
        }
        .sample-btn-group {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .sample-label {
          font-size: 0.72rem;
          color: var(--text-muted);
        }
        .sample-btn {
          background: #f1f5f9;
          border: 1px solid var(--border);
          color: var(--brand-blue);
          font-size: 0.72rem;
          font-weight: 600;
          cursor: pointer;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          transition: all 0.12s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
        }
        .sample-btn:hover {
          background: var(--brand-light);
          border-color: var(--brand-border);
        }
        .upload-file-btn {
          background: #eff6ff;
          border-color: #bfdbfe;
          color: #1d4ed8;
        }
        .upload-file-btn:hover {
          background: #dbeafe;
          border-color: #93c5fd;
        }
        .textarea-container {
          position: relative;
          width: 100%;
        }
        .paste-textarea {
          font-family: var(--font-mono);
          font-size: 0.82rem;
          line-height: 1.45;
          min-height: 105px;
          width: 100%;
        }
        .drag-overlay {
          position: absolute;
          inset: 0;
          background: rgba(239, 246, 255, 0.94);
          border: 2px dashed #3b82f6;
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          color: #1d4ed8;
          font-size: 0.85rem;
          font-weight: 600;
          pointer-events: none;
          z-index: 10;
        }
        .paste-area-wrapper.drag-active {
          opacity: 0.9;
        }
        /* Smart Column Mapper */
        .column-mapper-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 0.85rem 1rem;
          margin-bottom: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          border-radius: var(--radius-md);
        }
        .mapper-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .mapper-title-row {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .sparkles-icon {
          color: #7c3aed;
        }
        .mapper-title {
          font-weight: 700;
          font-size: 0.86rem;
          color: #5b21b6;
        }
        .auto-detect-summary-bar {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #faf5ff;
          border: 1px solid #ede9fe;
          border-radius: 6px;
          padding: 0.4rem 0.65rem;
          flex-wrap: wrap;
        }
        .summary-title {
          font-size: 0.72rem;
          font-weight: 700;
          color: #6b21a8;
        }
        .summary-pills-wrap {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          flex-wrap: wrap;
        }
        .summary-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.7rem;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          border: 1px solid var(--border);
          background: #ffffff;
        }
        .summary-pill.pill-phone {
          border-color: #a7f3d0;
          background: #ecfdf5;
          color: #065f46;
          font-weight: 600;
        }
        .summary-pill.pill-businessName {
          border-color: #bfdbfe;
          background: #eff6ff;
          color: #1e40af;
          font-weight: 600;
        }
        .summary-pill.pill-ownerName {
          border-color: #c7d2fe;
          background: #eef2ff;
          color: #3730a3;
        }
        .summary-pill.pill-city {
          border-color: #fed7aa;
          background: #fff7ed;
          color: #9a3412;
        }
        .summary-pill.pill-website {
          border-color: #bae6fd;
          background: #f0f9ff;
          color: #0369a1;
        }
        .summary-pill.pill-instagram {
          border-color: #fbcfe8;
          background: #fdf2f8;
          color: #9d174d;
        }
        .pill-col {
          color: var(--text-muted);
          font-size: 0.66rem;
        }
        .pill-conf {
          font-size: 0.62rem;
          font-weight: 700;
          padding: 0.05rem 0.25rem;
          border-radius: 3px;
        }
        .pill-conf.conf-high {
          background: #10b981;
          color: #ffffff;
        }
        .pill-conf.conf-medium {
          background: #3b82f6;
          color: #ffffff;
        }
        .pill-conf.conf-low {
          background: #94a3b8;
          color: #ffffff;
        }
        .columns-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 0.65rem;
        }
        .col-map-item {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          background: #ffffff;
          padding: 0.55rem 0.65rem;
          border-radius: var(--radius-sm);
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        }
        .col-meta-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.72rem;
        }
        .col-num {
          font-weight: 700;
          color: var(--brand-navy);
        }
        .conf-chip {
          font-size: 0.64rem;
          font-weight: 600;
          padding: 0.08rem 0.35rem;
          border-radius: 3px;
        }
        .conf-chip.conf-high {
          background: #dcfce7;
          color: #15803d;
        }
        .conf-chip.conf-medium {
          background: #dbeafe;
          color: #1d4ed8;
        }
        .conf-chip.conf-low {
          background: #f1f5f9;
          color: #64748b;
        }
        .col-sample-preview {
          font-size: 0.7rem;
          color: var(--text-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          background: #f8fafc;
          padding: 0.15rem 0.35rem;
          border-radius: 3px;
        }
        .col-select {
          font-size: 0.76rem;
          padding: 0.3rem 0.45rem;
          border-radius: 4px;
          border: 1px solid var(--border);
        }
        .col-select.highlight-phone {
          border-color: #10b981;
          background: #f0fdf4;
          font-weight: 600;
          color: #065f46;
        }
        .col-select.highlight-name {
          border-color: #3b82f6;
          background: #eff6ff;
          font-weight: 600;
          color: #1e40af;
        }
        /* Preview Table */
        .preview-container {
          padding: 0.85rem;
          margin-bottom: 1rem;
          max-height: 220px;
          overflow-y: auto;
        }
        .preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.5rem;
          font-size: 0.8rem;
        }
        .preview-title {
          color: var(--brand-navy);
        }
        .invalid-count {
          color: #dc2626;
          font-weight: 600;
        }
        .preview-hint {
          color: var(--text-muted);
          font-size: 0.75rem;
        }
        .preview-table-wrapper {
          overflow-x: auto;
        }
        .preview-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.78rem;
          text-align: left;
        }
        .preview-table th {
          padding: 0.4rem 0.6rem;
          background: #f1f5f9;
          font-weight: 600;
          color: var(--text-secondary);
          border-bottom: 1px solid var(--border);
        }
        .preview-table td {
          padding: 0.45rem 0.6rem;
          border-bottom: 1px solid var(--border-subtle);
        }
        .phone-code {
          font-family: var(--font-mono);
          color: var(--brand-blue);
        }
        .website-link {
          color: #2563eb;
          font-size: 0.74rem;
        }
        .error-row {
          background: #fff5f5;
        }
        .row-error-msg {
          display: block;
          font-size: 0.7rem;
          color: #dc2626;
        }
        .text-danger {
          color: #dc2626;
          font-weight: 600;
        }
        .text-muted {
          color: var(--text-muted);
        }
        .modal-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid var(--border);
          padding-top: 1rem;
        }
        .import-btn {
          font-weight: 600;
          padding: 0.55rem 1.25rem;
        }
        @media (max-width: 680px) {
          .batch-settings .form-grid-3 {
            grid-template-columns: 1fr;
          }
          .columns-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
