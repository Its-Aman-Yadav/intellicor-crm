'use client';

import React, { useState, useRef, useTransition } from 'react';
import { Lead } from '@/types/crm';
import {
  readSpreadsheetFile,
  parsePastedSpreadsheetText,
  convertMatrixToLeads,
  downloadSampleExcelTemplate,
  ParsedSheetResult,
} from '@/lib/excelParser';
import { DETECTED_FIELD_LABELS, DetectedField } from '@/lib/smartParser';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  PhoneCall,
  Download,
  ClipboardPaste,
  Sparkles,
  ArrowRight,
  MapPin,
  Briefcase,
  Users,
} from 'lucide-react';

interface SimpleBulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportLeads: (newLeads: Lead[], startCallingImmediately?: boolean) => void;
  activeRep: string;
}

export default function SimpleBulkUploadModal({
  isOpen,
  onClose,
  onImportLeads,
  activeRep,
}: SimpleBulkUploadModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pasteText, setPasteText] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsedData, setParsedData] = useState<ParsedSheetResult | null>(null);
  const [customMappings, setCustomMappings] = useState<Record<number, DetectedField>>({});
  const [defaultCity, setDefaultCity] = useState('Mumbai');
  const [defaultIndustry, setDefaultIndustry] = useState('Other Local Business');
  const [assignedRep, setAssignedRep] = useState(
    activeRep !== 'All' && activeRep !== 'All Reps' ? activeRep : 'Aman'
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleFileProcess = async (file: File) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      setFileName(file.name);
      const res = await readSpreadsheetFile(file);
      setParsedData(res);
      setCustomMappings({});
    } catch (err: unknown) {
      console.error('File parsing error:', err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Unable to parse this file. Please verify it is a valid .xlsx, .xls, or .csv file.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
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
      handleFileProcess(file);
    }
  };

  const handleParsePaste = () => {
    if (!pasteText.trim()) {
      setErrorMessage('Please paste some rows from your Excel sheet.');
      return;
    }
    setErrorMessage('');
    try {
      const res = parsePastedSpreadsheetText(pasteText);
      setFileName('Pasted Rows');
      setParsedData(res);
      setCustomMappings({});
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not parse pasted data.');
    }
  };

  const handleMappingChange = (colIdx: number, newField: DetectedField) => {
    setCustomMappings((prev) => ({
      ...prev,
      [colIdx]: newField,
    }));
  };

  const getEffectiveMapping = (colIdx: number): DetectedField => {
    if (customMappings[colIdx] !== undefined) {
      return customMappings[colIdx];
    }
    return parsedData?.detectedMappings[colIdx] || 'skip';
  };

  const handleFinishImport = (startCallingImmediately = false) => {
    if (!parsedData) return;

    startTransition(() => {
      const activeMappings = parsedData.headers.map((_, idx) => getEffectiveMapping(idx));
      const leads = convertMatrixToLeads(parsedData.rawMatrix, {
        mappings: activeMappings,
        hasHeader: parsedData.hasHeader,
        defaultCity,
        defaultIndustry,
        assignedRep,
      });

      if (leads.length === 0) {
        setErrorMessage('No valid contacts found. Please ensure at least one column has phone numbers or business names.');
        return;
      }

      onImportLeads(leads, startCallingImmediately);
      handleReset();
      onClose();
    });
  };

  const handleReset = () => {
    setParsedData(null);
    setFileName('');
    setPasteText('');
    setErrorMessage('');
    setCustomMappings({});
  };

  const effectiveMappingsList = parsedData
    ? parsedData.headers.map((_, idx) => getEffectiveMapping(idx))
    : [];
  const phoneColumnFound = effectiveMappingsList.includes('phone');

  return (
    <div className="upload-modal-backdrop" onClick={onClose}>
      <div
        className="upload-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="upload-modal-header">
          <div className="header-icon-group">
            <div className="header-icon-badge">
              <FileSpreadsheet size={22} className="text-blue" />
            </div>
            <div>
              <h2 className="modal-title">Bulk Upload Excel Leads</h2>
              <p className="modal-subtitle">
                Import client contacts from Excel (.xlsx, .xls) or CSV and start telecalling immediately
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="modal-close-btn"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="upload-modal-body">
          {errorMessage && (
            <div className="alert-error-box">
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {!parsedData ? (
            <>
              {/* Tab Selector */}
              <div className="tab-pill-row">
                <button
                  type="button"
                  className={`tab-pill ${activeTab === 'upload' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('upload');
                    setErrorMessage('');
                  }}
                >
                  <UploadCloud size={16} />
                  <span>Upload Excel / CSV File</span>
                </button>
                <button
                  type="button"
                  className={`tab-pill ${activeTab === 'paste' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('paste');
                    setErrorMessage('');
                  }}
                >
                  <ClipboardPaste size={16} />
                  <span>Paste Cells from Excel</span>
                </button>
              </div>

              {activeTab === 'upload' ? (
                /* Drag & Drop Zone */
                <div
                  className={`upload-dropzone ${isDragging ? 'is-dragging' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".xlsx,.xls,.csv,.tsv"
                    style={{ display: 'none' }}
                  />
                  <div className="dropzone-icon-circle">
                    {isLoading ? (
                      <div className="simple-spinner" />
                    ) : (
                      <FileSpreadsheet size={36} />
                    )}
                  </div>
                  <h3 className="dropzone-heading">
                    {isLoading
                      ? 'Reading spreadsheet...'
                      : 'Choose your Excel (.xlsx, .xls) or CSV file'}
                  </h3>
                  <p className="dropzone-sub">
                    Tap to choose file, or drag and drop spreadsheet here
                  </p>
                  <span className="file-types-tag">
                    Supports .xlsx, .xls, .csv, and tab-separated sheets
                  </span>
                </div>
              ) : (
                /* Paste Box */
                <div className="paste-container">
                  <p className="paste-hint">
                    Open your Excel or Google Sheet, copy the rows (Ctrl+C / Cmd+C), and paste below:
                  </p>
                  <textarea
                    rows={8}
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Business Name&#9;Contact Name&#9;Phone Number&#9;City&#9;Requirement&#10;Apex Dental Clinic&#9;Dr. Rajesh&#9;9876543210&#9;Mumbai&#9;Interested in brochure..."
                    className="paste-textarea"
                  />
                  <div className="paste-actions">
                    <button
                      type="button"
                      onClick={handleParsePaste}
                      disabled={!pasteText.trim()}
                      className="btn-parse-paste"
                    >
                      <Sparkles size={16} />
                      <span>Parse Pasted Rows</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Sample Template & Help */}
              <div className="template-download-row">
                <div className="tip-left">
                  <Sparkles size={15} className="text-amber" />
                  <span>Columns can be in any order. The system automatically detects Name, Phone, City & Notes.</span>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleExcelTemplate}
                  className="download-template-link"
                >
                  <Download size={14} />
                  <span>Download Sample Excel</span>
                </button>
              </div>
            </>
          ) : (
            /* PREVIEW & COLUMN MAPPING VIEW */
            <div className="preview-container">
              {/* Summary Bar */}
              <div className="preview-summary-card">
                <div className="summary-left">
                  <div className="summary-check-icon">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h4 className="summary-title">
                      Found {parsedData.totalRows} leads in {fileName}
                    </h4>
                    <p className="summary-meta">
                      {phoneColumnFound ? (
                        <span className="text-success-badge">✓ Phone number column detected</span>
                      ) : (
                        <span className="text-warning-badge">⚠️ Please select which column has phone numbers</span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn-change-file"
                >
                  Upload Different File
                </button>
              </div>

              {/* Quick Settings Row */}
              <div className="quick-settings-grid">


                <div className="setting-field">
                  <label>
                    <MapPin size={14} /> Default City (if blank in sheet)
                  </label>
                  <input
                    type="text"
                    value={defaultCity}
                    onChange={(e) => setDefaultCity(e.target.value)}
                    placeholder="e.g. Mumbai, Delhi"
                    className="form-input-sm"
                  />
                </div>

                <div className="setting-field">
                  <label>
                    <Briefcase size={14} /> Default Category
                  </label>
                  <input
                    type="text"
                    value={defaultIndustry}
                    onChange={(e) => setDefaultIndustry(e.target.value)}
                    placeholder="e.g. Local Business"
                    className="form-input-sm"
                  />
                </div>
              </div>

              {/* Column Mapping & Preview Table */}
              <div className="column-mapping-section">
                <div className="mapping-header">
                  <span className="mapping-title">Confirm Column Mappings</span>
                  <span className="mapping-sub">Verify what each column in your sheet represents:</span>
                </div>

                <div className="table-wrapper">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th className="th-row-num">#</th>
                        {parsedData.headers.map((hdr, colIdx) => (
                          <th key={colIdx} className="th-col">
                            <div className="th-header-label">{hdr}</div>
                            <select
                              value={getEffectiveMapping(colIdx)}
                              onChange={(e) =>
                                handleMappingChange(colIdx, e.target.value as DetectedField)
                              }
                              className={`mapping-select ${
                                getEffectiveMapping(colIdx) === 'phone'
                                  ? 'select-phone'
                                  : getEffectiveMapping(colIdx) !== 'skip'
                                  ? 'select-active'
                                  : 'select-skip'
                              }`}
                            >
                              {Object.entries(DETECTED_FIELD_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.sampleRows.map((row, rIdx) => (
                        <tr key={rIdx}>
                          <td className="td-row-num">{rIdx + 1}</td>
                          {parsedData.headers.map((_, colIdx) => (
                            <td key={colIdx} className="td-cell">
                              {row[colIdx] || <span className="empty-cell">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="upload-modal-footer">
          <button type="button" onClick={onClose} className="btn-cancel">
            Cancel
          </button>

          {parsedData && (
            <div className="footer-action-buttons">
              <button
                type="button"
                onClick={() => handleFinishImport(false)}
                className="btn-save-list"
              >
                Save to Leads List ({parsedData.totalRows})
              </button>
              <button
                type="button"
                onClick={() => handleFinishImport(true)}
                className="btn-start-calling"
              >
                <PhoneCall size={17} />
                <span>Import & Start Calling 1-by-1 Now!</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .upload-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(11, 29, 51, 0.65);
          backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 1.5rem;
        }
        .upload-modal-card {
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(11, 29, 51, 0.35);
          width: 100%;
          max-width: 880px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: modalAppear 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes modalAppear {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .upload-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.75rem;
          border-bottom: 1px solid #e2e8f0;
          background: #ffffff;
        }
        .header-icon-group {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .header-icon-badge {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0b1d33;
          line-height: 1.3;
        }
        .modal-subtitle {
          font-size: 0.85rem;
          color: #64748b;
          margin-top: 2px;
        }
        .modal-close-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #64748b;
          cursor: pointer;
          transition: all 0.15s;
        }
        .modal-close-btn:hover {
          background: #f1f5f9;
          color: #0b1d33;
        }
        .upload-modal-body {
          padding: 1.5rem 1.75rem;
          overflow-y: auto;
          flex: 1;
        }
        .alert-error-box {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          padding: 0.85rem 1rem;
          border-radius: 10px;
          margin-bottom: 1.25rem;
          font-size: 0.9rem;
        }
        .tab-pill-row {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.25rem;
          background: #f1f5f9;
          padding: 4px;
          border-radius: 10px;
          width: fit-content;
        }
        .tab-pill {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.55rem 1rem;
          border-radius: 8px;
          border: none;
          background: transparent;
          font-size: 0.88rem;
          font-weight: 500;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s;
        }
        .tab-pill.active {
          background: #ffffff;
          color: #1e50bc;
          font-weight: 600;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }
        .upload-dropzone {
          border: 2px dashed #93c5fd;
          background: #f8fbff;
          border-radius: 14px;
          padding: 3rem 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .upload-dropzone:hover,
        .upload-dropzone.is-dragging {
          border-color: #2563eb;
          background: #eff6ff;
          transform: translateY(-1px);
        }
        .dropzone-icon-circle {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: #dbeafe;
          color: #1e50bc;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.25rem;
        }
        .dropzone-heading {
          font-size: 1.15rem;
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 0.4rem;
        }
        .dropzone-sub {
          font-size: 0.9rem;
          color: #64748b;
          margin-bottom: 1rem;
        }
        .file-types-tag {
          font-size: 0.78rem;
          color: #2563eb;
          background: #eff6ff;
          padding: 0.35rem 0.85rem;
          border-radius: 9999px;
          border: 1px solid #bfdbfe;
          font-weight: 500;
        }
        .simple-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #bfdbfe;
          border-top-color: #1e50bc;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        .paste-container {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .paste-hint {
          font-size: 0.88rem;
          color: #475569;
        }
        .paste-textarea {
          width: 100%;
          font-family: var(--font-mono, monospace);
          font-size: 0.85rem;
          padding: 0.85rem;
          border: 1.5px solid #cbd5e1;
          border-radius: 10px;
          background: #f8fafc;
          resize: vertical;
          outline: none;
        }
        .paste-textarea:focus {
          border-color: #2563eb;
          background: #ffffff;
        }
        .paste-actions {
          display: flex;
          justify-content: flex-end;
        }
        .btn-parse-paste {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 1.25rem;
          background: #1e50bc;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
        }
        .btn-parse-paste:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .template-download-row {
          margin-top: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.85rem 1rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 0.85rem;
        }
        .tip-left {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #475569;
        }
        .text-amber {
          color: #d97706;
        }
        .download-template-link {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: transparent;
          border: 1px solid #cbd5e1;
          color: #1e50bc;
          padding: 0.35rem 0.75rem;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          font-size: 0.82rem;
          transition: all 0.15s;
        }
        .download-template-link:hover {
          background: #eff6ff;
          border-color: #93c5fd;
        }

        /* Preview styles */
        .preview-container {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .preview-summary-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 12px;
        }
        .summary-left {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }
        .summary-check-icon {
          color: #15803d;
        }
        .summary-title {
          font-size: 1rem;
          font-weight: 700;
          color: #14532d;
        }
        .summary-meta {
          font-size: 0.82rem;
          margin-top: 2px;
        }
        .text-success-badge {
          color: #166534;
          font-weight: 500;
        }
        .text-warning-badge {
          color: #b45309;
          font-weight: 600;
        }
        .btn-change-file {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          padding: 0.45rem 0.85rem;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 500;
          color: #475569;
          cursor: pointer;
        }
        .btn-change-file:hover {
          background: #f8fafc;
        }
        .quick-settings-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        .setting-field {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .setting-field label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #334155;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .form-input-sm {
          padding: 0.5rem 0.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.88rem;
          background: #ffffff;
          outline: none;
        }
        .form-input-sm:focus {
          border-color: #2563eb;
        }
        .column-mapping-section {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .mapping-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }
        .mapping-title {
          font-size: 0.92rem;
          font-weight: 700;
          color: #0f172a;
        }
        .mapping-sub {
          font-size: 0.78rem;
          color: #64748b;
        }
        .table-wrapper {
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          overflow-x: auto;
          max-height: 260px;
        }
        .preview-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.83rem;
          text-align: left;
        }
        .th-row-num,
        .td-row-num {
          width: 36px;
          text-align: center;
          background: #f8fafc;
          color: #94a3b8;
          font-weight: 500;
          border-right: 1px solid #e2e8f0;
          padding: 0.5rem;
        }
        .th-col {
          padding: 0.65rem 0.75rem;
          background: #f8fafc;
          border-bottom: 2px solid #cbd5e1;
          border-right: 1px solid #e2e8f0;
          vertical-align: top;
        }
        .th-header-label {
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.35rem;
          white-space: nowrap;
        }
        .mapping-select {
          width: 100%;
          font-size: 0.78rem;
          padding: 0.35rem 0.5rem;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          font-weight: 500;
          outline: none;
        }
        .select-phone {
          border-color: #16a34a;
          background: #f0fdf4;
          color: #15803d;
          font-weight: 600;
        }
        .select-active {
          border-color: #2563eb;
          background: #eff6ff;
          color: #1d4ed8;
          font-weight: 600;
        }
        .select-skip {
          background: #f1f5f9;
          color: #94a3b8;
        }
        .td-cell {
          padding: 0.5rem 0.75rem;
          border-bottom: 1px solid #f1f5f9;
          border-right: 1px solid #f1f5f9;
          color: #334155;
          white-space: nowrap;
          max-width: 220px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .empty-cell {
          color: #cbd5e1;
        }

        /* Footer */
        .upload-modal-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.15rem 1.75rem;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
        }
        .btn-cancel {
          background: transparent;
          border: 1px solid #cbd5e1;
          padding: 0.65rem 1.25rem;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          color: #475569;
          cursor: pointer;
        }
        .btn-cancel:hover {
          background: #f1f5f9;
        }
        .footer-action-buttons {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .btn-save-list {
          background: #ffffff;
          border: 1.5px solid #2563eb;
          color: #2563eb;
          padding: 0.65rem 1.25rem;
          border-radius: 9px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-save-list:hover {
          background: #eff6ff;
        }
        .btn-start-calling {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          background: linear-gradient(135deg, #1e50bc, #2563eb);
          color: #ffffff;
          border: none;
          padding: 0.65rem 1.5rem;
          border-radius: 9px;
          font-weight: 600;
          font-size: 0.92rem;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.28);
          transition: all 0.15s;
        }
        .btn-start-calling:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
        }

        @media (max-width: 768px) {
          .upload-modal-backdrop {
            padding: 1rem;
          }
          .upload-modal-card {
            max-height: 92vh;
          }
          .quick-settings-grid {
            grid-template-columns: 1fr 1fr;
          }
          .form-input-sm,
          .mapping-select,
          .paste-textarea {
            font-size: 16px !important;
          }
        }

        @media (max-width: 640px) {
          .upload-modal-backdrop {
            padding: 0.5rem;
            align-items: flex-end;
          }
          .upload-modal-card {
            max-height: 95vh;
            border-bottom-left-radius: 0;
            border-bottom-right-radius: 0;
          }
          .upload-modal-header {
            padding: 0.85rem 1rem;
          }
          .modal-title {
            font-size: 1.1rem;
          }
          .modal-subtitle {
            font-size: 0.78rem;
          }
          .header-icon-badge {
            width: 38px;
            height: 38px;
          }
          .upload-modal-body {
            padding: 0.85rem;
          }
          .tab-pill-row {
            width: 100%;
            display: flex;
          }
          .tab-pill {
            flex: 1;
            justify-content: center;
            padding: 0.45rem 0.35rem;
            font-size: 0.78rem;
            gap: 0.35rem;
          }
          .upload-dropzone {
            padding: 1.75rem 1rem;
          }
          .dropzone-icon-circle {
            width: 56px;
            height: 56px;
            margin-bottom: 0.75rem;
          }
          .dropzone-heading {
            font-size: 1rem;
          }
          .dropzone-sub {
            font-size: 0.82rem;
            margin-bottom: 0.75rem;
          }
          .template-download-row {
            flex-direction: column;
            align-items: stretch;
            gap: 0.65rem;
            margin-top: 1rem;
          }
          .download-template-link {
            justify-content: center;
            min-height: 38px;
          }
          .preview-summary-card {
            flex-direction: column;
            align-items: stretch;
            gap: 0.75rem;
          }
          .btn-change-file {
            width: 100%;
            justify-content: center;
            min-height: 36px;
          }
          .quick-settings-grid {
            grid-template-columns: 1fr;
          }
          .upload-modal-footer {
            flex-direction: column-reverse;
            gap: 0.65rem;
            padding: 0.85rem 1rem;
          }
          .footer-action-buttons {
            width: 100%;
            flex-direction: column;
            gap: 0.5rem;
          }
          .btn-save-list,
          .btn-start-calling,
          .btn-cancel {
            width: 100%;
            justify-content: center;
            min-height: 46px;
            font-size: 0.9rem;
          }
        }
      `}</style>
    </div>
  );
}
