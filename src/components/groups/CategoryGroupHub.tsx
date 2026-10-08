'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Lead, UserDailyTarget } from '@/types/crm';
import { exportLeadsToExcel } from '@/lib/excelParser';
import {
  FileSpreadsheet,
  PhoneCall,
  Layers,
  Sparkles,
  TrendingUp,
  Clock,
  Target,
  Search,
  Plus,
  Trash2,
  Download,
  CheckCircle2,
  Calendar,
  Flame,
  ArrowRight,
  Building2,
  Hotel,
  Home,
  Factory,
  FolderOpen,
  Eye,
  Check,
  AlertCircle,
  Zap,
} from 'lucide-react';

interface CategoryGroupHubProps {
  leads: Lead[];
  dailyTarget: UserDailyTarget;
  todayCallsCount: number;
  todayDurationSeconds: number;
  onOpenUploadModal: (categoryName?: string) => void;
  onStartCallingSheet: (categoryName: string, sheetName: string) => void;
  onViewSheetLeads: (categoryName: string, sheetName: string) => void;
  onDeleteSheet: (categoryName: string, sheetName: string) => void;
  onLoadSampleCategories: () => void;
  onOpenTargetModal: () => void;
  onSaveTarget?: (newTarget: UserDailyTarget) => void;
  activeRep: string;
}

export default function CategoryGroupHub({
  leads,
  dailyTarget,
  todayCallsCount,
  todayDurationSeconds,
  onOpenUploadModal,
  onStartCallingSheet,
  onViewSheetLeads,
  onDeleteSheet,
  onLoadSampleCategories,
  onOpenTargetModal,
  onSaveTarget,
  activeRep,
}: CategoryGroupHubProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('all');

  // Filter leads by representative if selected
  const repLeads = useMemo(() => {
    if (activeRep === 'All' || activeRep === 'All Reps') return leads;
    return leads.filter((l) => l.assignedRep === activeRep);
  }, [leads, activeRep]);

  // Base daily target pace
  const baseTargetPace = dailyTarget.contactsTarget || 50;

  // Manual calling pace state (allows rep to manually simulate fast vs slow pace)
  const [manualPace, setManualPace] = useState<number>(baseTargetPace);
  const [targetSavedToast, setTargetSavedToast] = useState(false);

  // Sync when dailyTarget changes from external modal
  useEffect(() => {
    if (dailyTarget.contactsTarget) {
      setManualPace(dailyTarget.contactsTarget);
    }
  }, [dailyTarget.contactsTarget]);

  // Effective daily pace uses manual simulation pace
  const effectiveDailyPace = useMemo(() => {
    return Math.max(1, Number(manualPace) || baseTargetPace);
  }, [manualPace, baseTargetPace]);

  // Group leads by Category and Sheet
  const categoryGroups = useMemo(() => {
    const map = new Map<
      string,
      Map<string, Lead[]>
    >();

    repLeads.forEach((lead) => {
      const cat = (lead.groupName || 'General Leads').trim();
      const sheet = (lead.sheetName || 'Uploaded Sheet').trim();

      if (!map.has(cat)) {
        map.set(cat, new Map<string, Lead[]>());
      }
      const sheetMap = map.get(cat)!;
      if (!sheetMap.has(sheet)) {
        sheetMap.set(sheet, []);
      }
      sheetMap.get(sheet)!.push(lead);
    });

    // Transform into structured objects
    const result = Array.from(map.entries()).map(([catName, sheetMap]) => {
      let catTotal = 0;
      let catContacted = 0;
      let catInterested = 0;
      let catWon = 0;
      let catWonValue = 0;

      const sheets = Array.from(sheetMap.entries()).map(([sheetName, sheetLeads]) => {
        const total = sheetLeads.length;
        const contacted = sheetLeads.filter(
          (l) =>
            l.status !== 'New' ||
            (l.callLogs && l.callLogs.length > 0) ||
            Boolean(l.callResult)
        ).length;
        const pending = Math.max(0, total - contacted);
        const interested = sheetLeads.filter(
          (l) => l.status === 'Interested' || l.callResult === 'Interested'
        ).length;
        const won = sheetLeads.filter(
          (l) => l.status === 'Won' || l.callResult === 'Deal Won'
        ).length;
        const wonVal = sheetLeads.reduce((acc, l) => acc + (l.dealValue || 0), 0);

        catTotal += total;
        catContacted += contacted;
        catInterested += interested;
        catWon += won;
        catWonValue += wonVal;

        // Estimated days remaining to finish this sheet
        const daysToFinish = pending === 0 ? 0 : Math.max(1, Math.ceil(pending / effectiveDailyPace));

        return {
          sheetName,
          categoryName: catName,
          leads: sheetLeads,
          total,
          contacted,
          pending,
          interested,
          won,
          wonVal,
          daysToFinish,
        };
      });

      const catPending = Math.max(0, catTotal - catContacted);
      const catDaysToFinish = catPending === 0 ? 0 : Math.max(1, Math.ceil(catPending / effectiveDailyPace));

      return {
        name: catName,
        total: catTotal,
        contacted: catContacted,
        pending: catPending,
        interested: catInterested,
        won: catWon,
        wonValue: catWonValue,
        daysToFinish: catDaysToFinish,
        sheets,
      };
    });

    // Sort categories: Airbnb, Hotels, Manufacturing first, then alphabetical
    const priority = ['airbnb', 'hotels', 'hotel', 'manufacturing', 'industrial'];
    return result.sort((a, b) => {
      const aLower = a.name.toLowerCase();
      const bLower = b.name.toLowerCase();
      const aIdx = priority.findIndex((p) => aLower.includes(p));
      const bIdx = priority.findIndex((p) => bLower.includes(p));

      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [repLeads, effectiveDailyPace]);

  // Filter categories by search query and category tab
  const filteredCategoryGroups = useMemo(() => {
    return categoryGroups
      .filter((cat) => {
        if (selectedCategoryTab === 'all') return true;
        return cat.name.toLowerCase() === selectedCategoryTab.toLowerCase();
      })
      .map((cat) => {
        if (!searchQuery.trim()) return cat;
        const q = searchQuery.toLowerCase();
        const matchesCategory = cat.name.toLowerCase().includes(q);
        const matchingSheets = cat.sheets.filter(
          (s) =>
            s.sheetName.toLowerCase().includes(q) ||
            s.leads.some(
              (l) =>
                l.businessName.toLowerCase().includes(q) ||
                l.ownerName?.toLowerCase().includes(q) ||
                l.city.toLowerCase().includes(q)
            )
        );
        if (matchesCategory) return cat;
        return {
          ...cat,
          sheets: matchingSheets,
        };
      })
      .filter((cat) => cat.sheets.length > 0);
  }, [categoryGroups, selectedCategoryTab, searchQuery]);

  // Overall Global CRM Stats
  const globalStats = useMemo(() => {
    const total = repLeads.length;
    const contacted = repLeads.filter(
      (l) =>
        l.status !== 'New' ||
        (l.callLogs && l.callLogs.length > 0) ||
        Boolean(l.callResult)
    ).length;
    const pending = Math.max(0, total - contacted);
    const interested = repLeads.filter(
      (l) => l.status === 'Interested' || l.callResult === 'Interested'
    ).length;
    const totalSheets = categoryGroups.reduce((acc, c) => acc + c.sheets.length, 0);
    // When total is 0 or all are contacted, days is 0
    const overallDaysToFinish =
      total === 0 || pending === 0 ? 0 : Math.max(1, Math.ceil(pending / effectiveDailyPace));

    return {
      total,
      contacted,
      pending,
      interested,
      totalCategories: categoryGroups.length,
      totalSheets,
      overallDaysToFinish,
    };
  }, [repLeads, categoryGroups, effectiveDailyPace]);

  // Comparison metrics for Fast or Slow pace
  const paceSpeedComparison = useMemo(() => {
    const pending = globalStats.pending;
    const currentPace = effectiveDailyPace;
    const basePace = baseTargetPace;

    const baseDays = pending > 0 ? Math.ceil(pending / basePace) : 0;
    const testDays = pending > 0 ? Math.ceil(pending / currentPace) : 0;
    const daysDiff = baseDays - testDays; // > 0 means faster, < 0 means slower

    const deltaPercent = Math.round(((currentPace - basePace) / basePace) * 100);

    let speedState: 'faster' | 'slower' | 'equal' = 'equal';
    if (currentPace > basePace) speedState = 'faster';
    else if (currentPace < basePace) speedState = 'slower';

    let badgeText = '';
    let descriptionText = '';

    if (globalStats.total === 0) {
      if (speedState === 'faster') {
        badgeText = `⚡ ${Math.abs(deltaPercent)}% Faster`;
        descriptionText = `~${Math.ceil(100 / currentPace)} days per 100 leads (vs ~${Math.ceil(100 / basePace)}d @ ${basePace}/day)`;
      } else if (speedState === 'slower') {
        badgeText = `🐢 ${Math.abs(deltaPercent)}% Slower`;
        descriptionText = `~${Math.ceil(100 / currentPace)} days per 100 leads (vs ~${Math.ceil(100 / basePace)}d @ ${basePace}/day)`;
      } else {
        badgeText = `🎯 Target (${basePace}/d)`;
        descriptionText = `~${Math.ceil(100 / currentPace)} days per 100 leads @ ${currentPace}/day`;
      }
    } else if (pending === 0) {
      badgeText = '🎉 All Contacted';
      descriptionText = `All ${globalStats.total} contacts finished`;
    } else {
      if (speedState === 'faster') {
        if (daysDiff > 0) {
          badgeText = `⚡ ${daysDiff} ${daysDiff === 1 ? 'day' : 'days'} faster`;
        } else {
          badgeText = `⚡ Faster (+${currentPace - basePace}/day)`;
        }
        descriptionText = `Finishes in ~${testDays} days instead of ~${baseDays} days (@ ${basePace}/day)`;
      } else if (speedState === 'slower') {
        const extraDays = Math.abs(daysDiff);
        if (extraDays > 0) {
          badgeText = `🐢 ${extraDays} ${extraDays === 1 ? 'day' : 'days'} slower`;
        } else {
          badgeText = `🐢 Slower (-${basePace - currentPace}/day)`;
        }
        descriptionText = `Takes ~${testDays} days instead of ~${baseDays} days (@ ${basePace}/day)`;
      } else {
        badgeText = `🎯 On Target`;
        descriptionText = `~${testDays} days to finish pipeline @ ${basePace} calls/day`;
      }
    }

    return {
      speedState,
      daysDiff,
      deltaPercent,
      baseDays,
      testDays,
      badgeText,
      descriptionText,
    };
  }, [globalStats.pending, globalStats.total, effectiveDailyPace, baseTargetPace]);

  // Helper for Category Icon
  const getCategoryIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('airbnb') || lower.includes('homestay') || lower.includes('villa')) {
      return <Home size={18} className="cat-icon text-indigo" />;
    }
    if (lower.includes('hotel') || lower.includes('resort') || lower.includes('hospitality')) {
      return <Hotel size={18} className="cat-icon text-emerald" />;
    }
    if (lower.includes('manufactur') || lower.includes('industrial') || lower.includes('cnc')) {
      return <Factory size={18} className="cat-icon text-amber" />;
    }
    return <Building2 size={18} className="cat-icon text-blue" />;
  };

  const getCategoryBadgeClass = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('airbnb')) return 'badge-airbnb';
    if (lower.includes('hotel')) return 'badge-hotels';
    if (lower.includes('manufactur')) return 'badge-manufacturing';
    return 'badge-generic';
  };

  const targetPercentage = dailyTarget.contactsTarget > 0
    ? Math.min(100, Math.round((todayCallsCount / dailyTarget.contactsTarget) * 100))
    : 0;

  const durationMinutes = Math.floor(todayDurationSeconds / 60);
  const targetDurationPercent = dailyTarget.durationMinutesTarget > 0
    ? Math.min(100, Math.round((durationMinutes / dailyTarget.durationMinutesTarget) * 100))
    : 0;

  return (
    <div className="category-hub-page">
      {/* 1. TOP HERO BANNER & TARGET CONTROLS */}
      <section className="hub-hero-banner">
        <div className="banner-left">
          <div className="hub-title-row">
            <div className="hub-icon-badge">
              <FolderOpen size={24} className="text-blue" />
            </div>
            <div>
              <h1 className="hub-heading">Categorized Lead Sheets</h1>
              <p className="hub-subheading">
                Organized groups for Airbnb hosts, hotels, manufacturing &amp; more. Open any sheet to telecall one-by-one.
              </p>
            </div>
          </div>
        </div>

        <div className="banner-right-actions">
          {/* Target Progress Card */}
          <div
            className="daily-target-quickcard"
            onClick={onOpenTargetModal}
            title="Click to adjust your daily contact or duration goal"
          >
            <div className="target-card-header">
              <div className="target-label">
                <Target size={14} className="text-blue" />
                <span>Today&apos;s Target</span>
              </div>
              <span className="target-pct-badge">{targetPercentage}%</span>
            </div>
            <div className="target-progress-track">
              <div
                className="target-progress-fill"
                style={{ width: `${targetPercentage}%` }}
              />
            </div>
            <div className="target-card-footer">
              <span>
                <strong>{todayCallsCount}</strong> / {dailyTarget.contactsTarget} calls
              </span>
              <span>
                <strong>{durationMinutes}m</strong> / {dailyTarget.durationMinutesTarget}m
              </span>
            </div>
          </div>

          {/* Primary Action: Upload Excel */}
          <button
            type="button"
            onClick={() => onOpenUploadModal()}
            className="btn-upload-new-sheet"
          >
            <Plus size={18} />
            <span>Upload Excel Sheet</span>
          </button>
        </div>
      </section>

      {/* 2. OVERALL PIPELINE SUMMARY METRICS */}
      <section className="global-stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Total Categories</span>
            <Layers size={16} className="stat-icon text-blue" />
          </div>
          <div className="stat-value">{globalStats.totalCategories}</div>
          <div className="stat-sub">{globalStats.totalSheets} Excel sheet batches uploaded</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Total Contacts</span>
            <FileSpreadsheet size={16} className="stat-icon text-indigo" />
          </div>
          <div className="stat-value">{globalStats.total.toLocaleString('en-IN')}</div>
          <div className="stat-sub">
            {globalStats.contacted} contacted • {globalStats.pending} pending
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Overall Completion</span>
            <CheckCircle2 size={16} className="stat-icon text-emerald" />
          </div>
          <div className="stat-value">
            {globalStats.total > 0
              ? `${Math.round((globalStats.contacted / globalStats.total) * 100)}%`
              : '0%'}
          </div>
          <div className="stat-progress-bar">
            <div
              className="stat-progress-fill"
              style={{
                width: `${
                  globalStats.total > 0
                    ? Math.round((globalStats.contacted / globalStats.total) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        <div className="stat-card highlight-pace-card">
          <div className="stat-header">
            <span className="stat-label">Completion Pace</span>
            <div className="stat-header-badges">
              <span className={`pace-status-pill ${paceSpeedComparison.speedState}`}>
                {paceSpeedComparison.badgeText}
              </span>
              <Clock size={16} className="stat-icon text-amber" />
            </div>
          </div>

          <div className="stat-value">
            {globalStats.total === 0 ? (
              <span className="stat-empty-val">--</span>
            ) : globalStats.pending === 0 ? (
              'Completed 🎉'
            ) : (
              `~${globalStats.overallDaysToFinish} ${globalStats.overallDaysToFinish === 1 ? 'Day' : 'Days'}`
            )}
          </div>

          <div className="stat-sub">
            {globalStats.total === 0
              ? paceSpeedComparison.descriptionText
              : globalStats.pending === 0
              ? `All ${globalStats.total} contacts reached`
              : paceSpeedComparison.descriptionText}
          </div>

          {/* Interactive Manual Pace Simulator ("fast or slow" checker) */}
          <div className="pace-simulator-widget">
            <div className="pace-simulator-top">
              <span className="pace-simulator-title">
                <Zap size={12} className="text-amber" /> Test Speed:
              </span>
              <div className="pace-simulator-actions">
                {manualPace !== baseTargetPace && (
                  <>
                    <button
                      type="button"
                      className="btn-pace-reset"
                      onClick={() => setManualPace(baseTargetPace)}
                      title="Reset to your default daily target"
                    >
                      Reset
                    </button>
                    {onSaveTarget && (
                      <button
                        type="button"
                        className="btn-pace-save"
                        onClick={() => {
                          onSaveTarget({
                            ...dailyTarget,
                            contactsTarget: manualPace,
                          });
                          setTargetSavedToast(true);
                          setTimeout(() => setTargetSavedToast(false), 2500);
                        }}
                        title="Save this pace as your daily target goal"
                      >
                        {targetSavedToast ? '✓ Saved' : 'Save Goal'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Stepper + Input */}
            <div className="pace-stepper-control">
              <button
                type="button"
                className="pace-stepper-btn"
                onClick={() => setManualPace((p) => Math.max(5, p - 5))}
                title="Decrease 5 calls/day (test slower pace)"
              >
                -5
              </button>
              <div className="pace-input-box">
                <input
                  type="number"
                  min="5"
                  max="500"
                  step="5"
                  value={manualPace}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) setManualPace(Math.max(1, Math.min(500, val)));
                  }}
                  className="pace-input-field"
                />
                <span className="pace-input-unit">calls / day</span>
              </div>
              <button
                type="button"
                className="pace-stepper-btn"
                onClick={() => setManualPace((p) => Math.min(500, p + 5))}
                title="Increase 5 calls/day (test faster pace)"
              >
                +5
              </button>
            </div>

            {/* Presets: 25 Slow, 50 Normal, 75 Fast, 100 Sprint */}
            <div className="pace-presets-row">
              <button
                type="button"
                className={`pace-preset-btn ${manualPace === 25 ? 'active slow' : ''}`}
                onClick={() => setManualPace(25)}
                title="Slow Pace: 25 calls/day"
              >
                🐢 25
              </button>
              <button
                type="button"
                className={`pace-preset-btn ${manualPace === 50 ? 'active normal' : ''}`}
                onClick={() => setManualPace(50)}
                title="Normal Pace: 50 calls/day"
              >
                🎯 50
              </button>
              <button
                type="button"
                className={`pace-preset-btn ${manualPace === 75 ? 'active fast' : ''}`}
                onClick={() => setManualPace(75)}
                title="Fast Pace: 75 calls/day"
              >
                ⚡ 75
              </button>
              <button
                type="button"
                className={`pace-preset-btn ${manualPace === 100 ? 'active sprint' : ''}`}
                onClick={() => setManualPace(100)}
                title="Sprint Pace: 100 calls/day"
              >
                🚀 100
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FILTER TABS & SEARCH BAR */}
      <section className="hub-filters-bar">
        <div className="category-pill-tabs">
          <button
            type="button"
            className={`category-pill ${selectedCategoryTab === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategoryTab('all')}
          >
            <span>All Categories</span>
            <span className="pill-count">{categoryGroups.length}</span>
          </button>
          {categoryGroups.map((cat) => (
            <button
              key={cat.name}
              type="button"
              className={`category-pill ${
                selectedCategoryTab.toLowerCase() === cat.name.toLowerCase() ? 'active' : ''
              }`}
              onClick={() => setSelectedCategoryTab(cat.name)}
            >
              {getCategoryIcon(cat.name)}
              <span>{cat.name}</span>
              <span className="pill-count">{cat.sheets.length}</span>
            </button>
          ))}
        </div>

        <div className="search-and-demo-row">
          <div className="search-input-wrap">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by category, sheet name, business..."
              className="hub-search-input"
            />
          </div>

          {leads.length === 0 && (
            <button
              type="button"
              onClick={onLoadSampleCategories}
              className="btn-load-sample-sheets"
              title="Instantly generate categorized sample sheets for Airbnb, Hotels, and Manufacturing"
            >
              <Sparkles size={15} />
              <span>Load Demo Categories (Airbnb, Hotels, Mfg)</span>
            </button>
          )}
        </div>
      </section>

      {/* 4. CATEGORIZED GROUPS LIST */}
      <section className="categories-container">
        {filteredCategoryGroups.length === 0 ? (
          <div className="empty-categories-card">
            <div className="empty-icon-box">
              <FileSpreadsheet size={36} className="text-muted" />
            </div>
            <h3 className="empty-title">
              {leads.length === 0
                ? 'No Categories or Sheets Uploaded Yet'
                : 'No Sheets Match Your Filter'}
            </h3>
            <p className="empty-description">
              {leads.length === 0
                ? 'Upload your first Excel sheet and name its Category (like Airbnb, Hotels, or Manufacturing) to get started, or click below to load demo data.'
                : 'Try adjusting your search query or select "All Categories".'}
            </p>
            <div className="empty-actions">
              <button
                type="button"
                onClick={() => onOpenUploadModal()}
                className="btn-empty-upload"
              >
                <Plus size={16} />
                <span>Upload Excel Sheet</span>
              </button>
              {leads.length === 0 && (
                <button
                  type="button"
                  onClick={onLoadSampleCategories}
                  className="btn-empty-sample"
                >
                  <Sparkles size={16} />
                  <span>Load Sample Sheets (Airbnb, Hotels, Mfg)</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          filteredCategoryGroups.map((category) => {
            const catProgressPct = category.total > 0
              ? Math.round((category.contacted / category.total) * 100)
              : 0;

            return (
              <div key={category.name} className="category-section-card">
                {/* CATEGORY HEADER */}
                <div className="category-header">
                  <div className="category-header-info">
                    <div className="category-title-wrap">
                      <div className="category-icon-bubble">
                        {getCategoryIcon(category.name)}
                      </div>
                      <div>
                        <div className="category-heading-row">
                          <h2 className="category-title">{category.name}</h2>
                          <span
                            className={`category-badge ${getCategoryBadgeClass(category.name)}`}
                          >
                            {category.sheets.length} {category.sheets.length === 1 ? 'Sheet' : 'Sheets'}
                          </span>
                        </div>
                        <div className="category-meta-row">
                          <span>
                            <strong>{category.total}</strong> total contacts
                          </span>
                          <span className="dot-divider">•</span>
                          <span>
                            <strong>{category.contacted}</strong> contacted ({catProgressPct}%)
                          </span>
                          <span className="dot-divider">•</span>
                          <span>
                            <strong>{category.pending}</strong> pending
                          </span>
                          {category.daysToFinish > 0 && (
                            <>
                              <span className="dot-divider">•</span>
                              <span className="pace-estimate-text">
                                ⏱ ~{category.daysToFinish} days to finish category
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Category Right Actions */}
                  <div className="category-header-actions">
                    <button
                      type="button"
                      onClick={() => onOpenUploadModal(category.name)}
                      className="btn-add-sheet-to-category"
                      title={`Upload a new sheet into ${category.name}`}
                    >
                      <Plus size={15} />
                      <span>Add Sheet</span>
                    </button>
                    {category.sheets.length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => onViewSheetLeads(category.name, '')}
                          className="btn-view-category-leads"
                          title={`View all leads in ${category.name}`}
                        >
                          <Layers size={14} />
                          <span>View All Leads</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onStartCallingSheet(category.name, category.sheets[0].sheetName)
                          }
                          className="btn-call-category-now"
                        >
                          <PhoneCall size={14} />
                          <span>Call 1-by-1</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Progress bar across category */}
                <div className="category-progress-track">
                  <div
                    className="category-progress-fill"
                    style={{ width: `${catProgressPct}%` }}
                  />
                </div>

                {/* SHEETS GRID INSIDE CATEGORY */}
                <div className="sheets-grid">
                  {category.sheets.map((sheet) => {
                    const sheetProgressPct = sheet.total > 0
                      ? Math.round((sheet.contacted / sheet.total) * 100)
                      : 0;

                    return (
                      <div key={sheet.sheetName} className="sheet-card">
                        <div className="sheet-card-top">
                          <div className="sheet-title-group">
                            <div className="sheet-icon-box">
                              <FileSpreadsheet size={18} className="text-blue" />
                            </div>
                            <div className="sheet-name-container">
                              <h3 className="sheet-name" title={sheet.sheetName}>
                                {sheet.sheetName}
                              </h3>
                              <span className="sheet-lead-count">
                                {sheet.total} {sheet.total === 1 ? 'contact' : 'contacts'}
                              </span>
                            </div>
                          </div>

                          <div className="sheet-quick-actions">
                            <button
                              type="button"
                              onClick={() => exportLeadsToExcel(sheet.leads, sheet.sheetName)}
                              className="btn-icon-action"
                              title="Download as Excel (.xlsx)"
                            >
                              <Download size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  confirm(
                                    `Are you sure you want to delete "${sheet.sheetName}" and its ${sheet.total} leads?`
                                  )
                                ) {
                                  onDeleteSheet(category.name, sheet.sheetName);
                                }
                              }}
                              className="btn-icon-action text-red-hover"
                              title="Delete sheet"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Progress Bar & Percent */}
                        <div className="sheet-progress-section">
                          <div className="progress-label-row">
                            <span>Calling Progress</span>
                            <span className="progress-pct-bold">
                              {sheet.contacted} / {sheet.total} ({sheetProgressPct}%)
                            </span>
                          </div>
                          <div className="sheet-bar-track">
                            <div
                              className="sheet-bar-fill"
                              style={{ width: `${sheetProgressPct}%` }}
                            />
                          </div>
                        </div>

                        {/* Outcome Chips */}
                        <div className="sheet-outcome-chips">
                          <div className="outcome-chip chip-pending">
                            <span>Pending: <strong>{sheet.pending}</strong></span>
                          </div>
                          {sheet.interested > 0 && (
                            <div className="outcome-chip chip-interested">
                              <span>Interested: <strong>{sheet.interested}</strong></span>
                            </div>
                          )}
                          {sheet.won > 0 && (
                            <div className="outcome-chip chip-won">
                              <span>Won: <strong>{sheet.won}</strong></span>
                            </div>
                          )}
                        </div>

                        {/* Days to finish badge */}
                        <div className="sheet-forecast-row">
                          <Clock size={13} className="text-muted" />
                          <span className="forecast-text">
                            {sheet.pending === 0
                              ? 'Finished! All leads contacted'
                              : `~${sheet.daysToFinish} days to finish at ${effectiveDailyPace}/day`}
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="sheet-card-footer">
                          <button
                            type="button"
                            onClick={() => onViewSheetLeads(category.name, sheet.sheetName)}
                            className="btn-sheet-view"
                          >
                            <Eye size={14} />
                            <span>View Leads</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onStartCallingSheet(category.name, sheet.sheetName)}
                            className="btn-sheet-call-primary"
                          >
                            <PhoneCall size={14} />
                            <span>Start Calling 1-by-1</span>
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </section>

      <style jsx>{`
        .category-hub-page {
          max-width: 1380px;
          margin: 0 auto;
          padding: 1.5rem 1.5rem 3rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
          color: #0b1d33;
        }

        /* 1. HERO BANNER */
        .hub-hero-banner {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          padding: 1.5rem 1.75rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
          flex-wrap: wrap;
        }
        .banner-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .hub-title-row {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .hub-icon-badge {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .hub-heading {
          font-size: 1.35rem;
          font-weight: 800;
          color: #0b1d33;
          letter-spacing: -0.02em;
          margin: 0;
        }
        .hub-subheading {
          font-size: 0.88rem;
          color: #64748b;
          margin: 0.2rem 0 0 0;
        }
        .banner-right-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .daily-target-quickcard {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 0.65rem 0.95rem;
          min-width: 220px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .daily-target-quickcard:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
          transform: translateY(-1px);
        }
        .target-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.4rem;
        }
        .target-label {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.78rem;
          font-weight: 700;
          color: #334155;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .target-pct-badge {
          font-size: 0.75rem;
          font-weight: 800;
          color: #1e50bc;
          background: #eff6ff;
          padding: 0.1rem 0.4rem;
          border-radius: 6px;
        }
        .target-progress-track {
          height: 6px;
          background: #e2e8f0;
          border-radius: 999px;
          overflow: hidden;
          margin-bottom: 0.4rem;
        }
        .target-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #1e50bc);
          border-radius: 999px;
          transition: width 0.3s ease;
        }
        .target-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.75rem;
          color: #64748b;
        }
        .btn-upload-new-sheet {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #1e50bc;
          color: #ffffff;
          border: none;
          padding: 0.75rem 1.25rem;
          border-radius: 10px;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(30, 80, 188, 0.25);
          transition: all 0.2s ease;
        }
        .btn-upload-new-sheet:hover {
          background: #18429c;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(30, 80, 188, 0.35);
        }

        /* 2. STATS GRID */
        .global-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }
        .stat-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 1.15rem 1.25rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          display: flex;
          flex-direction: column;
        }
        .highlight-pace-card {
          background: linear-gradient(135deg, #ffffff, #fffdf5);
          border-color: #fde68a;
          box-shadow: 0 2px 8px rgba(245, 158, 11, 0.08);
        }
        .stat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.5rem;
          gap: 0.5rem;
        }
        .stat-header-badges {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .pace-status-pill {
          font-size: 0.68rem;
          font-weight: 700;
          padding: 0.15rem 0.45rem;
          border-radius: 999px;
          line-height: 1.2;
          white-space: nowrap;
        }
        .pace-status-pill.faster {
          background: #ecfdf5;
          color: #059669;
          border: 1px solid #a7f3d0;
        }
        .pace-status-pill.slower {
          background: #fff7ed;
          color: #c2410c;
          border: 1px solid #fed7aa;
        }
        .pace-status-pill.equal {
          background: #eff6ff;
          color: #1e50bc;
          border: 1px solid #bfdbfe;
        }
        .stat-empty-val {
          color: #94a3b8;
          font-weight: 800;
        }
        .stat-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .stat-value {
          font-size: 1.55rem;
          font-weight: 800;
          color: #0b1d33;
          letter-spacing: -0.02em;
          margin-bottom: 0.25rem;
        }
        .stat-sub {
          font-size: 0.77rem;
          color: #64748b;
          line-height: 1.35;
        }
        .stat-progress-bar {
          height: 6px;
          background: #e2e8f0;
          border-radius: 999px;
          overflow: hidden;
          margin-top: 0.5rem;
        }
        .stat-progress-fill {
          height: 100%;
          background: #10b981;
          border-radius: 999px;
        }

        /* Pace Simulator Widget */
        .pace-simulator-widget {
          margin-top: 0.75rem;
          padding-top: 0.65rem;
          border-top: 1px dashed #fde68a;
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }
        .pace-simulator-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.4rem;
        }
        .pace-simulator-title {
          font-size: 0.7rem;
          font-weight: 700;
          color: #92400e;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .pace-simulator-actions {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .btn-pace-reset {
          background: transparent;
          border: 1px solid #cbd5e1;
          border-radius: 5px;
          padding: 0.1rem 0.35rem;
          font-size: 0.65rem;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-pace-reset:hover {
          background: #f1f5f9;
          color: #1e293b;
        }
        .btn-pace-save {
          background: #1e50bc;
          color: #ffffff;
          border: none;
          border-radius: 5px;
          padding: 0.1rem 0.45rem;
          font-size: 0.65rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-pace-save:hover {
          background: #18429c;
        }
        .pace-stepper-control {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          width: 100%;
        }
        .pace-stepper-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          font-weight: 800;
          font-size: 0.75rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        .pace-stepper-btn:hover {
          background: #f8fafc;
          border-color: #94a3b8;
          color: #0f172a;
        }
        .pace-input-box {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 0.15rem 0.4rem;
          height: 28px;
        }
        .pace-input-field {
          width: 42px;
          text-align: right;
          border: none;
          outline: none;
          font-weight: 800;
          font-size: 0.85rem;
          color: #0b1d33;
          background: transparent;
          padding: 0;
        }
        .pace-input-field::-webkit-inner-spin-button,
        .pace-input-field::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .pace-input-unit {
          font-size: 0.68rem;
          color: #64748b;
          font-weight: 600;
          white-space: nowrap;
        }
        .pace-presets-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.25rem;
          width: 100%;
        }
        .pace-preset-btn {
          padding: 0.25rem 0.2rem;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          font-size: 0.68rem;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
          text-align: center;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .pace-preset-btn:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
        }
        .pace-preset-btn.active.slow {
          border-color: #f97316;
          background: #ffedd5;
          color: #c2410c;
        }
        .pace-preset-btn.active.normal {
          border-color: #1e50bc;
          background: #eff6ff;
          color: #1e50bc;
        }
        .pace-preset-btn.active.fast {
          border-color: #10b981;
          background: #ecfdf5;
          color: #059669;
        }
        .pace-preset-btn.active.sprint {
          border-color: #8b5cf6;
          background: #f5f3ff;
          color: #6d28d9;
        }

        /* 3. FILTER TABS & SEARCH */
        .hub-filters-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .category-pill-tabs {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          flex-wrap: wrap;
        }
        .category-pill {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.45rem 0.85rem;
          border-radius: 999px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          font-size: 0.84rem;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .category-pill:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }
        .category-pill.active {
          background: #1e50bc;
          color: #ffffff;
          border-color: #1e50bc;
        }
        .category-pill.active .pill-count {
          background: rgba(255, 255, 255, 0.25);
          color: #ffffff;
        }
        .pill-count {
          font-size: 0.72rem;
          font-weight: 700;
          background: #f1f5f9;
          color: #64748b;
          padding: 0.1rem 0.45rem;
          border-radius: 999px;
        }
        .search-and-demo-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .search-input-wrap {
          position: relative;
          min-width: 280px;
        }
        .search-icon {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }
        .hub-search-input {
          width: 100%;
          padding: 0.5rem 0.85rem 0.5rem 2.2rem;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          font-size: 0.85rem;
          background: #ffffff;
          outline: none;
          color: #0b1d33;
        }
        .hub-search-input:focus {
          border-color: #1e50bc;
          box-shadow: 0 0 0 3px rgba(30, 80, 188, 0.1);
        }
        .btn-load-sample-sheets {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          background: #eff6ff;
          color: #1e50bc;
          border: 1px solid #bfdbfe;
          padding: 0.5rem 0.85rem;
          border-radius: 10px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-load-sample-sheets:hover {
          background: #dbeafe;
        }

        /* 4. CATEGORIES CONTAINER */
        .categories-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .category-section-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .category-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .category-header-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .category-title-wrap {
          display: flex;
          align-items: center;
          gap: 0.9rem;
        }
        .category-icon-bubble {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .category-heading-row {
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }
        .category-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0b1d33;
          margin: 0;
          letter-spacing: -0.01em;
        }
        .category-badge {
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 0.15rem 0.55rem;
          border-radius: 6px;
        }
        .badge-airbnb {
          background: #e0e7ff;
          color: #4338ca;
        }
        .badge-hotels {
          background: #d1fae5;
          color: #047857;
        }
        .badge-manufacturing {
          background: #fef3c7;
          color: #b45309;
        }
        .badge-generic {
          background: #f1f5f9;
          color: #475569;
        }
        .category-meta-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.82rem;
          color: #64748b;
          margin-top: 0.2rem;
          flex-wrap: wrap;
        }
        .dot-divider {
          color: #cbd5e1;
        }
        .pace-estimate-text {
          color: #b45309;
          font-weight: 700;
        }
        .category-header-actions {
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }
        .btn-add-sheet-to-category {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          color: #334155;
          padding: 0.5rem 0.85rem;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-add-sheet-to-category:hover {
          background: #f1f5f9;
          border-color: #94a3b8;
        }
        .btn-view-category-leads {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #334155;
          padding: 0.5rem 0.85rem;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-view-category-leads:hover {
          background: #f1f5f9;
          border-color: #94a3b8;
          color: #0b1d33;
        }
        .btn-call-category-now {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          background: #1e50bc;
          color: #ffffff;
          border: none;
          padding: 0.5rem 0.95rem;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-call-category-now:hover {
          background: #18429c;
        }
        .category-progress-track {
          height: 6px;
          background: #f1f5f9;
          border-radius: 999px;
          overflow: hidden;
        }
        .category-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #10b981);
          border-radius: 999px;
        }

        /* SHEETS GRID */
        .sheets-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.15rem;
        }
        .sheet-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 1.15rem;
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
          transition: all 0.2s ease;
        }
        .sheet-card:hover {
          background: #ffffff;
          border-color: #cbd5e1;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04);
        }
        .sheet-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.75rem;
        }
        .sheet-title-group {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          overflow: hidden;
        }
        .sheet-icon-box {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .sheet-name-container {
          overflow: hidden;
        }
        .sheet-name {
          font-size: 0.95rem;
          font-weight: 700;
          color: #0b1d33;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sheet-lead-count {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 600;
        }
        .sheet-quick-actions {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .btn-icon-action {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-icon-action:hover {
          background: #f1f5f9;
          color: #0b1d33;
        }
        .text-red-hover:hover {
          color: #ef4444;
          border-color: #fecaca;
        }
        .sheet-progress-section {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .progress-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.75rem;
          color: #64748b;
        }
        .progress-pct-bold {
          font-weight: 700;
          color: #0b1d33;
        }
        .sheet-bar-track {
          height: 6px;
          background: #e2e8f0;
          border-radius: 999px;
          overflow: hidden;
        }
        .sheet-bar-fill {
          height: 100%;
          background: #3b82f6;
          border-radius: 999px;
          transition: width 0.3s ease;
        }
        .sheet-outcome-chips {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          flex-wrap: wrap;
        }
        .outcome-chip {
          font-size: 0.72rem;
          padding: 0.18rem 0.5rem;
          border-radius: 6px;
          font-weight: 600;
        }
        .chip-pending {
          background: #f1f5f9;
          color: #475569;
        }
        .chip-interested {
          background: #dcfce7;
          color: #15803d;
        }
        .chip-won {
          background: #fef3c7;
          color: #b45309;
        }
        .sheet-forecast-row {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.75rem;
          color: #64748b;
          background: #ffffff;
          padding: 0.35rem 0.65rem;
          border-radius: 6px;
          border: 1px dashed #cbd5e1;
        }
        .sheet-card-footer {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.25rem;
        }
        .btn-sheet-view {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-sheet-view:hover {
          background: #f1f5f9;
        }
        .btn-sheet-call-primary {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          padding: 0.5rem 0.85rem;
          border-radius: 8px;
          border: none;
          background: #1e50bc;
          color: #ffffff;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-sheet-call-primary:hover {
          background: #18429c;
          transform: translateY(-1px);
        }

        /* EMPTY STATE */
        .empty-categories-card {
          background: #ffffff;
          border: 2px dashed #cbd5e1;
          border-radius: 20px;
          padding: 3.5rem 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.8rem;
        }
        .empty-icon-box {
          width: 68px;
          height: 68px;
          border-radius: 16px;
          background: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
        }
        .empty-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0b1d33;
          margin: 0;
        }
        .empty-description {
          font-size: 0.9rem;
          color: #64748b;
          max-width: 460px;
          margin: 0;
          line-height: 1.5;
        }
        .empty-actions {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          margin-top: 0.75rem;
          flex-wrap: wrap;
          justify-content: center;
        }
        .btn-empty-upload {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          background: #1e50bc;
          color: #ffffff;
          border: none;
          padding: 0.65rem 1.25rem;
          border-radius: 10px;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-empty-sample {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          background: #eff6ff;
          color: #1e50bc;
          border: 1px solid #bfdbfe;
          padding: 0.65rem 1.25rem;
          border-radius: 10px;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
        }

        /* MOBILE SCREEN OPTIMIZATIONS */
        @media (max-width: 900px) {
          .global-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 768px) {
          .category-hub-page {
            padding: 1rem 0.75rem 2.5rem 0.75rem;
            gap: 1.25rem;
          }
          .hub-hero-banner {
            padding: 1.15rem 1rem;
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }
          .banner-right-actions {
            flex-direction: column;
            align-items: stretch;
            width: 100%;
          }
          .daily-target-quickcard {
            width: 100%;
            min-width: 0;
          }
          .btn-upload-new-sheet {
            width: 100%;
            justify-content: center;
          }
          .hub-filters-bar {
            flex-direction: column;
            align-items: stretch;
            gap: 0.75rem;
          }
          .category-pill-tabs {
            overflow-x: auto;
            flex-wrap: nowrap;
            padding-bottom: 0.35rem;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }
          .category-pill-tabs::-webkit-scrollbar {
            display: none;
          }
          .category-pill {
            flex-shrink: 0;
          }
          .search-and-demo-row {
            flex-direction: column;
            align-items: stretch;
            width: 100%;
          }
          .search-input-wrap {
            width: 100%;
            min-width: 0;
          }
          .btn-load-sample-sheets {
            width: 100%;
            justify-content: center;
          }
          .category-section-card {
            padding: 1.1rem 0.85rem;
          }
          .category-header {
            flex-direction: column;
            align-items: stretch;
            gap: 0.75rem;
          }
          .category-header-actions {
            width: 100%;
            justify-content: space-between;
          }
          .sheets-table-wrap {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
        }
        @media (max-width: 600px) {
          .global-stats-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }
          .stat-card {
            padding: 1rem 0.95rem;
          }
          .pace-stepper-btn {
            width: 34px;
            height: 34px;
          }
          .pace-input-box {
            height: 34px;
          }
          .pace-presets-row {
            gap: 0.35rem;
          }
          .pace-preset-btn {
            padding: 0.35rem 0.2rem;
            font-size: 0.72rem;
          }
        }
      `}</style>
    </div>
  );
}
