'use client';

import React, { useMemo } from 'react';
import {
  Lead,
  PIPELINE_STAGES,
  PipelineStage,
  WhatsAppTemplate,
  UserDailyTarget,
} from '@/types/crm';
import {
  formatTemplate,
  cleanPhoneNumber,
  createWhatsAppLink,
  getWhatsAppFollowUpCadence,
} from '@/lib/whatsapp';
import {
  Phone,
  PhoneCall,
  MessageCircle,
  Calendar,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Flame,
  Award,
  Clock,
  Sparkles,
  Target,
  Trophy,
  Zap,
  FolderOpen,
  FileSpreadsheet,
  Edit3,
  Building2,
  Layers,
  Eye,
} from 'lucide-react';

interface DailyDashboardProps {
  leads: Lead[];
  activeRep: string;
  onOpenLead: (lead: Lead) => void;
  onQuickCall: (lead: Lead) => void;
  onOpenNewLead: () => void;
  templates: WhatsAppTemplate[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  onStartCallingSheet?: (categoryName: string, sheetName?: string) => void;
  onViewSheetLeads?: (categoryName: string, sheetName?: string) => void;
  dailyTarget?: UserDailyTarget;
  onOpenTargetModal?: () => void;
}

export default function DailyDashboard({
  leads,
  activeRep,
  onOpenLead,
  onQuickCall,
  onOpenNewLead,
  templates,
  selectedDate,
  setSelectedDate,
  onStartCallingSheet,
  onViewSheetLeads,
  dailyTarget = { contactsTarget: 50, durationMinutesTarget: 120, mode: 'both' },
  onOpenTargetModal,
}: DailyDashboardProps) {
  // Filter leads by rep if not "All Reps"
  const repFilteredLeads = useMemo(() => {
    if (activeRep === 'All' || activeRep === 'All Reps') return leads;
    return leads.filter((l) => l.assignedRep === activeRep);
  }, [leads, activeRep]);

  // Selected date normalization (YYYY-MM-DD)
  const targetDateStr = selectedDate || new Date().toISOString().slice(0, 10);

  // Compute Daily Funnel Counters (Actuals for today)
  const dailyMetrics = useMemo(() => {
    let leadsResearched = 0;
    let qualityCallsMade = 0;
    let actualConversations = 0;
    let whatsappSentCount = 0;
    let demosSentCount = 0;
    let discoveryCallsHeld = 0;

    repFilteredLeads.forEach((lead) => {
      // 1. Researched on this day
      if (lead.createdAt && lead.createdAt.slice(0, 10) === targetDateStr) {
        leadsResearched++;
      }

      // 2. Calls made today (from call logs)
      lead.callLogs?.forEach((log) => {
        if (log.date && log.date.slice(0, 10) === targetDateStr) {
          qualityCallsMade++;
          if (
            log.result === 'Connected' ||
            log.result === 'Interested' ||
            log.result === 'Callback'
          ) {
            actualConversations++;
          }
        }
      });

      // 3. WhatsApp follow-ups sent today
      if (lead.whatsappSentDate && lead.whatsappSentDate.slice(0, 10) === targetDateStr) {
        whatsappSentCount++;
      }

      // 4. Demos/audits sent today
      if (lead.demoSentDate && lead.demoSentDate.slice(0, 10) === targetDateStr) {
        demosSentCount++;
      }

      // 5. Discovery calls held today
      if (
        lead.discoveryCallDate &&
        lead.discoveryCallDate.slice(0, 10) === targetDateStr
      ) {
        discoveryCallsHeld++;
      }
    });

    return {
      leadsResearched,
      qualityCallsMade,
      actualConversations,
      whatsappSentCount,
      demosSentCount,
      discoveryCallsHeld,
    };
  }, [repFilteredLeads, targetDateStr]);

  // =========================================================
  // ANALYTICS: BEST DAY, DAILY AVERAGES & CALLING PACE
  // =========================================================
  const analyticsSummary = useMemo(() => {
    const callsByDate = new Map<
      string,
      { totalCalls: number; interested: number; wonDeals: number; wonValue: number; durationSec: number }
    >();

    repFilteredLeads.forEach((lead) => {
      lead.callLogs?.forEach((log) => {
        if (!log.date) return;
        const d = log.date.slice(0, 10);
        if (!callsByDate.has(d)) {
          callsByDate.set(d, { totalCalls: 0, interested: 0, wonDeals: 0, wonValue: 0, durationSec: 0 });
        }
        const item = callsByDate.get(d)!;
        item.totalCalls++;
        if (log.result === 'Interested') item.interested++;
        if (log.result === 'Deal Won') {
          item.wonDeals++;
          item.wonValue += lead.dealValue || lead.expectedValue || 25000;
        }
        if (log.durationSeconds) item.durationSec += log.durationSeconds;
      });
    });

    // 1. Find Best Day
    let bestDayDate = '';
    let bestDayCalls = 0;
    let bestDayInterested = 0;
    let bestDayWonVal = 0;

    callsByDate.forEach((val, dateStr) => {
      if (val.totalCalls > bestDayCalls) {
        bestDayCalls = val.totalCalls;
        bestDayDate = dateStr;
        bestDayInterested = val.interested;
        bestDayWonVal = val.wonValue;
      }
    });

    // 2. Calculate Averages
    const distinctDaysCount = Math.max(1, callsByDate.size);
    let totalCallsAllTime = 0;
    let totalDurationAllTime = 0;
    let callsWithDurationCount = 0;

    callsByDate.forEach((val) => {
      totalCallsAllTime += val.totalCalls;
      totalDurationAllTime += val.durationSec;
      if (val.durationSec > 0) callsWithDurationCount += val.totalCalls;
    });

    const avgCallsPerDay = (totalCallsAllTime / distinctDaysCount).toFixed(1);
    const avgDurationSec =
      callsWithDurationCount > 0 ? Math.round(totalDurationAllTime / callsWithDurationCount) : 95;

    // 3. Current Pace
    const todayCalls = dailyMetrics.qualityCallsMade;
    const currentHour = new Date().getHours();
    const hoursActiveToday = Math.max(1, Math.min(8, currentHour >= 9 ? currentHour - 9 + 1 : 1));
    const callsPerHour = (todayCalls / hoursActiveToday).toFixed(1);

    return {
      bestDayDate,
      bestDayCalls,
      bestDayInterested,
      bestDayWonVal,
      avgCallsPerDay,
      avgDurationSec,
      totalCallsAllTime,
      callsPerHour,
      todayCalls,
    };
  }, [repFilteredLeads, dailyMetrics.qualityCallsMade]);

  // =========================================================
  // FORECAST: HOW MANY DAYS TO FINISH EACH CATEGORY SHEET
  // =========================================================
  const categorySheetForecasts = useMemo(() => {
    const map = new Map<string, Map<string, Lead[]>>();
    repFilteredLeads.forEach((lead) => {
      const cat = (lead.groupName || 'General Leads').trim();
      const sheet = (lead.sheetName || 'Uploaded Sheet').trim();
      if (!map.has(cat)) map.set(cat, new Map());
      const sheetMap = map.get(cat)!;
      if (!sheetMap.has(sheet)) sheetMap.set(sheet, []);
      sheetMap.get(sheet)!.push(lead);
    });

    const dailyPace = Math.max(15, dailyTarget?.contactsTarget || 50);

    const list: {
      category: string;
      sheetName: string;
      total: number;
      contacted: number;
      remaining: number;
      percent: number;
      daysToFinish: number;
      interested: number;
    }[] = [];

    map.forEach((sheetMap, cat) => {
      sheetMap.forEach((sheetLeads, sheetName) => {
        const total = sheetLeads.length;
        const contacted = sheetLeads.filter(
          (l) =>
            l.status !== 'New' ||
            (l.callLogs && l.callLogs.length > 0) ||
            Boolean(l.callResult)
        ).length;
        const remaining = Math.max(0, total - contacted);
        const percent = total > 0 ? Math.round((contacted / total) * 100) : 0;
        const daysToFinish = remaining === 0 ? 0 : Math.max(1, Math.ceil(remaining / dailyPace));
        const interested = sheetLeads.filter(
          (l) => l.status === 'Interested' || l.callResult === 'Interested'
        ).length;

        list.push({
          category: cat,
          sheetName,
          total,
          contacted,
          remaining,
          percent,
          daysToFinish,
          interested,
        });
      });
    });

    return list;
  }, [repFilteredLeads, dailyTarget?.contactsTarget]);

  // Aggregate category metrics across all sheets
  const categorySummaries = useMemo(() => {
    const catMap = new Map<
      string,
      { total: number; contacted: number; remaining: number; sheetsCount: number }
    >();

    repFilteredLeads.forEach((lead) => {
      const cat = (lead.groupName || 'General Leads').trim();
      if (!catMap.has(cat)) {
        catMap.set(cat, { total: 0, contacted: 0, remaining: 0, sheetsCount: 0 });
      }
      const entry = catMap.get(cat)!;
      entry.total++;
      const isContacted =
        lead.status !== 'New' ||
        (lead.callLogs && lead.callLogs.length > 0) ||
        Boolean(lead.callResult);
      if (isContacted) {
        entry.contacted++;
      } else {
        entry.remaining++;
      }
    });

    const dailyPace = Math.max(15, dailyTarget?.contactsTarget || 50);

    return Array.from(catMap.entries()).map(([name, data]) => ({
      name,
      ...data,
      percent: data.total > 0 ? Math.round((data.contacted / data.total) * 100) : 0,
      daysToFinish: data.remaining === 0 ? 0 : Math.max(1, Math.ceil(data.remaining / dailyPace)),
    }));
  }, [repFilteredLeads, dailyTarget?.contactsTarget]);

  // Targets definition
  const targets = [
    {
      label: 'Leads Researched',
      current: dailyMetrics.leadsResearched,
      target: 100,
      unit: '/ day',
      icon: Target,
      color: '#3b82f6',
    },
    {
      label: 'Quality Calls Made',
      current: dailyMetrics.qualityCallsMade,
      target: 60, // 50-70 target
      unit: 'target (50-70)',
      icon: PhoneCall,
      color: '#2563eb',
    },
    {
      label: 'Conversations Held',
      current: dailyMetrics.actualConversations,
      target: 20, // 15-25 target
      unit: 'target (15-25)',
      icon: MessageCircle,
      color: '#059669',
    },
    {
      label: 'WhatsApp Sent',
      current: dailyMetrics.whatsappSentCount,
      target: 8, // 5-10 target
      unit: 'target (5-10)',
      icon: MessageCircle,
      color: '#10b981',
    },
    {
      label: 'Demos / Audits Sent',
      current: dailyMetrics.demosSentCount,
      target: 3, // 2-5 target
      unit: 'target (2-5)',
      icon: Sparkles,
      color: '#8b5cf6',
    },
    {
      label: 'Discovery Calls Held',
      current: dailyMetrics.discoveryCallsHeld,
      target: 2, // 1-2 target
      unit: 'target (1-2)',
      icon: Calendar,
      color: '#ec4899',
    },
  ];

  // Pipeline Funnel Stage Counts
  const pipelineCounts = useMemo(() => {
    const counts: Record<PipelineStage, number> = {
      New: 0,
      Called: 0,
      Interested: 0,
      'Demo Sent': 0,
      'Discovery Call': 0,
      'Proposal Sent': 0,
      'Follow-up': 0,
      Won: 0,
      Lost: 0,
    };
    repFilteredLeads.forEach((lead) => {
      if (counts[lead.status] !== undefined) {
        counts[lead.status]++;
      }
    });
    return counts;
  }, [repFilteredLeads]);

  // Today's Actionable Tasks:
  // 1. Follow-up Calls Due Today
  const callsDueToday = useMemo(() => {
    return repFilteredLeads.filter((lead) => {
      if (lead.status === 'Won' || lead.status === 'Lost') return false;
      return lead.followUpDate === targetDateStr || (!lead.call1Date && lead.status === 'New');
    });
  }, [repFilteredLeads, targetDateStr]);

  // 2. WhatsApp Cadence Due Today
  const whatsappDueToday = useMemo(() => {
    const items: { lead: Lead; stepLabel: string; purpose: string; day: number; message: string }[] = [];
    repFilteredLeads.forEach((lead) => {
      if (!lead.demoSent || !lead.demoSentDate) return;
      if (lead.status === 'Won' || lead.status === 'Lost' || lead.status === 'Discovery Call') return;

      const cadence = getWhatsAppFollowUpCadence(lead, templates, new Date(targetDateStr));
      if (!cadence) return;

      cadence.forEach((step) => {
        const stepDueStr = step.dueDate.toISOString().slice(0, 10);
        if (stepDueStr === targetDateStr || (step.isOverdue && lead.status === 'Demo Sent')) {
          const msg = formatTemplate(step.template, lead, activeRep);
          items.push({
            lead,
            stepLabel: step.label,
            purpose: step.purpose,
            day: step.day,
            message: msg,
          });
        }
      });
    });
    return items;
  }, [repFilteredLeads, templates, targetDateStr, activeRep]);

  // 3. Discovery Calls Scheduled Today
  const discoveryCallsToday = useMemo(() => {
    return repFilteredLeads.filter((lead) => {
      return (
        lead.discoveryCallDate &&
        lead.discoveryCallDate.slice(0, 10) === targetDateStr
      );
    });
  }, [repFilteredLeads, targetDateStr]);

  const totalTasksToday =
    callsDueToday.length + whatsappDueToday.length + discoveryCallsToday.length;

  return (
    <div className="dashboard-root">
      {/* Date & Subheader Banner */}
      <div className="dashboard-header-banner card">
        <div className="banner-left">
          <div className="banner-badge">
            <span className="pulse-dot"></span>
            <span>Live Sales Cadence</span>
          </div>
          <h1 className="banner-title">
            {activeRep === 'All' || activeRep === 'All Reps'
              ? 'Team Sales Command'
              : `${activeRep}'s Sales Desk`}
          </h1>
          <p className="banner-subtext">
            {totalTasksToday > 0
              ? `You have ${totalTasksToday} high-priority tasks requiring action today.`
              : 'All scheduled follow-ups and calls are up to date for this date!'}
          </p>
        </div>

        <div className="banner-right">
          <div className="date-picker-box">
            <Calendar size={15} className="date-icon" />
            <input
              type="date"
              value={targetDateStr}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="dashboard-date-input"
            />
          </div>
          <button
            onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
            className="btn btn-secondary btn-sm"
          >
            Today
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. EXECUTIVE PERFORMANCE INSIGHTS: BEST DAY, AVG, PACE, TARGET */}
      {/* ========================================================= */}
      <div className="section-title-row">
        <div>
          <h2 className="section-title">Calling Velocity &amp; Benchmark Analytics</h2>
          <p className="section-sub">
            Track your all-time peak day, average call duration, pace per hour, and daily goals
          </p>
        </div>
      </div>

      <div className="exec-analytics-grid">
        {/* BEST DAY CARD */}
        <div className="exec-card best-day-card">
          <div className="exec-card-top">
            <div className="exec-icon-badge badge-trophy">
              <Trophy size={20} />
            </div>
            <span className="exec-pill-badge pill-trophy">All-Time Best</span>
          </div>
          <div className="exec-stat-label">Best Day</div>
          <div className="exec-stat-value">
            {analyticsSummary.bestDayDate
              ? new Date(analyticsSummary.bestDayDate).toLocaleDateString('en-IN', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })
              : 'Today'}
          </div>
          <div className="exec-stat-meta">
            <span>
              <strong>{analyticsSummary.bestDayCalls || analyticsSummary.todayCalls}</strong> calls logged
            </span>
            <span className="dot-sep">•</span>
            <span>
              <strong>{analyticsSummary.bestDayInterested}</strong> interested
            </span>
          </div>
        </div>

        {/* DAILY AVERAGE CARD */}
        <div className="exec-card">
          <div className="exec-card-top">
            <div className="exec-icon-badge badge-avg">
              <TrendingUp size={20} />
            </div>
            <span className="exec-pill-badge pill-avg">Performance Avg</span>
          </div>
          <div className="exec-stat-label">Daily Average &amp; Duration</div>
          <div className="exec-stat-value">
            {analyticsSummary.avgCallsPerDay} <small className="unit-small">calls/day</small>
          </div>
          <div className="exec-stat-meta">
            <span>
              Avg duration: <strong>{Math.floor(analyticsSummary.avgDurationSec / 60)}m {analyticsSummary.avgDurationSec % 60}s</strong>
            </span>
            <span className="dot-sep">•</span>
            <span>{analyticsSummary.totalCallsAllTime} total calls</span>
          </div>
        </div>

        {/* CALLING PACE CARD */}
        <div className="exec-card highlight-pace-exec">
          <div className="exec-card-top">
            <div className="exec-icon-badge badge-pace">
              <Zap size={20} />
            </div>
            <span className="exec-pill-badge pill-pace">Live Velocity</span>
          </div>
          <div className="exec-stat-label">Calling Pace</div>
          <div className="exec-stat-value">
            {analyticsSummary.callsPerHour} <small className="unit-small">calls/hour</small>
          </div>
          <div className="exec-stat-meta">
            <span>
              Today: <strong>{analyticsSummary.todayCalls}</strong> calls made
            </span>
            <span className="dot-sep">•</span>
            <span>Projected {Math.max(analyticsSummary.todayCalls, Math.round(Number(analyticsSummary.callsPerHour) * 5))} / day</span>
          </div>
        </div>

        {/* DAILY TARGET CARD */}
        <div
          className="exec-card target-exec-card"
          onClick={onOpenTargetModal}
          title="Click to adjust your daily contact or duration goal"
        >
          <div className="exec-card-top">
            <div className="exec-icon-badge badge-target">
              <Target size={20} />
            </div>
            <button type="button" className="btn-edit-target-link" onClick={onOpenTargetModal}>
              <Edit3 size={11} />
              <span>Edit Goal</span>
            </button>
          </div>
          <div className="exec-stat-label">Daily Target Progress</div>
          <div className="exec-stat-value">
            {Math.min(100, Math.round((analyticsSummary.todayCalls / (dailyTarget.contactsTarget || 50)) * 100))}%
          </div>
          <div className="exec-target-progress-bar">
            <div
              className="exec-target-progress-fill"
              style={{
                width: `${Math.min(
                  100,
                  Math.round((analyticsSummary.todayCalls / (dailyTarget.contactsTarget || 50)) * 100)
                )}%`,
              }}
            />
          </div>
          <div className="exec-stat-meta">
            <span>
              <strong>{analyticsSummary.todayCalls}</strong> / {dailyTarget.contactsTarget} calls
            </span>
            <span className="dot-sep">•</span>
            <span>Target: {dailyTarget.durationMinutesTarget}m</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. CATEGORY QUEUES & COMPLETION FORECAST                  */}
      {/* ========================================================= */}
      <div className="section-title-row" style={{ marginTop: '0.75rem' }}>
        <div>
          <h2 className="section-title">Categories & Industry Lists</h2>
          <p className="section-sub">
            Click any category to open immediately in 1-by-1 calling or view all leads
          </p>
        </div>
      </div>

      {categorySummaries.length > 0 ? (
        <div className="dashboard-cat-cards-grid">
          {categorySummaries.map((cat) => (
            <div key={cat.name} className="dashboard-cat-card">
              <div className="cat-card-top-row">
                <div className="cat-badge-wrap">
                  <Building2 size={16} className="text-blue" />
                  <span className="cat-title">{cat.name}</span>
                </div>
                <span className="cat-pending-tag">
                  {cat.remaining} pending
                </span>
              </div>

              <div className="cat-meta-stats">
                <span>Total: <strong>{cat.total}</strong></span>
                <span className="meta-sep">•</span>
                <span>Contacted: <strong className="text-emerald">{cat.contacted}</strong></span>
                <span className="meta-sep">•</span>
                <span>~{cat.daysToFinish} days</span>
              </div>

              <div className="cat-progress-track">
                <div className="cat-progress-bar" style={{ width: `${cat.percent}%` }} />
              </div>

              <div className="cat-quick-actions">
                <button
                  type="button"
                  onClick={() => onStartCallingSheet?.(cat.name, '')}
                  className="btn-cat-call"
                  title={`Start 1-by-1 calling queue for ${cat.name}`}
                >
                  <PhoneCall size={13} />
                  <span>Call 1-by-1</span>
                </button>

                <button
                  type="button"
                  onClick={() => onViewSheetLeads?.(cat.name, '')}
                  className="btn-cat-view"
                  title={`View all leads in ${cat.name}`}
                >
                  <Layers size={13} />
                  <span>All Leads</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card empty-forecast-msg" style={{ padding: '2rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <FolderOpen size={28} className="text-muted" />
          <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>
            No leads or categories uploaded yet.
          </span>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
            Go to <strong>Groups &amp; Sheets</strong> or click <strong>Bulk Upload Excel</strong> to import your first batch of leads.
          </p>
        </div>
      )}

      <div className="section-title-row" style={{ marginTop: '1.25rem' }}>
        <div>
          <h2 className="section-title">Category Sheets Completion Forecast</h2>
          <p className="section-sub">
            Calculated completion timeline for each uploaded Excel sheet based on your current calling pace
          </p>
        </div>
      </div>

      <div className="card category-sheets-forecast-card">
        {categorySheetForecasts.length === 0 ? (
          <div className="empty-forecast-msg">
            <FileSpreadsheet size={24} className="text-muted" />
            <span>Upload an Excel sheet to see days-to-finish projections per category.</span>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="forecast-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Sheet / Source</th>
                  <th>Total Leads</th>
                  <th>Contacted</th>
                  <th>Remaining</th>
                  <th>Progress</th>
                  <th>Days to Finish</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {categorySheetForecasts.map((row, rIdx) => (
                  <tr key={rIdx}>
                    <td>
                      <span className="cat-table-badge">{row.category}</span>
                    </td>
                    <td>
                      <div className="sheet-cell-title">
                        <FileSpreadsheet size={14} className="text-blue" />
                        <span className="sheet-cell-name">{row.sheetName}</span>
                      </div>
                    </td>
                    <td>
                      <strong>{row.total}</strong>
                    </td>
                    <td>
                      <span className="text-emerald font-semibold">{row.contacted}</span>
                    </td>
                    <td>
                      <span className="text-muted font-semibold">{row.remaining}</span>
                    </td>
                    <td style={{ minWidth: '130px' }}>
                      <div className="forecast-progress-wrap">
                        <div className="forecast-bar-track">
                          <div
                            className="forecast-bar-fill"
                            style={{ width: `${row.percent}%` }}
                          />
                        </div>
                        <span className="forecast-pct-num">{row.percent}%</span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`forecast-days-pill ${
                          row.daysToFinish === 0 ? 'pill-done' : 'pill-active-days'
                        }`}
                      >
                        {row.daysToFinish === 0
                          ? '✅ Completed'
                          : `⏱ ~${row.daysToFinish} ${row.daysToFinish === 1 ? 'Day' : 'Days'}`}
                      </span>
                    </td>
                    <td>
                      <div className="table-row-actions">
                        {onStartCallingSheet && (
                          <button
                            type="button"
                            onClick={() => onStartCallingSheet(row.category, row.sheetName)}
                            className="btn-table-call-sheet"
                            title="Call this sheet 1-by-1"
                          >
                            <PhoneCall size={12} />
                            <span>Call 1-by-1</span>
                          </button>
                        )}
                        {onViewSheetLeads && (
                          <button
                            type="button"
                            onClick={() => onViewSheetLeads(row.category, row.sheetName)}
                            className="btn-table-view-sheet"
                            title="View all leads in this sheet"
                          >
                            <Layers size={12} />
                            <span>All Leads</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section: Daily Funnel Targets & Counters */}
      <div className="section-title-row">
        <div>
          <h2 className="section-title">Daily Funnel Targets vs. Actuals</h2>
          <p className="section-sub">
            Track daily outbound volume benchmarks (Leads 100/d, Calls 50-70, Conv 15-25, WA 5-10, Demos 2-5, Discovery 1-2)
          </p>
        </div>
      </div>

      <div className="targets-grid">
        {targets.map((item, idx) => {
          const percent = Math.min(Math.round((item.current / item.target) * 100), 100);
          const isCompleted = item.current >= item.target;
          const Icon = item.icon;

          return (
            <div key={idx} className="card target-card">
              <div className="target-top">
                <div className="target-icon-box" style={{ background: `${item.color}15`, color: item.color }}>
                  <Icon size={18} />
                </div>
                <span className={`target-status-pill ${isCompleted ? 'completed' : ''}`}>
                  {isCompleted ? 'Goal Met' : `${percent}%`}
                </span>
              </div>

              <div className="target-values">
                <span className="target-current">{item.current}</span>
                <span className="target-max">/ {item.target}</span>
              </div>

              <div className="target-label-row">
                <span className="target-name">{item.label}</span>
                <span className="target-unit">{item.unit}</span>
              </div>

              <div className="target-progress-bar">
                <div
                  className="target-progress-fill"
                  style={{
                    width: `${percent}%`,
                    backgroundColor: isCompleted ? '#059669' : item.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Section: Pipeline Funnel Stage Overview */}
      <div className="card pipeline-funnel-card">
        <div className="pipeline-header">
          <div>
            <h3 className="pipeline-title">Pipeline Funnel Drop-off View</h3>
            <p className="pipeline-subtitle">
              Visualizing lead progression across sales stages (total {repFilteredLeads.length} active prospects)
            </p>
          </div>
          <div className="pipeline-won-box">
            <Award size={16} className="won-icon" />
            <span>
              Won Deals:{' '}
              <strong>{pipelineCounts['Won']}</strong> (
              {repFilteredLeads.length > 0
                ? Math.round((pipelineCounts['Won'] / repFilteredLeads.length) * 100)
                : 0}
              %)
            </span>
          </div>
        </div>

        <div className="pipeline-stages-flow">
          {PIPELINE_STAGES.map((stage, i) => {
            const count = pipelineCounts[stage] || 0;
            const prevStage = i > 0 ? PIPELINE_STAGES[i - 1] : null;
            const prevCount = prevStage ? pipelineCounts[prevStage] || 0 : 0;
            const isLast = i === PIPELINE_STAGES.length - 1;

            return (
              <React.Fragment key={stage}>
                <div className="stage-column">
                  <div className={`stage-counter-pill ${stage}`}>
                    <span className="stage-count">{count}</span>
                  </div>
                  <span className="stage-name">{stage}</span>
                </div>
                {!isLast && (
                  <div className="stage-arrow">
                    <ArrowRight size={13} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Section: Today's High-Priority Task List */}
      <div className="section-title-row" style={{ marginTop: '2rem' }}>
        <div>
          <h2 className="section-title">Today&apos;s Actionable Task List</h2>
          <p className="section-sub">
            Prioritized calling queue, scheduled discovery demos, and WhatsApp follow-up reminders
          </p>
        </div>
        <span className="badge badge-warm">
          {totalTasksToday} tasks scheduled for {targetDateStr}
        </span>
      </div>

      <div className="tasks-layout-grid">
        {/* Task Box 1: Scheduled Discovery Calls */}
        <div className="card task-column-card">
          <div className="task-col-header">
            <div className="task-col-title-group">
              <Calendar size={17} className="col-icon discovery" />
              <h3 className="task-col-title">Discovery Calls Scheduled</h3>
            </div>
            <span className="col-counter">{discoveryCallsToday.length}</span>
          </div>

          <div className="task-list">
            {discoveryCallsToday.length === 0 ? (
              <div className="empty-task-placeholder">
                <CheckCircle2 size={24} className="empty-icon" />
                <p>No discovery calls scheduled for this date.</p>
              </div>
            ) : (
              discoveryCallsToday.map((lead) => {
                const timeStr = lead.discoveryCallDate
                  ? new Date(lead.discoveryCallDate).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '';
                return (
                  <div key={lead.id} className="task-item-card">
                    <div className="task-item-header">
                      <div>
                        <span className="task-business-name">{lead.businessName}</span>
                        <div className="task-owner-meta">
                          {lead.ownerName && <span>{lead.ownerName} • </span>}
                          <span>{lead.city}</span>
                        </div>
                      </div>
                      <span className="badge badge-hot">
                        <Flame size={11} /> {lead.priority} ({lead.score})
                      </span>
                    </div>

                    <div className="task-time-row">
                      <Clock size={13} />
                      <span>Scheduled at: <strong>{timeStr || 'Time Not Set'}</strong></span>
                    </div>

                    {lead.requirement && (
                      <p className="task-requirement-snippet">
                        &quot;{lead.requirement}&quot;
                      </p>
                    )}

                    <div className="task-actions-row">
                      <button
                        onClick={() => onQuickCall(lead)}
                        className="btn btn-primary btn-sm"
                      >
                        <Phone size={13} /> Call
                      </button>
                      <button
                        onClick={() => onOpenLead(lead)}
                        className="btn btn-secondary btn-sm"
                      >
                        Open Lead
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Task Box 2: Calls Due Today */}
        <div className="card task-column-card">
          <div className="task-col-header">
            <div className="task-col-title-group">
              <PhoneCall size={17} className="col-icon calls" />
              <h3 className="task-col-title">Calls &amp; Callbacks Due</h3>
            </div>
            <span className="col-counter">{callsDueToday.length}</span>
          </div>

          <div className="task-list">
            {callsDueToday.length === 0 ? (
              <div className="empty-task-placeholder">
                <CheckCircle2 size={24} className="empty-icon" />
                <p>All calls &amp; follow-up callbacks cleared!</p>
              </div>
            ) : (
              callsDueToday.map((lead) => {
                const isNew = lead.status === 'New' && !lead.call1Date;
                return (
                  <div key={lead.id} className="task-item-card">
                    <div className="task-item-header">
                      <div>
                        <span className="task-business-name">{lead.businessName}</span>
                        <div className="task-owner-meta">
                          {lead.ownerName || 'Contact'} • {lead.phone}
                        </div>
                      </div>
                      <span
                        className={`badge ${
                          lead.priority === 'HOT'
                            ? 'badge-hot'
                            : lead.priority === 'WARM'
                            ? 'badge-warm'
                            : 'badge-cold'
                        }`}
                      >
                        {lead.priority} ({lead.score})
                      </span>
                    </div>

                    <div className="task-meta-row">
                      <span className={`stage-pill ${lead.status.replace(/\s+/g, '')}`}>
                        {lead.status}
                      </span>
                      {isNew ? (
                        <span className="task-tag-new">First Call Needed</span>
                      ) : (
                        <span className="task-tag-callback">Follow-up Call</span>
                      )}
                    </div>

                    {lead.notes && (
                      <p className="task-requirement-snippet">&quot;{lead.notes}&quot;</p>
                    )}

                    <div className="task-actions-row">
                      <button
                        onClick={() => onQuickCall(lead)}
                        className="btn btn-primary btn-sm"
                      >
                        <PhoneCall size={13} /> Log Call
                      </button>
                      <a
                        href={`tel:${cleanPhoneNumber(lead.phone)}`}
                        className="btn btn-secondary btn-sm"
                        title="Direct Dial"
                      >
                        <Phone size={13} /> Dial
                      </a>
                      <button
                        onClick={() => onOpenLead(lead)}
                        className="btn btn-secondary btn-sm"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Task Box 3: WhatsApp Cadence Due */}
        <div className="card task-column-card">
          <div className="task-col-header">
            <div className="task-col-title-group">
              <MessageCircle size={17} className="col-icon whatsapp" />
              <h3 className="task-col-title">WhatsApp Cadence Due</h3>
            </div>
            <span className="col-counter">{whatsappDueToday.length}</span>
          </div>

          <div className="task-list">
            {whatsappDueToday.length === 0 ? (
              <div className="empty-task-placeholder">
                <CheckCircle2 size={24} className="empty-icon" />
                <p>No automated WhatsApp follow-ups due today.</p>
              </div>
            ) : (
              whatsappDueToday.map((task, idx) => {
                const waLink = createWhatsAppLink(task.lead.phone, task.message);
                return (
                  <div key={`${task.lead.id}-${idx}`} className="task-item-card">
                    <div className="task-item-header">
                      <div>
                        <span className="task-business-name">
                          {task.lead.businessName}
                        </span>
                        <div className="task-owner-meta">
                          {task.lead.ownerName || 'Owner'} • {task.lead.phone}
                        </div>
                      </div>
                      <span className="cadence-step-tag">
                        Day {task.day} Cadence
                      </span>
                    </div>

                    <div className="cadence-purpose-box">
                      <span className="cadence-purpose-title">Purpose:</span>{' '}
                      {task.purpose}
                    </div>

                    <div className="message-preview-box">
                      <p className="message-text">&quot;{task.message}&quot;</p>
                    </div>

                    <div className="task-actions-row">
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-primary btn-sm wa-send-btn"
                      >
                        <MessageCircle size={13} /> Send WhatsApp
                      </a>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(task.message);
                          alert('WhatsApp message copied to clipboard!');
                        }}
                        className="btn btn-secondary btn-sm"
                      >
                        Copy Text
                      </button>
                      <button
                        onClick={() => onOpenLead(task.lead)}
                        className="btn btn-secondary btn-sm"
                      >
                        Lead
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .dashboard-root {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* EXECUTIVE ANALYTICS GRID: BEST DAY, AVG, PACE, TARGET */
        .exec-analytics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }
        @media (max-width: 950px) {
          .exec-analytics-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .exec-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 1.15rem 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          transition: all 0.2s ease;
        }
        .best-day-card {
          background: linear-gradient(135deg, #ffffff, #fef3c7);
          border-color: #fde68a;
        }
        .highlight-pace-exec {
          background: linear-gradient(135deg, #ffffff, #eff6ff);
          border-color: #bfdbfe;
        }
        .target-exec-card {
          cursor: pointer;
        }
        .target-exec-card:hover {
          border-color: #cbd5e1;
          transform: translateY(-1px);
        }
        .exec-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.2rem;
        }
        .exec-icon-badge {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .badge-trophy {
          background: #fef3c7;
          color: #d97706;
        }
        .badge-avg {
          background: #dcfce7;
          color: #15803d;
        }
        .badge-pace {
          background: #eff6ff;
          color: #1e50bc;
        }
        .badge-target {
          background: #ede9fe;
          color: #7c3aed;
        }
        .exec-pill-badge {
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 0.15rem 0.45rem;
          border-radius: 6px;
        }
        .pill-trophy {
          background: #fef3c7;
          color: #b45309;
        }
        .pill-avg {
          background: #dcfce7;
          color: #166534;
        }
        .pill-pace {
          background: #eff6ff;
          color: #1e40af;
        }
        .btn-edit-target-link {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          border: none;
          background: transparent;
          color: #7c3aed;
          font-size: 0.72rem;
          font-weight: 700;
          cursor: pointer;
        }
        .exec-stat-label {
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #64748b;
        }
        .exec-stat-value {
          font-size: 1.55rem;
          font-weight: 800;
          color: #0b1d33;
          letter-spacing: -0.02em;
        }
        .unit-small {
          font-size: 0.8rem;
          font-weight: 600;
          color: #64748b;
        }
        .exec-stat-meta {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.76rem;
          color: #64748b;
          margin-top: 0.15rem;
        }
        .dot-sep {
          color: #cbd5e1;
        }
        .exec-target-progress-bar {
          height: 6px;
          background: #e2e8f0;
          border-radius: 999px;
          overflow: hidden;
          margin: 0.15rem 0;
        }
        .exec-target-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #7c3aed, #3b82f6);
          border-radius: 999px;
        }

        /* CATEGORY SHEETS COMPLETION FORECAST */
        .category-sheets-forecast-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 1.25rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }
        .forecast-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.84rem;
        }
        .forecast-table th {
          text-align: left;
          padding: 0.65rem 0.85rem;
          color: #64748b;
          font-weight: 700;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
        }
        .forecast-table td {
          padding: 0.75rem 0.85rem;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }
        .forecast-table tr:hover td {
          background: #f8fafc;
        }
        .cat-table-badge {
          font-size: 0.75rem;
          font-weight: 700;
          background: #eff6ff;
          color: #1e50bc;
          padding: 0.2rem 0.55rem;
          border-radius: 6px;
        }
        .sheet-cell-title {
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }
        .sheet-cell-name {
          font-weight: 700;
          color: #0b1d33;
        }
        .forecast-progress-wrap {
          display: flex;
          align-items: center;
          gap: 0.55rem;
        }
        .forecast-bar-track {
          flex: 1;
          height: 6px;
          background: #e2e8f0;
          border-radius: 999px;
          overflow: hidden;
        }
        .forecast-bar-fill {
          height: 100%;
          background: #3b82f6;
          border-radius: 999px;
        }
        .forecast-pct-num {
          font-size: 0.75rem;
          font-weight: 700;
          color: #64748b;
          min-width: 32px;
        }
        .forecast-days-pill {
          font-size: 0.76rem;
          font-weight: 700;
          padding: 0.2rem 0.6rem;
          border-radius: 6px;
          display: inline-block;
        }
        .pill-done {
          background: #dcfce7;
          color: #15803d;
        }
        .pill-active-days {
          background: #fef3c7;
          color: #b45309;
        }
        .table-row-actions {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .btn-table-call-sheet {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.38rem 0.75rem;
          border-radius: 6px;
          border: none;
          background: #1e50bc;
          color: #ffffff;
          font-size: 0.76rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .btn-table-call-sheet:hover {
          background: #18429c;
        }
        .btn-table-view-sheet {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.38rem 0.65rem;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #475569;
          font-size: 0.76rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .btn-table-view-sheet:hover {
          background: #f8fafc;
          color: #0b1d33;
          border-color: #94a3b8;
        }
        /* CATEGORY CARDS GRID */
        .dashboard-cat-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .dashboard-cat-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.15rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .dashboard-cat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        .cat-card-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .cat-badge-wrap {
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }
        .cat-title {
          font-size: 1rem;
          font-weight: 800;
          color: #0b1d33;
        }
        .cat-pending-tag {
          font-size: 0.72rem;
          font-weight: 700;
          background: #fef3c7;
          color: #b45309;
          padding: 0.2rem 0.5rem;
          border-radius: 9999px;
        }
        .cat-meta-stats {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.78rem;
          color: #64748b;
        }
        .meta-sep {
          color: #cbd5e1;
        }
        .cat-progress-track {
          width: 100%;
          height: 6px;
          background: #e2e8f0;
          border-radius: 999px;
          overflow: hidden;
        }
        .cat-progress-bar {
          height: 100%;
          background: #22c55e;
          border-radius: 999px;
        }
        .cat-quick-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.25rem;
        }
        .btn-cat-call {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          background: #1e50bc;
          color: #ffffff;
          border: none;
          padding: 0.45rem 0.75rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-cat-call:hover {
          background: #1742a0;
        }
        .btn-cat-view {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          background: #f8fafc;
          color: #475569;
          border: 1px solid #cbd5e1;
          padding: 0.45rem 0.75rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-cat-view:hover {
          background: #f1f5f9;
          color: #0b1d33;
        }
        .empty-forecast-msg {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 2.5rem 1rem;
          color: #64748b;
          font-size: 0.9rem;
        }
        .dashboard-header-banner {
          padding: 1.25rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%);
          border-left: 4px solid var(--brand-blue);
          gap: 1.5rem;
        }
        .banner-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--brand-blue);
          background: #eff6ff;
          border: 1px solid var(--brand-border);
          padding: 0.15rem 0.5rem;
          border-radius: var(--radius-full);
          margin-bottom: 0.4rem;
        }
        .banner-title {
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--brand-navy);
          margin-bottom: 0.2rem;
        }
        .banner-subtext {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .banner-right {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .date-picker-box {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: #ffffff;
          border: 1px solid var(--border);
          padding: 0.35rem 0.6rem;
          border-radius: var(--radius-sm);
        }
        .date-icon {
          color: var(--text-muted);
        }
        .dashboard-date-input {
          border: none;
          outline: none;
          font-size: 0.83rem;
          font-weight: 500;
          color: var(--text-primary);
          background: transparent;
          cursor: pointer;
        }
        .section-title-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: -0.5rem;
        }
        .section-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--brand-navy);
        }
        .section-sub {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .targets-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 0.85rem;
        }
        .target-card {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .target-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .target-icon-box {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .target-status-pill {
          font-size: 0.7rem;
          font-weight: 600;
          padding: 0.15rem 0.45rem;
          border-radius: var(--radius-full);
          background: #f1f5f9;
          color: var(--text-secondary);
        }
        .target-status-pill.completed {
          background: #ecfdf5;
          color: #059669;
        }
        .target-values {
          display: flex;
          align-items: baseline;
          gap: 0.3rem;
        }
        .target-current {
          font-size: 1.6rem;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1;
        }
        .target-max {
          font-size: 0.85rem;
          color: var(--text-muted);
          font-weight: 500;
        }
        .target-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.75rem;
        }
        .target-name {
          font-weight: 600;
          color: var(--text-secondary);
        }
        .target-unit {
          color: var(--text-muted);
          font-size: 0.7rem;
        }
        .target-progress-bar {
          width: 100%;
          height: 5px;
          background: #f1f5f9;
          border-radius: 99px;
          overflow: hidden;
          margin-top: 0.2rem;
        }
        .target-progress-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 0.3s ease;
        }
        .pipeline-funnel-card {
          padding: 1.25rem 1.5rem;
        }
        .pipeline-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.25rem;
        }
        .pipeline-title {
          font-size: 0.98rem;
          font-weight: 700;
          color: var(--brand-navy);
        }
        .pipeline-subtitle {
          font-size: 0.78rem;
          color: var(--text-muted);
        }
        .pipeline-won-box {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.82rem;
          color: #047857;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          padding: 0.3rem 0.7rem;
          border-radius: var(--radius-sm);
        }
        .won-icon {
          color: #059669;
        }
        .pipeline-stages-flow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          overflow-x: auto;
          padding-bottom: 0.5rem;
          gap: 0.4rem;
        }
        .stage-column {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.35rem;
          min-width: 78px;
        }
        .stage-counter-pill {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          border: 2px solid #e2e8f0;
          box-shadow: var(--shadow-xs);
          transition: transform 0.15s ease;
        }
        .stage-counter-pill:hover {
          transform: translateY(-2px);
        }
        .stage-counter-pill.Won {
          background: #ecfdf5;
          border-color: #34d399;
          color: #047857;
        }
        .stage-counter-pill.Interested {
          border-color: #60a5fa;
          color: #1d4ed8;
        }
        .stage-count {
          font-weight: 700;
          font-size: 1rem;
        }
        .stage-name {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-align: center;
          white-space: nowrap;
        }
        .stage-arrow {
          color: var(--text-muted);
          opacity: 0.6;
          margin-bottom: 1.2rem;
        }
        .tasks-layout-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }
        .task-column-card {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          min-height: 380px;
        }
        .task-col-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: 0.65rem;
        }
        .task-col-title-group {
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }
        .col-icon.discovery { color: #ec4899; }
        .col-icon.calls { color: #2563eb; }
        .col-icon.whatsapp { color: #10b981; }
        .task-col-title {
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--brand-navy);
        }
        .col-counter {
          background: #f1f5f9;
          color: var(--text-secondary);
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.15rem 0.5rem;
          border-radius: var(--radius-full);
        }
        .task-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          overflow-y: auto;
          max-height: 480px;
          padding-right: 0.2rem;
        }
        .empty-task-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1rem;
          text-align: center;
          color: var(--text-muted);
          gap: 0.6rem;
          font-size: 0.83rem;
        }
        .empty-icon {
          color: #10b981;
          opacity: 0.7;
        }
        .task-item-card {
          background: #ffffff;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 0.85rem;
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .task-item-card:hover {
          border-color: #cbd5e1;
          box-shadow: var(--shadow-sm);
        }
        .task-item-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.5rem;
        }
        .task-business-name {
          font-weight: 700;
          font-size: 0.88rem;
          color: var(--brand-navy);
          display: block;
        }
        .task-owner-meta {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .task-time-row {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.78rem;
          color: #be185d;
          background: #fdf2f8;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }
        .task-requirement-snippet {
          font-size: 0.75rem;
          color: var(--text-secondary);
          font-style: italic;
          background: #f8fafc;
          padding: 0.35rem 0.5rem;
          border-radius: 4px;
          border-left: 2px solid var(--border);
        }
        .task-meta-row {
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }
        .task-tag-new {
          font-size: 0.7rem;
          font-weight: 600;
          color: #2563eb;
          background: #eff6ff;
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
        }
        .task-tag-callback {
          font-size: 0.7rem;
          font-weight: 600;
          color: #d97706;
          background: #fffbeb;
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
        }
        .cadence-step-tag {
          font-size: 0.7rem;
          font-weight: 700;
          color: #047857;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
        }
        .cadence-purpose-box {
          font-size: 0.73rem;
          color: var(--text-secondary);
        }
        .cadence-purpose-title {
          font-weight: 600;
          color: var(--text-primary);
        }
        .message-preview-box {
          background: #f8fafc;
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 0.45rem 0.55rem;
        }
        .message-text {
          font-size: 0.73rem;
          color: var(--text-secondary);
          font-family: inherit;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .task-actions-row {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          margin-top: 0.2rem;
        }
        .wa-send-btn {
          background: #10b981;
          border-color: #10b981;
          color: #ffffff;
        }
        .wa-send-btn:hover {
          background: #059669;
          border-color: #059669;
        }
        @media (max-width: 1024px) {
          .tasks-layout-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 640px) {
          .dashboard-header-banner {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
