'use client';

import React, { useMemo, useState } from 'react';
import {
  Lead,
  PIPELINE_STAGES,
  PipelineStage,
  WhatsAppTemplate,
  UserDailyTarget,
  TodoItem,
  TodoPriority,
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
  PhoneForwarded,
  MessageCircle,
  Calendar,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
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
  CheckSquare,
  ListTodo,
  Plus,
  Trash2,
  Check,
  RotateCcw,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { getDailyMotivationalQuote } from '@/data/motivationalQuotes';

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
  todos?: TodoItem[];
  onSaveTodo?: (todo: TodoItem) => void;
  onToggleTodo?: (todoId: string) => void;
  onDeleteTodo?: (todoId: string) => void;
  onUpdateLead?: (lead: Lead) => void;
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
  todos = [],
  onSaveTodo,
  onToggleTodo,
  onDeleteTodo,
  onUpdateLead,
}: DailyDashboardProps) {
  // Filter leads by rep if not "All Reps"
  const repFilteredLeads = useMemo(() => {
    if (activeRep === 'All' || activeRep === 'All Reps') return leads;
    return leads.filter((l) => l.assignedRep === activeRep);
  }, [leads, activeRep]);

  // Selected date normalization (YYYY-MM-DD)
  const targetDateStr = selectedDate || new Date().toISOString().slice(0, 10);

  // Dynamic Motivational Quote state (rotates 3x daily across 50 quotes with on-demand cycle)
  const [quoteOffset, setQuoteOffset] = useState<number>(0);
  const { quote: currentQuote, slotInfo, quoteNumber } = useMemo(() => {
    return getDailyMotivationalQuote(quoteOffset);
  }, [quoteOffset]);

  // Formatted date string for human readability
  const formattedDisplayDate = useMemo(() => {
    try {
      const parts = targetDateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
    } catch {}
    return targetDateStr;
  }, [targetDateStr]);

  const isSelectedDateToday = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return targetDateStr === todayStr;
  }, [targetDateStr]);

  const handleShiftDate = (days: number) => {
    try {
      const parts = targetDateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        d.setDate(d.getDate() + days);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        setSelectedDate(`${y}-${m}-${day}`);
      }
    } catch {}
  };

  const repDisplayName = useMemo(() => {
    if (!activeRep || activeRep === 'All' || activeRep === 'All Reps') {
      return 'Closer';
    }
    return activeRep;
  }, [activeRep]);

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

  // =========================================================
  // ACTIONABLE TASKS: FOLLOW-UPS, MANUAL TO-DOS & CADENCE
  // =========================================================
  const getDaysDiff = (dateStr?: string) => {
    if (!dateStr) return 0;
    const target = new Date(targetDateStr).getTime();
    const d = new Date(dateStr.slice(0, 10)).getTime();
    return Math.round((target - d) / (1000 * 60 * 60 * 24));
  };

  // 1. Follow-up Calls & Callbacks
  const followUpData = useMemo(() => {
    const overdue: Lead[] = [];
    const today: Lead[] = [];
    const callbacks: Lead[] = [];
    const upcoming: Lead[] = [];

    repFilteredLeads.forEach((lead) => {
      if (lead.status === 'Won' || lead.status === 'Lost' || lead.callResult === 'Deal Won') return;

      const fDate = lead.followUpDate ? lead.followUpDate.slice(0, 10) : '';

      if (fDate) {
        if (fDate < targetDateStr) {
          overdue.push(lead);
        } else if (fDate === targetDateStr) {
          today.push(lead);
        } else {
          upcoming.push(lead);
        }
      } else if (
        lead.status === 'Follow-up' ||
        lead.callResult === 'Callback' ||
        lead.callResult === 'Call Back Later'
      ) {
        callbacks.push(lead);
      }
    });

    // Sort overdue by oldest first
    overdue.sort((a, b) => (a.followUpDate || '').localeCompare(b.followUpDate || ''));
    // Sort today by priority/score
    today.sort((a, b) => (b.score || 0) - (a.score || 0));

    // Actionable follow-ups: Overdue + Today + Callbacks without explicit date
    const actionable = [...overdue, ...today, ...callbacks];

    return {
      overdue,
      today,
      callbacks,
      upcoming,
      actionable,
    };
  }, [repFilteredLeads, targetDateStr]);

  const [followUpFilter, setFollowUpFilter] = useState<'actionable' | 'today' | 'overdue' | 'callbacks' | 'upcoming'>('actionable');

  const displayedFollowUps = useMemo(() => {
    switch (followUpFilter) {
      case 'today':
        return followUpData.today;
      case 'overdue':
        return followUpData.overdue;
      case 'callbacks':
        return followUpData.callbacks;
      case 'upcoming':
        return followUpData.upcoming;
      case 'actionable':
      default:
        return followUpData.actionable;
    }
  }, [followUpData, followUpFilter]);

  // 2. Manual To-Do List state and management
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState<TodoPriority>('MEDIUM');
  const [newTodoDueDate, setNewTodoDueDate] = useState(targetDateStr);
  const [todoFilter, setTodoFilter] = useState<'pending' | 'completed' | 'all'>('pending');

  const repTodos = useMemo(() => {
    if (!todos) return [];
    if (activeRep === 'All' || activeRep === 'All Reps') return todos;
    return todos.filter((t) => !t.repName || t.repName === activeRep);
  }, [todos, activeRep]);

  const filteredTodos = useMemo(() => {
    if (todoFilter === 'pending') {
      return repTodos.filter((t) => !t.completed);
    }
    if (todoFilter === 'completed') {
      return repTodos.filter((t) => t.completed);
    }
    return repTodos;
  }, [repTodos, todoFilter]);

  const pendingTodosCount = repTodos.filter((t) => !t.completed).length;
  const completedTodosCount = repTodos.filter((t) => t.completed).length;

  const handleAddTodoSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTodoTitle.trim()) return;

    const newTodo: TodoItem = {
      id: `todo-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title: newTodoTitle.trim(),
      completed: false,
      priority: newTodoPriority,
      dueDate: newTodoDueDate || targetDateStr,
      repName: activeRep !== 'All' && activeRep !== 'All Reps' ? activeRep : undefined,
      createdAt: new Date().toISOString(),
    };

    if (onSaveTodo) {
      onSaveTodo(newTodo);
    }
    setNewTodoTitle('');
    setNewTodoPriority('MEDIUM');
  };

  const handleQuickRescheduleLead = (lead: Lead, daysToAdd: number) => {
    const nextDate = new Date(Date.now() + daysToAdd * 86400000).toISOString().slice(0, 10);
    const updatedLead: Lead = {
      ...lead,
      followUpDate: nextDate,
      status: 'Follow-up',
      updatedAt: new Date().toISOString(),
    };
    if (onUpdateLead) {
      onUpdateLead(updatedLead);
    }
  };

  const createFollowUpWhatsAppLink = (lead: Lead) => {
    const greeting = lead.ownerName ? `Hi ${lead.ownerName},` : `Hi,`;
    const msg = `${greeting} following up from our earlier call regarding digital & web presence for ${lead.businessName}. Are you free for a quick 2-minute chat today?`;
    return createWhatsAppLink(lead.phone, msg);
  };

  // 3. WhatsApp Cadence Due Today
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

  // 4. Discovery Calls Scheduled Today
  const discoveryCallsToday = useMemo(() => {
    return repFilteredLeads.filter((lead) => {
      return (
        lead.discoveryCallDate &&
        lead.discoveryCallDate.slice(0, 10) === targetDateStr
      );
    });
  }, [repFilteredLeads, targetDateStr]);

  const totalTasksToday =
    followUpData.actionable.length +
    pendingTodosCount +
    discoveryCallsToday.length +
    whatsappDueToday.length;

  return (
    <div className="dashboard-root">
      {/* Date & Dynamic Motivational Quote Banner */}
      <div className="dashboard-header-banner card">
        {/* LEFT: Greeting of the Day & Live Session */}
        <div className="banner-greeting-col">
          <div className="banner-live-badge">
            <span className="pulse-dot"></span>
            <span className="slot-badge-icon">{slotInfo.icon}</span>
            <span>{slotInfo.label}</span>
            <span className="cadence-sep">•</span>
            <span className="cadence-time">{slotInfo.timeRange}</span>
          </div>

          <h1 className="banner-greeting-title">
            {slotInfo.greeting},{' '}
            <span className="greeting-name">{repDisplayName}</span>!
          </h1>

          <div className="banner-status-meta">
            <span className="meta-date">{formattedDisplayDate}</span>
            <span className="meta-dot">•</span>
            <span className={`meta-tasks-count ${totalTasksToday > 0 ? 'has-tasks' : 'all-clear'}`}>
              {totalTasksToday > 0
                ? `${totalTasksToday} priority tasks due`
                : '✓ All follow-ups up to date'}
            </span>
          </div>
        </div>

        {/* CENTER: Dynamic Motivational Money & Consistency Quote */}
        <div className="banner-quote-capsule">
          <div className="quote-top-bar">
            <div className="quote-theme-tag">
              <span className="quote-theme-icon">💰</span>
              <span>{currentQuote.theme}</span>
            </div>
            <div className="quote-slot-indicator">
              <span className="quote-cycle-text">Quote #{quoteNumber} of 50 • Changes 3x Daily</span>
              <button
                type="button"
                onClick={() => setQuoteOffset((prev) => prev + 1)}
                className="btn-quote-shuffle"
                title="Shuffle for a fresh quote"
              >
                <RotateCcw size={11} className="rotate-icon" />
                <span>Next</span>
              </button>
            </div>
          </div>

          <div className="quote-body-wrap">
            <p className="quote-body-text">
              &ldquo;{currentQuote.quote}&rdquo;
            </p>
          </div>

          <div className="quote-footer-bar">
            <span className="quote-author-tag">— {currentQuote.author}</span>
            <span className="quote-slot-name">
              {slotInfo.icon} {slotInfo.label} Edition
            </span>
          </div>
        </div>

        {/* RIGHT: Compact, Sleek Date Controller */}
        <div className="banner-date-col">
          <div className="date-controller-card">
            <div className="date-controller-header">
              <span className="date-ctrl-label">Date Filter</span>
              {isSelectedDateToday ? (
                <span className="date-today-badge active">Today</span>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
                  className="btn-jump-today"
                  title="Jump to today's date"
                >
                  Jump to Today
                </button>
              )}
            </div>

            <div className="date-picker-nav-row">
              <button
                type="button"
                onClick={() => handleShiftDate(-1)}
                className="btn-date-nav"
                title="Previous Day"
              >
                <ChevronLeft size={14} />
              </button>
              <div className="date-picker-box">
                <Calendar size={13} className="date-icon" />
                <input
                  type="date"
                  value={targetDateStr}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="dashboard-date-input"
                />
              </div>
              <button
                type="button"
                onClick={() => handleShiftDate(1)}
                className="btn-date-nav"
                title="Next Day"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
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
            Follow-up callbacks queue, manual to-do planner, scheduled discovery demos, and WhatsApp reminders
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className="badge badge-warm">
            {totalTasksToday} actionable items for {targetDateStr}
          </span>
          {followUpData.overdue.length > 0 && (
            <span className="badge badge-urgent-pulse">
              <AlertTriangle size={12} /> {followUpData.overdue.length} Overdue Callbacks
            </span>
          )}
        </div>
      </div>

      <div className="tasks-layout-grid">
        {/* ========================================================================= */}
        {/* TASK BOX 1: FOLLOW-UPS TO CALL (Calls & Callbacks Due) */}
        {/* ========================================================================= */}
        <div className="card task-column-card">
          <div className="task-col-header">
            <div className="task-col-title-group">
              <PhoneForwarded size={17} className="col-icon calls" />
              <div>
                <h3 className="task-col-title">Follow-ups &amp; Callbacks to Call</h3>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {followUpData.overdue.length > 0 && (
                <span className="col-counter overdue-alert" title="Overdue follow-ups needing immediate call">
                  {followUpData.overdue.length} Overdue
                </span>
              )}
              <span className="col-counter">{displayedFollowUps.length}</span>
            </div>
          </div>

          {/* Sub-filter tabs for Follow-ups */}
          <div className="followup-filter-bar">
            <button
              onClick={() => setFollowUpFilter('actionable')}
              className={`filter-pill-btn ${followUpFilter === 'actionable' ? 'is-active' : ''}`}
            >
              Due &amp; Overdue ({followUpData.actionable.length})
            </button>
            <button
              onClick={() => setFollowUpFilter('today')}
              className={`filter-pill-btn ${followUpFilter === 'today' ? 'is-active' : ''}`}
            >
              Today ({followUpData.today.length})
            </button>
            {followUpData.overdue.length > 0 && (
              <button
                onClick={() => setFollowUpFilter('overdue')}
                className={`filter-pill-btn is-overdue-pill ${followUpFilter === 'overdue' ? 'is-active' : ''}`}
              >
                ⚠️ Overdue ({followUpData.overdue.length})
              </button>
            )}
            <button
              onClick={() => setFollowUpFilter('callbacks')}
              className={`filter-pill-btn ${followUpFilter === 'callbacks' ? 'is-active' : ''}`}
            >
              Callbacks ({followUpData.callbacks.length})
            </button>
            {followUpData.upcoming.length > 0 && (
              <button
                onClick={() => setFollowUpFilter('upcoming')}
                className={`filter-pill-btn ${followUpFilter === 'upcoming' ? 'is-active' : ''}`}
              >
                Upcoming ({followUpData.upcoming.length})
              </button>
            )}
          </div>

          <div className="task-list">
            {displayedFollowUps.length === 0 ? (
              <div className="empty-task-placeholder">
                <CheckCircle2 size={28} className="empty-icon" />
                <p style={{ fontWeight: 600, color: 'var(--brand-navy)' }}>
                  All follow-up callbacks cleared!
                </p>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  No pending follow-ups in this filter for {targetDateStr}.
                </span>
                <button
                  onClick={onOpenNewLead}
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: '0.5rem' }}
                >
                  <Plus size={13} /> Add New Lead
                </button>
              </div>
            ) : (
              displayedFollowUps.map((lead) => {
                const diffDays = getDaysDiff(lead.followUpDate);
                const isOverdueLead = lead.followUpDate && diffDays > 0;
                const isTodayLead = lead.followUpDate && diffDays === 0;
                const isUpcomingLead = lead.followUpDate && diffDays < 0;
                const waLink = createFollowUpWhatsAppLink(lead);

                return (
                  <div key={lead.id} className={`task-item-card ${isOverdueLead ? 'border-overdue-lead' : ''}`}>
                    <div className="task-item-header">
                      <div>
                        <span
                          className="task-business-name cursor-pointer"
                          onClick={() => onOpenLead(lead)}
                          title="Click to view lead details"
                        >
                          {lead.businessName}
                        </span>
                        <div className="task-owner-meta">
                          {lead.ownerName ? `${lead.ownerName} • ` : ''}
                          <span style={{ fontFamily: 'monospace' }}>{lead.phone}</span>
                          {lead.city && <span> • {lead.city}</span>}
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

                    {/* Urgency and Follow-up Badge */}
                    <div className="task-meta-row">
                      {isOverdueLead && (
                        <span className="urgency-tag-overdue">
                          <AlertTriangle size={11} /> {diffDays} {diffDays === 1 ? 'day' : 'days'} overdue ({lead.followUpDate})
                        </span>
                      )}
                      {isTodayLead && (
                        <span className="urgency-tag-today">
                          <Clock size={11} /> Due Today {lead.followUpTime ? `@ ${lead.followUpTime}` : ''}
                        </span>
                      )}
                      {!lead.followUpDate && (
                        <span className="urgency-tag-callback">
                          <PhoneCall size={11} /> Callback Requested
                        </span>
                      )}
                      {isUpcomingLead && (
                        <span className="urgency-tag-upcoming">
                          <Calendar size={11} /> Scheduled for {lead.followUpDate}
                        </span>
                      )}
                      <span className={`stage-pill ${lead.status.replace(/\s+/g, '')}`}>
                        {lead.status}
                      </span>
                    </div>

                    {/* Note / Context snippet */}
                    {(lead.notes || lead.requirement) && (
                      <p className="task-requirement-snippet">
                        &quot;{lead.notes || lead.requirement}&quot;
                      </p>
                    )}

                    {/* Action buttons */}
                    <div className="task-actions-row">
                      <button
                        onClick={() => onQuickCall(lead)}
                        className="btn btn-primary btn-sm"
                        title="Open Quick Dial & Log Screen"
                      >
                        <PhoneCall size={13} /> Call Now
                      </button>
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-sm wa-send-btn"
                        title="Send warm follow-up WhatsApp message"
                      >
                        <MessageCircle size={13} /> WhatsApp
                      </a>
                      <a
                        href={`tel:${cleanPhoneNumber(lead.phone)}`}
                        className="btn btn-secondary btn-sm"
                        title="Direct Phone Call"
                      >
                        <Phone size={13} /> Dial
                      </a>

                      {/* Quick reschedule options */}
                      <div className="reschedule-dropdown-wrap">
                        <button
                          onClick={() => handleQuickRescheduleLead(lead, 1)}
                          className="btn btn-secondary btn-sm"
                          title="Postpone follow-up to tomorrow"
                        >
                          +1d
                        </button>
                        <button
                          onClick={() => handleQuickRescheduleLead(lead, 2)}
                          className="btn btn-secondary btn-sm"
                          title="Postpone follow-up by 2 days"
                        >
                          +2d
                        </button>
                      </div>

                      <button
                        onClick={() => onOpenLead(lead)}
                        className="btn btn-secondary btn-sm"
                        title="View Full Lead Profile"
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

        {/* ========================================================================= */}
        {/* TASK BOX 2: MANUAL TO-DO LIST SECTION */}
        {/* ========================================================================= */}
        <div className="card task-column-card">
          <div className="task-col-header">
            <div className="task-col-title-group">
              <ListTodo size={17} className="col-icon todos" />
              <div>
                <h3 className="task-col-title">Manual To-Do List</h3>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="col-counter todos-counter">{pendingTodosCount} Pending</span>
            </div>
          </div>

          {/* Quick Add To-Do Input Form */}
          <form onSubmit={handleAddTodoSubmit} className="todo-quick-add-form">
            <div className="todo-input-wrap">
              <input
                type="text"
                placeholder="Add a new to-do (e.g. Send updated pricing to Sunil)..."
                value={newTodoTitle}
                onChange={(e) => setNewTodoTitle(e.target.value)}
                className="todo-text-input"
              />
            </div>
            <div className="todo-form-controls">
              <select
                value={newTodoPriority}
                onChange={(e) => setNewTodoPriority(e.target.value as TodoPriority)}
                className="todo-priority-select"
                title="Priority"
              >
                <option value="HIGH">🔥 High Priority</option>
                <option value="MEDIUM">⚡ Medium</option>
                <option value="LOW">🌱 Low</option>
              </select>

              <input
                type="date"
                value={newTodoDueDate}
                onChange={(e) => setNewTodoDueDate(e.target.value)}
                className="todo-date-input"
                title="Due Date"
              />

              <button
                type="submit"
                disabled={!newTodoTitle.trim()}
                className="btn btn-primary btn-sm todo-add-btn"
              >
                <Plus size={14} /> Add Task
              </button>
            </div>
          </form>

          {/* Filter Pills for To-Dos */}
          <div className="followup-filter-bar">
            <button
              onClick={() => setTodoFilter('pending')}
              className={`filter-pill-btn ${todoFilter === 'pending' ? 'is-active' : ''}`}
            >
              Pending ({pendingTodosCount})
            </button>
            <button
              onClick={() => setTodoFilter('completed')}
              className={`filter-pill-btn ${todoFilter === 'completed' ? 'is-active' : ''}`}
            >
              Completed ({completedTodosCount})
            </button>
            <button
              onClick={() => setTodoFilter('all')}
              className={`filter-pill-btn ${todoFilter === 'all' ? 'is-active' : ''}`}
            >
              All Tasks ({repTodos.length})
            </button>
          </div>

          <div className="task-list">
            {filteredTodos.length === 0 ? (
              <div className="empty-task-placeholder">
                <CheckCircle2 size={28} className="empty-icon" />
                <p style={{ fontWeight: 600, color: 'var(--brand-navy)' }}>
                  {todoFilter === 'completed' ? 'No completed tasks yet' : 'All manual to-dos completed!'}
                </p>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {todoFilter === 'completed'
                    ? 'Check off tasks above to see them in this history.'
                    : 'Type a task above and press Enter to keep your daily sales agenda organized.'}
                </span>
              </div>
            ) : (
              filteredTodos.map((todo) => {
                const diffDays = getDaysDiff(todo.dueDate);
                const isOverdueTodo = !todo.completed && todo.dueDate && diffDays > 0;
                const isTodayTodo = !todo.completed && todo.dueDate && diffDays === 0;

                return (
                  <div
                    key={todo.id}
                    className={`todo-item-card ${todo.completed ? 'is-done-card' : ''}`}
                  >
                    <div className="todo-item-main">
                      <button
                        type="button"
                        onClick={() => onToggleTodo && onToggleTodo(todo.id)}
                        className={`todo-custom-checkbox ${todo.completed ? 'checked' : ''}`}
                        title={todo.completed ? 'Mark uncompleted' : 'Mark completed'}
                      >
                        {todo.completed && <Check size={12} className="check-mark" />}
                      </button>

                      <div className="todo-content-col">
                        <span className={`todo-title ${todo.completed ? 'is-strikethrough' : ''}`}>
                          {todo.title}
                        </span>

                        <div className="todo-meta-tags">
                          <span className={`todo-priority-badge ${todo.priority.toLowerCase()}`}>
                            {todo.priority === 'HIGH' ? '🔥 HIGH' : todo.priority === 'MEDIUM' ? '⚡ MED' : '🌱 LOW'}
                          </span>

                          {todo.dueDate && (
                            <span
                              className={`todo-date-badge ${
                                isOverdueTodo ? 'is-overdue' : isTodayTodo ? 'is-today' : ''
                              }`}
                            >
                              <Calendar size={10} />
                              {isOverdueTodo
                                ? `Overdue (${todo.dueDate})`
                                : isTodayTodo
                                ? 'Due Today'
                                : todo.dueDate}
                            </span>
                          )}

                          {todo.completedAt && (
                            <span className="todo-completed-time">
                              Done {new Date(todo.completedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="todo-item-actions">
                      <button
                        type="button"
                        onClick={() => onDeleteTodo && onDeleteTodo(todo.id)}
                        className="todo-delete-btn"
                        title="Delete task"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TASK BOX 3: SCHEDULED DISCOVERY CALLS */}
        {/* ========================================================================= */}
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

        {/* ========================================================================= */}
        {/* TASK BOX 4: WHATSAPP CADENCE DUE */}
        {/* ========================================================================= */}
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
          padding: 1rem 1.25rem;
          display: grid;
          grid-template-columns: minmax(240px, 300px) 1fr minmax(210px, 240px);
          align-items: center;
          gap: 1.25rem;
          background: linear-gradient(135deg, #ffffff 0%, #f8faff 100%);
          border: 1px solid #e2e8f0;
          border-left: 4px solid var(--brand-blue, #1e50bc);
          border-radius: 16px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
        }

        /* 1. GREETING COLUMN */
        .banner-greeting-col {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .banner-live-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.7rem;
          font-weight: 700;
          color: #1e50bc;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          padding: 0.15rem 0.55rem;
          border-radius: 999px;
          width: fit-content;
        }
        .slot-badge-icon {
          font-size: 0.78rem;
          line-height: 1;
        }
        .cadence-sep {
          color: #93c5fd;
          font-size: 0.65rem;
        }
        .cadence-time {
          color: #64748b;
          font-weight: 600;
          font-size: 0.68rem;
        }
        .banner-greeting-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0b1d33;
          line-height: 1.2;
          margin: 0;
          letter-spacing: -0.01em;
        }
        .greeting-name {
          color: #1e50bc;
        }
        .banner-status-meta {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.76rem;
          color: #64748b;
          font-weight: 500;
          flex-wrap: wrap;
        }
        .meta-date {
          color: #334155;
          font-weight: 600;
        }
        .meta-dot {
          color: #cbd5e1;
          font-size: 0.65rem;
        }
        .meta-tasks-count.has-tasks {
          color: #d97706;
          font-weight: 700;
        }
        .meta-tasks-count.all-clear {
          color: #059669;
          font-weight: 700;
        }

        /* 2. DYNAMIC MOTIVATIONAL QUOTE CAPSULE */
        .banner-quote-capsule {
          background: linear-gradient(135deg, #ffffff 0%, #fffdf5 100%);
          border: 1px solid #fde68a;
          border-radius: 12px;
          padding: 0.65rem 0.95rem;
          box-shadow: 0 1px 4px rgba(245, 158, 11, 0.05);
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .quote-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }
        .quote-theme-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.68rem;
          font-weight: 700;
          color: #92400e;
          background: #fef3c7;
          padding: 0.12rem 0.45rem;
          border-radius: 999px;
          letter-spacing: 0.02em;
        }
        .quote-theme-icon {
          font-size: 0.72rem;
          line-height: 1;
        }
        .quote-slot-indicator {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .quote-cycle-text {
          font-size: 0.66rem;
          color: #94a3b8;
          font-weight: 600;
        }
        .btn-quote-shuffle {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 0.12rem 0.45rem;
          font-size: 0.67rem;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-quote-shuffle:hover {
          background: #eff6ff;
          border-color: #93c5fd;
          color: #1e50bc;
        }
        .rotate-icon {
          color: #64748b;
        }
        .quote-body-wrap {
          margin: 0.1rem 0;
        }
        .quote-body-text {
          font-size: 0.82rem;
          font-weight: 600;
          color: #1e293b;
          line-height: 1.38;
          font-style: italic;
          margin: 0;
        }
        .quote-footer-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.67rem;
          color: #64748b;
          font-weight: 600;
        }
        .quote-author-tag {
          color: #475569;
          font-weight: 700;
        }
        .quote-slot-name {
          color: #b45309;
          font-weight: 700;
        }

        /* 3. DATE CONTROLLER COLUMN */
        .banner-date-col {
          display: flex;
          flex-direction: column;
        }
        .date-controller-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 0.55rem 0.7rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }
        .date-controller-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .date-ctrl-label {
          font-size: 0.68rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .date-today-badge.active {
          font-size: 0.66rem;
          font-weight: 700;
          color: #059669;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          padding: 0.08rem 0.45rem;
          border-radius: 999px;
        }
        .btn-jump-today {
          font-size: 0.66rem;
          font-weight: 700;
          color: #1e50bc;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          padding: 0.1rem 0.45rem;
          border-radius: 5px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-jump-today:hover {
          background: #dbeafe;
        }
        .date-picker-nav-row {
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }
        .btn-date-nav {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #475569;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .btn-date-nav:hover {
          background: #f8fafc;
          border-color: #94a3b8;
          color: #0b1d33;
        }
        .date-picker-box {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          padding: 0.18rem 0.45rem;
          border-radius: 6px;
          height: 26px;
        }
        .date-icon {
          color: #64748b;
          flex-shrink: 0;
        }
        .dashboard-date-input {
          border: none;
          outline: none;
          font-size: 0.77rem;
          font-weight: 600;
          color: #0b1d33;
          background: transparent;
          cursor: pointer;
          width: 100%;
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
          grid-template-columns: repeat(2, 1fr);
          gap: 1.25rem;
        }
        .task-column-card {
          padding: 1.15rem;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          min-height: 440px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
          border-radius: 12px;
          background: #ffffff;
        }
        .task-col-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: 0.75rem;
        }
        .task-col-title-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .col-icon.discovery { color: #ec4899; }
        .col-icon.calls { color: #2563eb; }
        .col-icon.whatsapp { color: #10b981; }
        .col-icon.todos { color: #6366f1; }
        .task-col-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--brand-navy);
          margin: 0;
        }
        .col-counter {
          background: #f1f5f9;
          color: var(--text-secondary);
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.2rem 0.6rem;
          border-radius: var(--radius-full);
        }
        .col-counter.overdue-alert {
          background: #fee2e2;
          color: #b91c1c;
          border: 1px solid #fca5a5;
          animation: pulse 2s infinite;
        }
        .col-counter.todos-counter {
          background: #e0e7ff;
          color: #4338ca;
        }

        /* Follow-up Sub-filter bar */
        .followup-filter-bar {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          flex-wrap: wrap;
          padding-bottom: 0.25rem;
        }
        .filter-pill-btn {
          font-size: 0.72rem;
          font-weight: 600;
          padding: 0.2rem 0.55rem;
          border-radius: 99px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .filter-pill-btn:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }
        .filter-pill-btn.is-active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }
        .filter-pill-btn.is-overdue-pill {
          color: #dc2626;
          border-color: #fecaca;
        }
        .filter-pill-btn.is-overdue-pill.is-active {
          background: #dc2626;
          color: #ffffff;
          border-color: #dc2626;
        }

        .task-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          overflow-y: auto;
          max-height: 480px;
          padding-right: 0.25rem;
        }
        .empty-task-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1rem;
          text-align: center;
          color: var(--text-muted);
          gap: 0.5rem;
          font-size: 0.83rem;
        }
        .empty-icon {
          color: #10b981;
          opacity: 0.8;
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
        .task-item-card.border-overdue-lead {
          border-left: 3.5px solid #ef4444;
          background: #fffafa;
        }
        .task-item-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.5rem;
        }
        .task-business-name {
          font-weight: 700;
          font-size: 0.9rem;
          color: var(--brand-navy);
          display: block;
        }
        .cursor-pointer {
          cursor: pointer;
        }
        .cursor-pointer:hover {
          color: #2563eb;
          text-decoration: underline;
        }
        .task-owner-meta {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 0.1rem;
        }
        .task-meta-row {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          flex-wrap: wrap;
        }
        .urgency-tag-overdue {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.7rem;
          font-weight: 700;
          color: #dc2626;
          background: #fee2e2;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          border: 1px solid #fca5a5;
        }
        .urgency-tag-today {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.7rem;
          font-weight: 700;
          color: #047857;
          background: #ecfdf5;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          border: 1px solid #a7f3d0;
        }
        .urgency-tag-callback {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.7rem;
          font-weight: 700;
          color: #b45309;
          background: #fef3c7;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          border: 1px solid #fde68a;
        }
        .urgency-tag-upcoming {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.7rem;
          font-weight: 600;
          color: #475569;
          background: #f1f5f9;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
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
          font-size: 0.76rem;
          color: var(--text-secondary);
          font-style: italic;
          background: #f8fafc;
          padding: 0.4rem 0.55rem;
          border-radius: 4px;
          border-left: 2px solid #cbd5e1;
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
          flex-wrap: wrap;
        }
        .reschedule-dropdown-wrap {
          display: inline-flex;
          align-items: center;
          gap: 0.2rem;
        }
        .reschedule-dropdown-wrap button {
          padding: 0.2rem 0.45rem;
          font-size: 0.72rem;
          font-weight: 700;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          color: #475569;
        }
        .reschedule-dropdown-wrap button:hover {
          background: #e2e8f0;
          color: #0f172a;
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
        .badge-urgent-pulse {
          background: #fee2e2;
          color: #dc2626;
          border: 1px solid #fca5a5;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          animation: pulse 2s infinite;
        }

        /* ========================================================= */
        /* MANUAL TO-DO LIST STYLES */
        /* ========================================================= */
        .todo-quick-add-form {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 0.65rem;
        }
        .todo-input-wrap {
          width: 100%;
        }
        .todo-text-input {
          width: 100%;
          padding: 0.45rem 0.65rem;
          font-size: 0.82rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          outline: none;
          background: #ffffff;
          transition: border-color 0.15s ease;
        }
        .todo-text-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
        }
        .todo-form-controls {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          flex-wrap: wrap;
        }
        .todo-priority-select {
          padding: 0.35rem 0.5rem;
          font-size: 0.74rem;
          border: 1px solid #cbd5e1;
          border-radius: 5px;
          background: #ffffff;
          color: #334155;
          outline: none;
          cursor: pointer;
        }
        .todo-date-input {
          padding: 0.3rem 0.45rem;
          font-size: 0.74rem;
          border: 1px solid #cbd5e1;
          border-radius: 5px;
          background: #ffffff;
          color: #334155;
          outline: none;
        }
        .todo-add-btn {
          padding: 0.35rem 0.75rem;
          font-size: 0.78rem;
          margin-left: auto;
          background: #4f46e5;
          border-color: #4f46e5;
        }
        .todo-add-btn:hover {
          background: #4338ca;
        }

        .todo-item-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 0.75rem 0.85rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.65rem;
          transition: all 0.15s ease;
        }
        .todo-item-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }
        .todo-item-card.is-done-card {
          background: #fafaf9;
          border-color: #f1f5f9;
          opacity: 0.75;
        }
        .todo-item-main {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          flex: 1;
        }
        .todo-custom-checkbox {
          width: 20px;
          height: 20px;
          min-width: 20px;
          border-radius: 6px;
          border: 1.5px solid #cbd5e1;
          background: #ffffff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 0.15rem;
          transition: all 0.15s ease;
          padding: 0;
        }
        .todo-custom-checkbox:hover {
          border-color: #10b981;
          background: #ecfdf5;
        }
        .todo-custom-checkbox.checked {
          background: #10b981;
          border-color: #10b981;
          color: #ffffff;
        }
        .check-mark {
          stroke-width: 3;
        }
        .todo-content-col {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          flex: 1;
        }
        .todo-title {
          font-size: 0.84rem;
          font-weight: 600;
          color: #1e293b;
          line-height: 1.35;
          word-break: break-word;
        }
        .todo-title.is-strikethrough {
          text-decoration: line-through;
          color: #94a3b8;
        }
        .todo-meta-tags {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          flex-wrap: wrap;
        }
        .todo-priority-badge {
          font-size: 0.68rem;
          font-weight: 700;
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
        }
        .todo-priority-badge.high {
          background: #fee2e2;
          color: #dc2626;
        }
        .todo-priority-badge.medium {
          background: #fef3c7;
          color: #d97706;
        }
        .todo-priority-badge.low {
          background: #f1f5f9;
          color: #475569;
        }
        .todo-date-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.2rem;
          font-size: 0.68rem;
          color: #64748b;
          background: #f8fafc;
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
        }
        .todo-date-badge.is-today {
          color: #047857;
          background: #ecfdf5;
          font-weight: 600;
        }
        .todo-date-badge.is-overdue {
          color: #dc2626;
          background: #fee2e2;
          font-weight: 700;
        }
        .todo-completed-time {
          font-size: 0.68rem;
          color: #10b981;
          font-style: italic;
        }
        .todo-delete-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 0.3rem;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }
        .todo-delete-btn:hover {
          color: #ef4444;
          background: #fee2e2;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        @media (max-width: 1024px) {
          .tasks-layout-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 1100px) {
          .dashboard-header-banner {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
