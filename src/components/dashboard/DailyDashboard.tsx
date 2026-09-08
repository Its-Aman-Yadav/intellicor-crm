'use client';

import React, { useMemo } from 'react';
import {
  Lead,
  PIPELINE_STAGES,
  PipelineStage,
  WhatsAppTemplate,
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
