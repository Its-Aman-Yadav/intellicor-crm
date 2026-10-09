'use client';

import React, { useState, useRef, useTransition, useMemo } from 'react';
import { Lead } from '@/types/crm';
import {
  readSpreadsheetFile,
  switchParsedSheet,
  reparseWithHeaderRow,
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
  Folder,
  FolderPlus,
  Maximize2,
  Minimize2,
  Search,
  SlidersHorizontal,
  Table,
  LayoutGrid,
  Check,
  ChevronLeft,
  ChevronRight,
  WrapText,
  AlignLeft,
  RotateCcw,
  Sparkle,
} from 'lucide-react';

interface SimpleBulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportLeads: (newLeads: Lead[], startCallingImmediately?: boolean) => void;
  activeRep: string;
  initialCategory?: string;
  existingCategories?: string[];
}

export default function SimpleBulkUploadModal({
  isOpen,
  onClose,
  onImportLeads,
  activeRep,
  initialCategory = 'Airbnb',
  existingCategories = ['Airbnb', 'Hotels', 'Manufacturing'],
}: SimpleBulkUploadModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pasteText, setPasteText] = useState('');
  const [fileName, setFileName] = useState('');
  const [categoryName, setCategoryName] = useState(initialCategory || 'Airbnb');
  const [sheetName, setSheetName] = useState('');
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
  const [successNotice, setSuccessNotice] = useState('');

  // Enhanced Review State
  const [isMaximized, setIsMaximized] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'cards'>('grid');
  const [wrapText, setWrapText] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState<number | 'all'>(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [showConfigSettings, setShowConfigSettings] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  // Reset categoryName if initialCategory changes
  React.useEffect(() => {
    if (initialCategory) {
      setCategoryName(initialCategory);
    }
  }, [initialCategory]);

  if (!isOpen) return null;

  // Helper to initialize mappings with smart suggestions
  const applySmartMappings = (res: ParsedSheetResult) => {
    const initial: Record<number, DetectedField> = {};
    res.headers.forEach((_, idx) => {
      initial[idx] = res.detectedMappings[idx] || 'skip';
    });
    setCustomMappings(initial);
  };

  const handleFileProcess = async (file: File) => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessNotice('');
    try {
      setFileName(file.name);
      const cleanBase = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[_-]/g, ' ')
        .trim();
      setSheetName(cleanBase || 'Uploaded Sheet');

      // Auto-detect category from file name if possible
      const lowerFile = file.name.toLowerCase();
      if (lowerFile.includes('airbnb') || lowerFile.includes('homestay') || lowerFile.includes('villa')) {
        setCategoryName('Airbnb');
      } else if (lowerFile.includes('hotel') || lowerFile.includes('resort')) {
        setCategoryName('Hotels');
      } else if (lowerFile.includes('manufactur') || lowerFile.includes('industrial') || lowerFile.includes('factory')) {
        setCategoryName('Manufacturing');
      }

      const res = await readSpreadsheetFile(file);
      setParsedData(res);
      applySmartMappings(res);
      setCurrentPage(1);
      setSearchQuery('');

      const detectedCount = res.detectedMappings.filter((m) => m !== 'skip').length;
      if (detectedCount > 0) {
        setSuccessNotice(`✨ Detected ${detectedCount} columns automatically. Review your sheet below and customize mappings if needed.`);
      }
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
    // Reset so selecting the same file again re-triggers onChange
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
      handleFileProcess(file);
    }
  };

  const handleParsePaste = () => {
    if (!pasteText.trim()) {
      setErrorMessage('Please paste some rows from your Excel sheet.');
      return;
    }
    setErrorMessage('');
    setSuccessNotice('');
    try {
      const res = parsePastedSpreadsheetText(pasteText);
      setFileName('Pasted Rows');
      setSheetName(`Pasted Batch - ${new Date().toLocaleDateString('en-GB')}`);
      setParsedData(res);
      applySmartMappings(res);
      setCurrentPage(1);
      setSearchQuery('');

      const detectedCount = res.detectedMappings.filter((m) => m !== 'skip').length;
      if (detectedCount > 0) {
        setSuccessNotice(`✨ Detected ${detectedCount} columns automatically. Review your sheet below.`);
      }
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

  const handleSetAllNotIncluded = () => {
    if (!parsedData) return;
    const allSkip: Record<number, DetectedField> = {};
    parsedData.headers.forEach((_, idx) => {
      allSkip[idx] = 'skip';
    });
    setCustomMappings(allSkip);
    setSuccessNotice('All columns set to Not Included. Select only the columns you want to import.');
  };

  const handleAutoSuggestMappings = () => {
    if (!parsedData) return;
    applySmartMappings(parsedData);
    const detectedCount = parsedData.detectedMappings.filter((m) => m !== 'skip').length;
    setSuccessNotice(`✨ Re-applied auto-detection. ${detectedCount} columns mapped.`);
  };

  const handleSheetTabSwitch = (targetSheetName: string) => {
    if (!parsedData?.workbookBuffer) return;
    try {
      const res = switchParsedSheet(parsedData.workbookBuffer, targetSheetName);
      setParsedData(res);
      setSheetName(targetSheetName);
      applySmartMappings(res);
      setCurrentPage(1);
      setSearchQuery('');
      setErrorMessage('');
      setSuccessNotice(`Switched to sheet "${targetSheetName}" (${res.totalRows} rows, ${res.totalColumns} columns).`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to switch sheet.');
    }
  };

  const handleHeaderRowChange = (newHeaderIndex: number) => {
    if (!parsedData) return;
    try {
      const res = reparseWithHeaderRow(parsedData, newHeaderIndex);
      setParsedData(res);
      applySmartMappings(res);
      setCurrentPage(1);
      setSearchQuery('');
      setErrorMessage('');
      setSuccessNotice(
        newHeaderIndex >= 0
          ? `Headers set from Row ${newHeaderIndex + 1}. Data rows recomputed (${res.totalRows} leads).`
          : `No header row selected. All ${res.totalRows} rows treated as data.`
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update header row.');
    }
  };

  const getEffectiveMapping = (colIdx: number): DetectedField => {
    if (customMappings[colIdx] !== undefined) {
      return customMappings[colIdx];
    }
    return parsedData?.detectedMappings[colIdx] || 'skip';
  };

  const handleFinishImport = (startCallingImmediately = false) => {
    if (!parsedData) return;

    const finalCat = categoryName.trim() || 'General Leads';
    const finalSheet = sheetName.trim() || (fileName || 'Uploaded Sheet');

    startTransition(() => {
      const activeMappings = parsedData.headers.map((_, idx) => getEffectiveMapping(idx));
      const includedMappings = activeMappings.filter((m) => m !== 'skip');

      if (includedMappings.length === 0) {
        setErrorMessage('All columns are currently "Not Included". Please choose which column contains Phone Numbers or Client Names before saving.');
        return;
      }

      const hasPhone = activeMappings.includes('phone');
      if (!hasPhone) {
        const confirmNoPhone = window.confirm(
          'No column is mapped to "📞 Phone / Mobile". Without phone numbers, these contacts cannot be called via Power Dialer. Do you want to proceed anyway?'
        );
        if (!confirmNoPhone) return;
      }

      const leads = convertMatrixToLeads(parsedData.rawMatrix, {
        mappings: activeMappings,
        hasHeader: parsedData.hasHeader,
        headerRowIndex: parsedData.headerRowIndex,
        defaultCity,
        defaultIndustry: finalCat,
        assignedRep,
        groupName: finalCat,
        sheetName: finalSheet,
        batchId: `batch-${Date.now()}`,
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setParsedData(null);
    setFileName('');
    setSheetName('');
    setPasteText('');
    setErrorMessage('');
    setSuccessNotice('');
    setCustomMappings({});
    setCurrentPage(1);
    setSearchQuery('');
    setIsMaximized(false);
  };

  // Derived mappings info
  const effectiveMappingsList = parsedData
    ? parsedData.headers.map((_, idx) => getEffectiveMapping(idx))
    : [];
  const phoneColumnIdx = effectiveMappingsList.indexOf('phone');
  const phoneColumnName = phoneColumnIdx !== -1 ? parsedData?.headers[phoneColumnIdx] : null;
  const nameColumnIdx = effectiveMappingsList.findIndex((m) => m === 'businessName' || m === 'ownerName');
  const nameColumnName = nameColumnIdx !== -1 ? parsedData?.headers[nameColumnIdx] : null;
  const includedCount = effectiveMappingsList.filter((m) => m !== 'skip').length;

  // Filtered and paginated rows
  const allDataRows = parsedData?.dataRows || [];
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim() || !parsedData) return allDataRows;
    const q = searchQuery.toLowerCase().trim();
    return allDataRows.filter((row) =>
      row.some((cell) => (cell || '').toLowerCase().includes(q))
    );
  }, [allDataRows, searchQuery, parsedData]);

  const totalFilteredRows = filteredRows.length;
  const pageSize = rowsPerPage === 'all' ? Math.max(totalFilteredRows, 1) : rowsPerPage;
  const totalPages = Math.max(Math.ceil(totalFilteredRows / pageSize), 1);
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const displayedRows = useMemo(() => {
    if (rowsPerPage === 'all') return filteredRows;
    const start = (safeCurrentPage - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, rowsPerPage, safeCurrentPage]);

  // Helper for column letters (A, B, C... AA, AB...)
  const getColLetter = (index: number): string => {
    let letter = '';
    let temp = index;
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  };

  return (
    <div className="upload-modal-backdrop" onClick={onClose}>
      <div
        className={`upload-modal-card ${isMaximized ? 'is-maximized' : ''}`}
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
              <div className="modal-title-row">
                <h2 className="modal-title">Bulk Upload &amp; Review Sheet</h2>
                {parsedData && (
                  <span className="file-pill">
                    {fileName} ({parsedData.totalRows} rows, {parsedData.totalColumns} cols)
                  </span>
                )}
              </div>
              <p className="modal-subtitle">
                Inspect your sheet, confirm columns, and start telecalling immediately
              </p>
            </div>
          </div>
          <div className="header-actions">
            {parsedData && (
              <button
                type="button"
                onClick={() => setIsMaximized(!isMaximized)}
                className="modal-action-btn"
                title={isMaximized ? 'Restore standard size' : 'Expand full-screen for easy column decision'}
                aria-label={isMaximized ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
            )}
            <button
              onClick={onClose}
              className="modal-close-btn"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="upload-modal-body">
          {errorMessage && (
            <div className="alert-error-box">
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successNotice && (
            <div className="alert-success-box">
              <Sparkles size={17} className="text-amber" />
              <span>{successNotice}</span>
              <button
                type="button"
                className="alert-dismiss-btn"
                onClick={() => setSuccessNotice('')}
              >
                &times;
              </button>
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
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".xlsx,.xls,.csv,.tsv"
                    style={{ display: 'none' }}
                  />
                  <div
                    className={`upload-dropzone ${isDragging ? 'is-dragging' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
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
                </>
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
                  <span>Columns can be in any order. The system automatically detects Name, Phone, City, Notes &amp; Maps.</span>
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
            /* =========================================================================
               FULL SHEET REVIEW & COLUMN DECISION VIEW
               ========================================================================= */
            <div className="review-container">
              {/* Top Overview & Action Bar */}
              <div className="overview-bar">
                <div className="overview-left">
                  <div className="overview-title-group">
                    <span className="overview-main-title">
                      Found <strong>{parsedData.totalRows} leads</strong> across <strong>{parsedData.totalColumns} columns</strong>
                    </span>
                    <span className="overview-sub">
                      File: <em>{fileName}</em>
                    </span>
                  </div>

                  <div className="status-chips-row">
                    {phoneColumnName ? (
                      <span className="chip chip-success">
                        <CheckCircle2 size={13} />
                        <span>Phone: <strong>{phoneColumnName}</strong></span>
                      </span>
                    ) : (
                      <span className="chip chip-warning">
                        <AlertCircle size={13} />
                        <span>No Phone Column Chosen</span>
                      </span>
                    )}

                    {nameColumnName ? (
                      <span className="chip chip-info">
                        <Briefcase size={13} />
                        <span>Name: <strong>{nameColumnName}</strong></span>
                      </span>
                    ) : (
                      <span className="chip chip-muted">
                        <span>No Name Column Chosen</span>
                      </span>
                    )}

                    <span className="chip chip-neutral">
                      <strong>{includedCount} of {parsedData.totalColumns}</strong> columns mapped
                    </span>
                  </div>
                </div>

                <div className="overview-right">
                  <button
                    type="button"
                    onClick={() => setShowConfigSettings(!showConfigSettings)}
                    className={`btn-overview-utility ${showConfigSettings ? 'active' : ''}`}
                  >
                    <Folder size={14} />
                    <span>{showConfigSettings ? 'Hide Category Info' : 'Category & Sheet Info'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="btn-overview-utility"
                  >
                    <RotateCcw size={14} />
                    <span>Upload Different File</span>
                  </button>
                </div>
              </div>

              {/* WORKBOOK MULTI-SHEET TABS (IF WORKBOOK HAS >1 SHEETS) */}
              {parsedData.availableSheets.length > 1 && (
                <div className="workbook-tabs-bar">
                  <span className="workbook-tabs-label">
                    <FileSpreadsheet size={14} />
                    Workbook Sheets ({parsedData.availableSheets.length}):
                  </span>
                  <div className="workbook-tabs-list">
                    {parsedData.availableSheets.map((sh) => (
                      <button
                        key={sh}
                        type="button"
                        className={`workbook-tab-btn ${sh === parsedData.sheetName ? 'active' : ''}`}
                        onClick={() => handleSheetTabSwitch(sh)}
                      >
                        <span>{sh}</span>
                        {sh === parsedData.sheetName && <Check size={13} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* COLLAPSIBLE CATEGORY & SETTINGS DRAWER */}
              {showConfigSettings && (
                <div className="config-drawer">
                  <div className="config-drawer-grid">
                    <div className="setting-field">
                      <label>
                        <Folder size={13} /> Category / Group Name
                      </label>
                      <input
                        type="text"
                        value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value)}
                        placeholder="e.g. Airbnb, Hotels, Manufacturing"
                        className="form-input-sm"
                        required
                      />
                      <div className="quick-category-pills">
                        {Array.from(new Set(['Airbnb', 'Hotels', 'Manufacturing', ...existingCategories])).map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            className={`cat-pill-btn ${categoryName.toLowerCase() === cat.toLowerCase() ? 'active' : ''}`}
                            onClick={() => setCategoryName(cat)}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="setting-field">
                      <label>
                        <FileSpreadsheet size={13} /> Sheet / Batch Name
                      </label>
                      <input
                        type="text"
                        value={sheetName}
                        onChange={(e) => setSheetName(e.target.value)}
                        placeholder="e.g. Goa Hosts - Oct Batch"
                        className="form-input-sm"
                        required
                      />
                    </div>

                    <div className="setting-field">
                      <label>
                        <MapPin size={13} /> Default City
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
                        <Briefcase size={13} /> Industry / Business Type
                      </label>
                      <input
                        type="text"
                        value={defaultIndustry}
                        onChange={(e) => setDefaultIndustry(e.target.value)}
                        placeholder="e.g. Travel & Hospitality"
                        className="form-input-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* CONTROL TOOLBAR: SEARCH, VIEW MODE, HEADER ROW PICKER, AUTO-DETECT */}
              <div className="table-toolbar">
                <div className="toolbar-left">
                  {/* View Mode Switcher */}
                  <div className="view-mode-toggle">
                    <button
                      type="button"
                      className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                      onClick={() => setViewMode('grid')}
                      title="Spreadsheet Grid: Excel-like table with column headers"
                    >
                      <Table size={14} />
                      <span>Spreadsheet Grid</span>
                    </button>
                    <button
                      type="button"
                      className={`view-btn ${viewMode === 'cards' ? 'active' : ''}`}
                      onClick={() => setViewMode('cards')}
                      title="Column Match Cards: Inspect sample values per column"
                    >
                      <LayoutGrid size={14} />
                      <span>Column Match Cards</span>
                    </button>
                  </div>

                  {/* Header Row Selector */}
                  <div className="header-picker-group">
                    <SlidersHorizontal size={13} className="text-muted" />
                    <span className="picker-label">Header Row:</span>
                    <select
                      value={parsedData.headerRowIndex}
                      onChange={(e) => handleHeaderRowChange(Number(e.target.value))}
                      className="header-picker-select"
                      title="Select which row in your Excel contains column names"
                    >
                      <option value={0}>Row 1 has Headers (Standard)</option>
                      <option value={1}>Row 2 has Headers</option>
                      <option value={2}>Row 3 has Headers</option>
                      <option value={3}>Row 4 has Headers</option>
                      <option value={-1}>No Header Row (All rows are data)</option>
                    </select>
                  </div>

                  {/* Wrap Text Toggle */}
                  <button
                    type="button"
                    onClick={() => setWrapText(!wrapText)}
                    className={`toolbar-btn ${wrapText ? 'active' : ''}`}
                    title={wrapText ? 'Switch to compact single-line cells' : 'Wrap multi-line text to read full notes/addresses'}
                  >
                    {wrapText ? <AlignLeft size={14} /> : <WrapText size={14} />}
                    <span>{wrapText ? 'Compact Text' : 'Wrap Text'}</span>
                  </button>
                </div>

                <div className="toolbar-right">
                  {/* Quick Auto-Detect & Clear */}
                  <button
                    type="button"
                    onClick={handleAutoSuggestMappings}
                    className="btn-toolbar-action btn-auto-detect"
                    title="Automatically map columns based on smart header & data analysis"
                  >
                    <Sparkle size={13} />
                    <span>Auto-Detect All</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSetAllNotIncluded}
                    className="btn-toolbar-action btn-reset-skip"
                    title="Set all columns to Not Included (Skip)"
                  >
                    <span>Reset All to Skip</span>
                  </button>
                </div>
              </div>

              {/* SEARCH & ROW PAGINATION BAR (FOR SPREADSHEET GRID) */}
              <div className="pagination-bar">
                <div className="search-box">
                  <Search size={14} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search in sheet preview..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="search-input"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="btn-clear-search"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="pagination-controls">
                  <span className="pagination-info">
                    Showing {totalFilteredRows === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1}–
                    {Math.min(safeCurrentPage * pageSize, totalFilteredRows)} of {totalFilteredRows} rows
                  </span>

                  <div className="rows-selector">
                    <span className="rows-label">Rows:</span>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => {
                        const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                        setRowsPerPage(val);
                        setCurrentPage(1);
                      }}
                      className="rows-select"
                    >
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value="all">All ({parsedData.totalRows})</option>
                    </select>
                  </div>

                  {rowsPerPage !== 'all' && totalPages > 1 && (
                    <div className="page-nav">
                      <button
                        type="button"
                        disabled={safeCurrentPage <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        className="btn-nav"
                        aria-label="Previous page"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="page-indicator">
                        {safeCurrentPage} / {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={safeCurrentPage >= totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        className="btn-nav"
                        aria-label="Next page"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* VIEW MODE 1: SPREADSHEET GRID VIEW */}
              {viewMode === 'grid' && (
                <div className="grid-view-container">
                  <div className="table-wrapper">
                    <table className="preview-table">
                      <thead>
                        <tr>
                          <th className="th-row-num">#</th>
                          {parsedData.headers.map((hdr, colIdx) => {
                            const stat = parsedData.columnStats?.[colIdx];
                            const effMapping = getEffectiveMapping(colIdx);
                            const isPhone = effMapping === 'phone';
                            const isMapped = effMapping !== 'skip';

                            return (
                              <th key={colIdx} className={`th-col ${isPhone ? 'th-phone' : isMapped ? 'th-mapped' : ''}`}>
                                <div className="th-top-row">
                                  <span className="th-col-letter">{getColLetter(colIdx)}</span>
                                  {stat && (
                                    <span className="th-fill-badge" title={`${stat.nonEmptyCount} of ${parsedData.totalRows} rows filled`}>
                                      {stat.fillPercentage}% filled
                                    </span>
                                  )}
                                </div>

                                <div className="th-header-label" title={hdr}>
                                  {hdr}
                                </div>

                                <div className="th-mapping-container">
                                  <select
                                    value={effMapping}
                                    onChange={(e) =>
                                      handleMappingChange(colIdx, e.target.value as DetectedField)
                                    }
                                    className={`mapping-select ${
                                      isPhone
                                        ? 'select-phone'
                                        : isMapped
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
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {displayedRows.length === 0 ? (
                          <tr>
                            <td colSpan={parsedData.headers.length + 1} className="td-empty-state">
                              No matching rows found in search preview.
                            </td>
                          </tr>
                        ) : (
                          displayedRows.map((row, rIdx) => {
                            const absoluteRowIndex =
                              (safeCurrentPage - 1) * (rowsPerPage === 'all' ? 0 : rowsPerPage) + rIdx + 1;

                            return (
                              <tr key={rIdx} className="table-data-row">
                                <td className="td-row-num">{absoluteRowIndex}</td>
                                {parsedData.headers.map((_, colIdx) => {
                                  const cellVal = row[colIdx] || '';
                                  const effMapping = getEffectiveMapping(colIdx);
                                  const isPhone = effMapping === 'phone';
                                  const isMapped = effMapping !== 'skip';

                                  return (
                                    <td
                                      key={colIdx}
                                      className={`td-cell ${isPhone ? 'td-phone' : isMapped ? 'td-mapped' : ''} ${
                                        wrapText ? 'td-wrap' : 'td-compact'
                                      }`}
                                      title={cellVal}
                                    >
                                      {cellVal ? (
                                        <span>{cellVal}</span>
                                      ) : (
                                        <span className="empty-cell">—</span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* VIEW MODE 2: COLUMN MATCH CARDS VIEW */}
              {viewMode === 'cards' && (
                <div className="cards-view-container">
                  <div className="cards-grid">
                    {parsedData.headers.map((hdr, colIdx) => {
                      const stat = parsedData.columnStats?.[colIdx];
                      const effMapping = getEffectiveMapping(colIdx);
                      const isPhone = effMapping === 'phone';
                      const isMapped = effMapping !== 'skip';
                      const suggested = stat?.suggestedField || 'skip';
                      const hasSuggestionDiff = suggested !== 'skip' && effMapping !== suggested;

                      return (
                        <div
                          key={colIdx}
                          className={`column-card ${isPhone ? 'card-phone' : isMapped ? 'card-mapped' : ''}`}
                        >
                          <div className="card-top">
                            <div className="card-index-badge">{getColLetter(colIdx)}</div>
                            <div className="card-title-group">
                              <h4 className="card-column-name" title={hdr}>
                                {hdr}
                              </h4>
                              {stat && (
                                <span className="card-fill-text">
                                  {stat.nonEmptyCount} of {parsedData.totalRows} rows filled ({stat.fillPercentage}%)
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Sample Values in Column */}
                          <div className="card-samples-box">
                            <span className="card-samples-label">Sample Data:</span>
                            {stat && stat.sampleValues.length > 0 ? (
                              <div className="sample-values-list">
                                {stat.sampleValues.slice(0, 3).map((val, sIdx) => (
                                  <div key={sIdx} className="sample-val-pill" title={val}>
                                    &ldquo;{val}&rdquo;
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="no-samples-text">Column appears empty</span>
                            )}
                          </div>

                          {/* Suggested Badge */}
                          {stat && stat.suggestedField !== 'skip' && (
                            <div className="suggestion-row">
                              <span className="suggested-tag">
                                ✨ Suggested: <strong>{DETECTED_FIELD_LABELS[stat.suggestedField]}</strong>
                              </span>
                              {hasSuggestionDiff && (
                                <button
                                  type="button"
                                  onClick={() => handleMappingChange(colIdx, stat.suggestedField)}
                                  className="btn-use-suggestion"
                                >
                                  Use This
                                </button>
                              )}
                            </div>
                          )}

                          {/* Target Field Dropdown */}
                          <div className="card-mapping-field">
                            <label className="card-field-label">Assign To Field:</label>
                            <select
                              value={effMapping}
                              onChange={(e) =>
                                handleMappingChange(colIdx, e.target.value as DetectedField)
                              }
                              className={`mapping-select ${
                                isPhone
                                  ? 'select-phone'
                                  : isMapped
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
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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
                Save {parsedData.totalRows} Leads to List
              </button>
              <button
                type="button"
                onClick={() => handleFinishImport(true)}
                className="btn-start-calling"
              >
                <PhoneCall size={17} />
                <span>Import &amp; Start Calling 1-by-1 Now!</span>
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
          background: rgba(11, 29, 51, 0.7);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 1.25rem;
        }
        .upload-modal-card {
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 25px 60px -15px rgba(11, 29, 51, 0.4);
          width: 96vw;
          max-width: 1350px;
          max-height: 92vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          animation: modalAppear 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .upload-modal-card.is-maximized {
          width: 99vw;
          max-width: 99vw;
          height: 98vh;
          max-height: 98vh;
          border-radius: 8px;
        }
        @keyframes modalAppear {
          from {
            opacity: 0;
            transform: scale(0.97) translateY(8px);
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
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #e2e8f0;
          background: #ffffff;
          flex-shrink: 0;
        }
        .header-icon-group {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }
        .header-icon-badge {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .text-blue {
          color: #1e50bc;
        }
        .modal-title-row {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          flex-wrap: wrap;
        }
        .modal-title {
          font-size: 1.2rem;
          font-weight: 700;
          color: #0b1d33;
          line-height: 1.2;
        }
        .file-pill {
          font-size: 0.75rem;
          font-weight: 600;
          background: #f1f5f9;
          color: #334155;
          padding: 0.2rem 0.55rem;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
        }
        .modal-subtitle {
          font-size: 0.82rem;
          color: #64748b;
          margin-top: 2px;
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .modal-action-btn,
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
        .modal-action-btn:hover,
        .modal-close-btn:hover {
          background: #f1f5f9;
          color: #0b1d33;
        }
        .upload-modal-body {
          padding: 1.25rem 1.5rem;
          overflow-y: auto;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .alert-error-box {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          font-size: 0.88rem;
          flex-shrink: 0;
        }
        .alert-success-box {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
          padding: 0.65rem 1rem;
          border-radius: 10px;
          font-size: 0.86rem;
          font-weight: 500;
          flex-shrink: 0;
        }
        .alert-dismiss-btn {
          margin-left: auto;
          background: transparent;
          border: none;
          font-size: 1.1rem;
          color: #166534;
          cursor: pointer;
        }
        .tab-pill-row {
          display: flex;
          gap: 0.5rem;
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
          margin-top: auto;
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

        /* ================= REVIEW STYLES ================= */
        .review-container {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          flex: 1;
          min-height: 0;
        }
        .overview-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.75rem 1rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          flex-wrap: wrap;
          flex-shrink: 0;
        }
        .overview-left {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          flex-wrap: wrap;
        }
        .overview-title-group {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .overview-main-title {
          font-size: 0.92rem;
          color: #0f172a;
        }
        .overview-sub {
          font-size: 0.75rem;
          color: #64748b;
        }
        .status-chips-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .chip {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.25rem 0.65rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .chip-success {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
        }
        .chip-warning {
          background: #fffbeb;
          border: 1px solid #fde68a;
          color: #b45309;
          font-weight: 600;
        }
        .chip-info {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1d4ed8;
        }
        .chip-muted {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          color: #64748b;
        }
        .chip-neutral {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          color: #334155;
        }
        .overview-right {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .btn-overview-utility {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.35rem 0.75rem;
          border-radius: 8px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #475569;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-overview-utility:hover,
        .btn-overview-utility.active {
          background: #eff6ff;
          border-color: #93c5fd;
          color: #1e50bc;
        }

        /* WORKBOOK TABS */
        .workbook-tabs-bar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0.85rem;
          background: #f0f7ff;
          border: 1px solid #bfdbfe;
          border-radius: 10px;
          flex-shrink: 0;
          overflow-x: auto;
        }
        .workbook-tabs-label {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.78rem;
          font-weight: 700;
          color: #1e40af;
          white-space: nowrap;
        }
        .workbook-tabs-list {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .workbook-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.3rem 0.75rem;
          border-radius: 6px;
          border: 1px solid #bfdbfe;
          background: #ffffff;
          color: #1e40af;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .workbook-tab-btn:hover {
          background: #dbeafe;
        }
        .workbook-tab-btn.active {
          background: #1e50bc;
          color: #ffffff;
          border-color: #1e50bc;
        }

        /* CONFIG DRAWER */
        .config-drawer {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 1rem;
          flex-shrink: 0;
        }
        .config-drawer-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.85rem;
        }
        .setting-field {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }
        .setting-field label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #475569;
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .form-input-sm {
          padding: 0.45rem 0.65rem;
          border: 1px solid #cbd5e1;
          border-radius: 7px;
          font-size: 0.82rem;
          background: #ffffff;
          outline: none;
        }
        .form-input-sm:focus {
          border-color: #2563eb;
        }
        .quick-category-pills {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          flex-wrap: wrap;
          margin-top: 0.2rem;
        }
        .cat-pill-btn {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.15rem 0.5rem;
          border-radius: 999px;
          border: 1px solid #bfdbfe;
          background: #ffffff;
          color: #1e50bc;
          cursor: pointer;
        }
        .cat-pill-btn.active {
          background: #1e50bc;
          color: #ffffff;
        }

        /* TOOLBAR */
        .table-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          flex-wrap: wrap;
          flex-shrink: 0;
        }
        .toolbar-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .view-mode-toggle {
          display: flex;
          background: #f1f5f9;
          padding: 3px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        .view-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.35rem 0.75rem;
          border-radius: 6px;
          border: none;
          background: transparent;
          font-size: 0.78rem;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s;
        }
        .view-btn.active {
          background: #ffffff;
          color: #1e50bc;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }
        .header-picker-group {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          padding: 0.25rem 0.6rem;
          border-radius: 8px;
        }
        .text-muted {
          color: #64748b;
        }
        .picker-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #475569;
        }
        .header-picker-select {
          border: none;
          background: transparent;
          font-size: 0.78rem;
          font-weight: 600;
          color: #0f172a;
          outline: none;
          cursor: pointer;
        }
        .toolbar-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.35rem 0.65rem;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          font-size: 0.76rem;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s;
        }
        .toolbar-btn:hover,
        .toolbar-btn.active {
          background: #f1f5f9;
          border-color: #94a3b8;
          color: #0f172a;
        }
        .toolbar-right {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .btn-toolbar-action {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.35rem 0.75rem;
          border-radius: 8px;
          font-size: 0.76rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-auto-detect {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1d4ed8;
        }
        .btn-auto-detect:hover {
          background: #dbeafe;
        }
        .btn-reset-skip {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          color: #64748b;
        }
        .btn-reset-skip:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        /* PAGINATION & SEARCH BAR */
        .pagination-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.45rem 0.75rem;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          flex-shrink: 0;
          flex-wrap: wrap;
        }
        .search-box {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          padding: 0.25rem 0.6rem;
          border-radius: 6px;
          width: 260px;
        }
        .search-icon {
          color: #94a3b8;
        }
        .search-input {
          border: none;
          background: transparent;
          font-size: 0.78rem;
          outline: none;
          width: 100%;
        }
        .btn-clear-search {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
        }
        .pagination-controls {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }
        .pagination-info {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 500;
        }
        .rows-selector {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .rows-label {
          font-size: 0.75rem;
          color: #64748b;
        }
        .rows-select {
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          padding: 0.2rem 0.45rem;
          border-radius: 6px;
          font-size: 0.75rem;
          outline: none;
        }
        .page-nav {
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }
        .btn-nav {
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          border-radius: 6px;
          cursor: pointer;
        }
        .btn-nav:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .page-indicator {
          font-size: 0.75rem;
          font-weight: 600;
          color: #334155;
          padding: 0 0.25rem;
        }

        /* GRID VIEW & TABLE */
        .grid-view-container {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
        }
        .table-wrapper {
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          overflow: auto;
          min-height: 340px;
          max-height: 460px;
          position: relative;
          background: #ffffff;
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.03);
        }
        .upload-modal-card.is-maximized .table-wrapper {
          max-height: calc(98vh - 350px);
          min-height: 520px;
        }
        .preview-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 0.82rem;
          text-align: left;
        }
        .preview-table thead th {
          position: sticky;
          top: 0;
          z-index: 10;
          background: #f8fafc;
          border-bottom: 2px solid #cbd5e1;
          border-right: 1px solid #e2e8f0;
          padding: 0.65rem 0.75rem;
          vertical-align: top;
          min-width: 190px;
        }
        .th-row-num {
          position: sticky !important;
          left: 0;
          top: 0;
          z-index: 25 !important;
          background: #f1f5f9 !important;
          width: 44px;
          min-width: 44px;
          max-width: 44px;
          text-align: center;
          border-right: 2px solid #cbd5e1 !important;
          font-weight: 700;
          color: #64748b;
          padding: 0.65rem 0.35rem !important;
        }
        .th-phone {
          background: #f0fdf4 !important;
          border-bottom-color: #86efac !important;
        }
        .th-mapped {
          background: #eff6ff !important;
          border-bottom-color: #93c5fd !important;
        }
        .th-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.3rem;
        }
        .th-col-letter {
          font-size: 0.7rem;
          font-weight: 700;
          color: #94a3b8;
          background: #f1f5f9;
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
        }
        .th-fill-badge {
          font-size: 0.68rem;
          font-weight: 600;
          color: #475569;
          background: #e2e8f0;
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
        }
        .th-header-label {
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 0.4rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 0.84rem;
        }
        .th-mapping-container {
          width: 100%;
        }
        .mapping-select {
          width: 100%;
          font-size: 0.78rem;
          padding: 0.38rem 0.5rem;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          font-weight: 600;
          outline: none;
          cursor: pointer;
          transition: all 0.15s;
        }
        .select-phone {
          border-color: #16a34a;
          background: #f0fdf4;
          color: #15803d;
          box-shadow: 0 0 0 1px rgba(22, 163, 74, 0.2);
        }
        .select-active {
          border-color: #2563eb;
          background: #eff6ff;
          color: #1d4ed8;
          box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.2);
        }
        .select-skip {
          background: #f8fafc;
          color: #64748b;
          border-color: #cbd5e1;
          font-weight: 500;
        }
        .select-skip:hover {
          border-color: #94a3b8;
          background: #f1f5f9;
        }
        .table-data-row:hover {
          background: #f8fbff;
        }
        .td-row-num {
          position: sticky;
          left: 0;
          z-index: 5;
          background: #f8fafc;
          width: 44px;
          min-width: 44px;
          max-width: 44px;
          text-align: center;
          font-weight: 600;
          color: #64748b;
          border-right: 2px solid #cbd5e1;
          border-bottom: 1px solid #e2e8f0;
          padding: 0.5rem 0.35rem;
        }
        .table-data-row:hover .td-row-num {
          background: #f1f5f9;
        }
        .td-cell {
          padding: 0.55rem 0.75rem;
          border-bottom: 1px solid #f1f5f9;
          border-right: 1px solid #f1f5f9;
          color: #334155;
          min-width: 190px;
          max-width: 320px;
        }
        .td-compact {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .td-wrap {
          white-space: normal;
          word-break: break-word;
          line-height: 1.35;
        }
        .td-phone {
          background: rgba(240, 253, 244, 0.45);
          font-weight: 600;
          color: #14532d;
        }
        .td-mapped {
          background: rgba(239, 246, 255, 0.35);
        }
        .empty-cell {
          color: #cbd5e1;
        }
        .td-empty-state {
          padding: 3rem;
          text-align: center;
          color: #94a3b8;
          font-size: 0.9rem;
        }

        /* CARDS VIEW */
        .cards-view-container {
          flex: 1;
          overflow-y: auto;
          min-height: 340px;
          max-height: 460px;
          padding-right: 0.25rem;
        }
        .upload-modal-card.is-maximized .cards-view-container {
          max-height: calc(98vh - 350px);
          min-height: 520px;
        }
        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
          gap: 0.85rem;
        }
        .column-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 0.85rem;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          transition: all 0.15s;
        }
        .column-card:hover {
          border-color: #93c5fd;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
        }
        .card-phone {
          border-color: #86efac;
          background: #fcfdfc;
        }
        .card-mapped {
          border-color: #bfdbfe;
          background: #fbfdff;
        }
        .card-top {
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
        }
        .card-index-badge {
          font-size: 0.72rem;
          font-weight: 700;
          background: #f1f5f9;
          color: #475569;
          padding: 0.2rem 0.5rem;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }
        .card-title-group {
          flex: 1;
          min-width: 0;
        }
        .card-column-name {
          font-size: 0.88rem;
          font-weight: 700;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .card-fill-text {
          font-size: 0.72rem;
          color: #64748b;
        }
        .card-samples-box {
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          border-radius: 8px;
          padding: 0.5rem 0.65rem;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }
        .card-samples-label {
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: #94a3b8;
        }
        .sample-values-list {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .sample-val-pill {
          font-size: 0.75rem;
          color: #334155;
          font-family: var(--font-mono, monospace);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .no-samples-text {
          font-size: 0.75rem;
          color: #94a3b8;
          font-style: italic;
        }
        .suggestion-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f0f7ff;
          border: 1px solid #dbeafe;
          padding: 0.35rem 0.55rem;
          border-radius: 6px;
        }
        .suggested-tag {
          font-size: 0.72rem;
          color: #1e40af;
        }
        .btn-use-suggestion {
          background: #1e50bc;
          color: #ffffff;
          border: none;
          font-size: 0.68rem;
          font-weight: 700;
          padding: 0.2rem 0.45rem;
          border-radius: 4px;
          cursor: pointer;
        }
        .card-mapping-field {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-top: auto;
        }
        .card-field-label {
          font-size: 0.72rem;
          font-weight: 600;
          color: #475569;
        }

        /* FOOTER */
        .upload-modal-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
          flex-shrink: 0;
        }
        .btn-cancel {
          background: transparent;
          border: 1px solid #cbd5e1;
          padding: 0.6rem 1.25rem;
          border-radius: 8px;
          font-size: 0.88rem;
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
          padding: 0.6rem 1.25rem;
          border-radius: 9px;
          font-weight: 600;
          font-size: 0.88rem;
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
          padding: 0.6rem 1.4rem;
          border-radius: 9px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.28);
          transition: all 0.15s;
        }
        .btn-start-calling:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
        }

        @media (max-width: 900px) {
          .config-drawer-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .upload-modal-backdrop {
            padding: 0.5rem;
          }
          .upload-modal-card {
            width: 100vw;
            max-width: 100vw;
            max-height: 96vh;
            border-radius: 12px;
          }
          .upload-modal-header {
            padding: 0.85rem 1rem;
          }
          .upload-modal-body {
            padding: 0.85rem;
          }
          .config-drawer-grid {
            grid-template-columns: 1fr;
          }
          .table-toolbar {
            flex-direction: column;
            align-items: stretch;
          }
          .toolbar-left,
          .toolbar-right {
            width: 100%;
            justify-content: space-between;
          }
          .pagination-bar {
            flex-direction: column;
            align-items: stretch;
          }
          .search-box {
            width: 100%;
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
            min-height: 44px;
          }
        }
      `}</style>
    </div>
  );
}
