'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Lead, CallResult, CallLog, UserDailyTarget } from '@/types/crm';
import { cleanPhoneNumber, createWhatsAppLink } from '@/lib/whatsapp';
import {
  getStoredBrochureConfig,
  formatBrochureMessage,
  BrochureConfig,
} from '@/lib/brochureSettings';
import { getScriptForCategory, CallScriptConfig } from '@/data/callScripts';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  PhoneForwarded,
  MessageCircle,
  Clock,
  Calendar,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  ArrowLeft,
  SkipForward,
  Copy,
  Check,
  MapPin,
  Building2,
  User,
  FileText,
  Send,
  Sparkles,
  Layers,
  History,
  X,
  Play,
  Pause,
  RotateCcw,
  Trophy,
  Target,
  FolderOpen,
  HelpCircle,
  ShieldAlert,
  ChevronRight,
  Edit3,
} from 'lucide-react';
import QuickWhatsAppModal from '@/components/common/QuickWhatsAppModal';

interface SimplePowerDialerProps {
  leads: Lead[];
  activeRep: string;
  dailyTarget?: UserDailyTarget;
  selectedCategory?: string;
  selectedSheet?: string;
  onSaveCallLog: (
    leadId: string,
    log: {
      repName: string;
      result: CallResult;
      notes: string;
      askedForWhatsApp: boolean;
      durationSeconds?: number;
      nextFollowUpDate?: string;
      nextFollowUpTime?: string;
      brochureSent?: boolean;
    },
    leadUpdates?: {
      notes?: string;
      requirement?: string;
      followUpDate?: string;
      followUpTime?: string;
      brochureSent?: boolean;
      brochureSentDate?: string;
      dealValue?: number;
    }
  ) => void;
  onOpenLeadModal?: (lead: Lead) => void;
  onOpenUploadModal?: () => void;
  onOpenTargetModal?: () => void;
  onExit?: () => void;
  initialLeadId?: string;
}

export type QueueFilter =
  | 'sheet_all'
  | 'sheet_pending'
  | 'due_today'
  | 'interested'
  | 'not_picked_up';

export default function SimplePowerDialer({
  leads,
  activeRep,
  dailyTarget = { contactsTarget: 50, durationMinutesTarget: 120, mode: 'both' },
  selectedCategory,
  selectedSheet,
  onSaveCallLog,
  onOpenLeadModal,
  onOpenUploadModal,
  onOpenTargetModal,
  onExit,
  initialLeadId,
}: SimplePowerDialerProps) {
  // Queue Filter
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('sheet_pending');
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Live call timer (per lead)
  const [callTimer, setCallTimer] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);

  // Total session timer (continuous)
  const [sessionTimer, setSessionTimer] = useState<number>(0);

  // Form states for current lead
  const [currentNotes, setCurrentNotes] = useState<string>('');
  const [currentRequirement, setCurrentRequirement] = useState<string>('');
  const [selectedDisposition, setSelectedDisposition] = useState<CallResult | null>(null);

  // Callback / Follow-up state
  const [isFollowUpOpen, setIsFollowUpOpen] = useState<boolean>(false);
  const [customFollowUpDate, setCustomFollowUpDate] = useState<string>('');
  const [customFollowUpTime, setCustomFollowUpTime] = useState<string>('11:00');

  // Deal Won state
  const [isDealWonOpen, setIsDealWonOpen] = useState<boolean>(false);
  const [dealWonAmount, setDealWonAmount] = useState<number>(25000);

  // Script UI tab: 'pitch' | 'objections' | 'questions'
  const [scriptTab, setScriptTab] = useState<'pitch' | 'objections' | 'questions'>('pitch');
  const [selectedObjectionIndex, setSelectedObjectionIndex] = useState<number>(0);

  // Modals & Feedback
  const [isWAModalOpen, setIsWAModalOpen] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [brochureConfig] = useState<BrochureConfig>(() => getStoredBrochureConfig());

  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  // Total session timer interval
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionTimer((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter leads based on selectedCategory / selectedSheet and queueFilter
  const queueLeads = useMemo(() => {
    let list = leads;

    // Filter by Rep if specified
    if (activeRep !== 'All' && activeRep !== 'All Reps') {
      list = list.filter((l) => l.assignedRep === activeRep);
    }

    // Filter by Sheet if provided
    if (selectedSheet) {
      list = list.filter(
        (l) => (l.sheetName || '').toLowerCase() === selectedSheet.toLowerCase()
      );
    } else if (selectedCategory) {
      list = list.filter(
        (l) => (l.groupName || '').toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Secondary Filter (Pending vs All vs Due Today)
    switch (queueFilter) {
      case 'sheet_pending':
        return list.filter(
          (l) =>
            l.status === 'New' ||
            l.callResult === 'Not Picked Up' ||
            l.callResult === 'No Answer' ||
            l.callResult === 'Call Back Later' ||
            l.callResult === 'Callback'
        );
      case 'due_today':
        return list.filter(
          (l) => l.followUpDate && l.followUpDate <= todayStr && l.status !== 'Won' && l.callResult !== 'Deal Won'
        );
      case 'interested':
        return list.filter(
          (l) => l.status === 'Interested' || l.callResult === 'Interested'
        );
      case 'not_picked_up':
        return list.filter(
          (l) => l.callResult === 'Not Picked Up' || l.callResult === 'No Answer'
        );
      case 'sheet_all':
      default:
        return list;
    }
  }, [leads, activeRep, selectedCategory, selectedSheet, queueFilter, todayStr]);

  // Today's calls count across CRM
  const todayCallsCount = useMemo(() => {
    let count = 0;
    leads.forEach((l) => {
      l.callLogs?.forEach((log) => {
        if (log.date && log.date.slice(0, 10) === todayStr) {
          count++;
        }
      });
    });
    return count;
  }, [leads, todayStr]);

  // Average call duration per call (historical calculation from logged durationSeconds)
  const averageCallDurationSec = useMemo(() => {
    let totalSec = 0;
    let loggedCount = 0;
    leads.forEach((l) => {
      l.callLogs?.forEach((log) => {
        if (log.durationSeconds && log.durationSeconds > 0) {
          totalSec += log.durationSeconds;
          loggedCount++;
        }
      });
    });
    if (loggedCount === 0) return 90; // Default 1m 30s benchmark
    return Math.round(totalSec / loggedCount);
  }, [leads]);

  // Set initial lead if requested
  useEffect(() => {
    if (initialLeadId && queueLeads.length > 0) {
      const idx = queueLeads.findIndex((l) => l.id === initialLeadId);
      if (idx !== -1) {
        setCurrentIndex(idx);
      }
    }
  }, [initialLeadId, queueLeads]);

  // Ensure index remains in bounds
  useEffect(() => {
    if (currentIndex >= queueLeads.length && queueLeads.length > 0) {
      setCurrentIndex(queueLeads.length - 1);
    }
  }, [currentIndex, queueLeads.length]);

  const currentLead: Lead | undefined = queueLeads[currentIndex];

  // Dynamic script tailored for the active Lead's Category (Airbnb, Hotels, Manufacturing, or General)
  const activeScriptConfig: CallScriptConfig = useMemo(() => {
    const categoryToUse = currentLead?.groupName || selectedCategory;
    return getScriptForCategory(categoryToUse);
  }, [currentLead?.groupName, selectedCategory]);

  // Replace [Rep Name] in the opening script with the active telecaller rep
  const personalizedOpeningScript = useMemo(() => {
    const rep = activeRep !== 'All' && activeRep !== 'All Reps' ? activeRep : 'Aman';
    return (activeScriptConfig.openingScript || '').replace(/\[Rep Name\]/g, rep);
  }, [activeScriptConfig, activeRep]);

  // Reset note, requirement, and call timer when lead changes
  useEffect(() => {
    if (currentLead) {
      setCurrentNotes('');
      setCurrentRequirement(currentLead.requirement || '');
      setSelectedDisposition(null);
      setIsFollowUpOpen(false);
      setIsDealWonOpen(false);
      setCallTimer(0);
      setIsTimerRunning(true);
    }
  }, [currentLead?.id]);

  // Live call timer tick
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && currentLead) {
      interval = setInterval(() => {
        setCallTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, currentLead]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatHumanDuration = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const handleNext = useCallback(() => {
    if (currentIndex < queueLeads.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      showToast('🎉 You have reached the end of this sheet!');
    }
  }, [currentIndex, queueLeads.length]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  // Record disposition and advance to next lead
  const handleRecordDisposition = useCallback((
    result: CallResult,
    options?: {
      followUpDate?: string;
      followUpTime?: string;
      autoAdvance?: boolean;
      dealValue?: number;
    }
  ) => {
    if (!currentLead) return;

    const rep =
      activeRep !== 'All' && activeRep !== 'All Reps'
        ? activeRep
        : currentLead.assignedRep || 'Aman';

    const followUpDate = options?.followUpDate;
    const followUpTime = options?.followUpTime;
    const autoAdvance = options?.autoAdvance !== false; // default true
    const dealValue = options?.dealValue;

    onSaveCallLog(
      currentLead.id,
      {
        repName: rep,
        result,
        notes: currentNotes,
        askedForWhatsApp: !!currentLead.brochureSent,
        durationSeconds: callTimer,
        nextFollowUpDate: followUpDate,
        nextFollowUpTime: followUpTime,
        brochureSent: currentLead.brochureSent,
      },
      {
        requirement: currentRequirement.trim(),
        notes: currentNotes.trim()
          ? (currentLead.notes ? `${currentLead.notes} | ${currentNotes.trim()}` : currentNotes.trim())
          : currentLead.notes,
        followUpDate,
        followUpTime,
        dealValue,
      }
    );

    let toastText = `✓ Logged "${result}" (${formatHumanDuration(callTimer)})`;
    if (result === 'Deal Won') {
      toastText = `🎉 Deal Won! (₹${(dealValue || 25000).toLocaleString('en-IN')})`;
    } else if (followUpDate) {
      toastText += ` • Callback: ${followUpDate} ${followUpTime || ''}`;
    }
    showToast(toastText);
    setSelectedDisposition(result);
    setIsDealWonOpen(false);
    setIsFollowUpOpen(false);

    if (autoAdvance) {
      if (currentIndex < queueLeads.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        showToast('🎉 Finished all leads in this sheet queue!');
      }
    }
  }, [
    currentLead,
    activeRep,
    currentNotes,
    currentRequirement,
    callTimer,
    currentIndex,
    queueLeads.length,
    onSaveCallLog,
  ]);

  const handleCopyPhone = () => {
    if (!currentLead) return;
    navigator.clipboard.writeText(currentLead.phone);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key.toLowerCase() === 'n') {
        handleRecordDisposition('Not Picked Up');
      } else if (e.key.toLowerCase() === 'i') {
        handleRecordDisposition('Interested', { autoAdvance: false });
      } else if (e.key.toLowerCase() === 'x') {
        handleRecordDisposition('Not Interested');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrevious, handleRecordDisposition]);

  // Clean phone for tel: link
  const rawCleanPhone = currentLead ? cleanPhoneNumber(currentLead.phone) : '';
  const telLink = `tel:${rawCleanPhone.startsWith('+') ? rawCleanPhone : `+${rawCleanPhone}`}`;

  // Exact Intellicor Brochure Message as requested
  const getBrochureMessage = (lead: Lead) => {
    const business = lead.businessName || lead.ownerName || 'your business';
    return `Hi,\n\nGreetings from *Intellicor Technologies!*\n\nI've shared our brochure highlighting our services in *Website Development, Social Media Marketing, and Google Business Profile Optimization.*\n\nWe'd love to help ${business} strengthen its online presence and generate more property inquiries.\n\n🌐 https://intellicortechnologies.com  \n📧 aman@intellicortechnologies.com\n\nWould you be available for a quick 10-minute discussion this week?\n\nBest regards,  \n*Team Intellicor Technologies*`;
  };

  // Direct WhatsApp Brochure link with exact template
  const waBrochureLink = currentLead
    ? createWhatsAppLink(currentLead.phone, getBrochureMessage(currentLead))
    : '#';

  const handleSendWhatsAppBrochure = () => {
    if (!currentLead) return;
    if (!currentLead.brochureSent) {
      onSaveCallLog(
        currentLead.id,
        {
          repName:
            activeRep !== 'All' && activeRep !== 'All Reps'
              ? activeRep
              : currentLead.assignedRep || 'Aman',
          result: selectedDisposition || currentLead.callResult || 'Connected',
          notes: currentNotes,
          askedForWhatsApp: true,
          durationSeconds: callTimer,
          brochureSent: true,
        },
        {
          brochureSent: true,
          brochureSentDate: new Date().toISOString().slice(0, 10),
        }
      );
    }
    showToast(`✓ Opened WhatsApp & sent brochure to ${currentLead.businessName}`);
  };

  const totalInQueue = queueLeads.length;
  const progressPercent = totalInQueue > 0 ? Math.round(((currentIndex + 1) / totalInQueue) * 100) : 0;

  const targetPercentage = dailyTarget.contactsTarget > 0
    ? Math.min(100, Math.round((todayCallsCount / dailyTarget.contactsTarget) * 100))
    : 0;

  const sessionMinutes = Math.floor(sessionTimer / 60);

  return (
    <div className="telecaller-workspace">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="telecaller-toast">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. TOP BAR: BREADCRUMBS, QUEUE FILTERS, AND EXIT BUTTON   */}
      {/* ========================================================= */}
      <header className="telecaller-top-nav">
        <div className="nav-left-group">
          {onExit && (
            <button onClick={onExit} className="btn-back-to-hub">
              <ArrowLeft size={16} />
              <span>Groups Hub</span>
            </button>
          )}

          <div className="breadcrumb-pill">
            <FolderOpen size={15} className="text-blue" />
            <span className="crumb-cat">{selectedCategory || currentLead?.groupName || 'All Categories'}</span>
            <ChevronRight size={13} className="text-muted" />
            <span className="crumb-sheet">{selectedSheet || currentLead?.sheetName || 'Active Sheet'}</span>
          </div>

          <div className="queue-quick-toggle">
            <button
              type="button"
              className={`queue-sub-btn ${queueFilter === 'sheet_pending' ? 'active' : ''}`}
              onClick={() => {
                setQueueFilter('sheet_pending');
                setCurrentIndex(0);
              }}
            >
              Pending Calls
            </button>
            <button
              type="button"
              className={`queue-sub-btn ${queueFilter === 'sheet_all' ? 'active' : ''}`}
              onClick={() => {
                setQueueFilter('sheet_all');
                setCurrentIndex(0);
              }}
            >
              All in Sheet ({leads.filter((l) => (l.sheetName || '').toLowerCase() === (selectedSheet || '').toLowerCase()).length || leads.length})
            </button>
          </div>
        </div>

        {/* Lead Progress & Next/Prev Controls */}
        <div className="nav-center-progress">
          <div className="lead-counter-text">
            <strong>Contact {totalInQueue > 0 ? currentIndex + 1 : 0}</strong> of {totalInQueue}
          </div>
          <div className="lead-nav-buttons">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="btn-nav-step"
              title="Previous contact (Left Arrow)"
            >
              <ArrowLeft size={15} />
              <span>Prev</span>
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex >= totalInQueue - 1}
              className="btn-nav-step"
              title="Skip to next contact (Right Arrow)"
            >
              <span>Skip / Next</span>
              <SkipForward size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. TIMERS & TARGET WIDGET BAR                             */}
      {/* ========================================================= */}
      <section className="timers-and-target-strip">
        {/* Active Call Timer */}
        <div className="timer-badge-box active-call-timer">
          <div className="timer-box-meta">
            <div className="timer-box-label">
              <PhoneCall size={12} className="text-blue" />
              <span>Call Duration</span>
            </div>
            <div className="timer-micro-actions">
              <button
                type="button"
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="btn-mini-timer"
                title={isTimerRunning ? 'Pause timer' : 'Resume timer'}
              >
                {isTimerRunning ? <Pause size={10} /> : <Play size={10} />}
              </button>
              <button
                type="button"
                onClick={() => setCallTimer(0)}
                className="btn-mini-timer"
                title="Reset timer to 0"
              >
                <RotateCcw size={10} />
              </button>
            </div>
          </div>
          <div className="timer-clock-digits">
            <Clock size={15} className="text-blue" />
            <span>{formatTimer(callTimer)}</span>
          </div>
        </div>

        {/* Average Call Duration per Call */}
        <div className="timer-badge-box">
          <div className="timer-box-meta">
            <div className="timer-box-label">
              <Clock size={12} className="text-slate" />
              <span>Avg / Call</span>
            </div>
            <span className="micro-subtext">calculated avg</span>
          </div>
          <div className="stat-digits">
            <span>{formatHumanDuration(averageCallDurationSec)}</span>
          </div>
        </div>

        {/* Total Session Duration */}
        <div className="timer-badge-box">
          <div className="timer-box-meta">
            <div className="timer-box-label">
              <Clock size={12} className="text-emerald" />
              <span>Session Duration</span>
            </div>
            <span className="micro-subtext">{sessionMinutes}m active</span>
          </div>
          <div className="stat-digits">
            <span>{formatTimer(sessionTimer)}</span>
          </div>
        </div>

        {/* Daily Target Progress Widget */}
        <div
          className="timer-badge-box target-summary-box"
          onClick={onOpenTargetModal}
          title="Click to edit your daily target"
        >
          <div className="target-box-inner">
            <div className="target-box-header">
              <div className="target-box-label">
                <Target size={12} className="text-indigo" />
                <span>Daily Target</span>
              </div>
              <button type="button" className="btn-edit-target" onClick={onOpenTargetModal}>
                <Edit3 size={10} />
                <span>Edit Goal</span>
              </button>
            </div>

            <div className="target-dual-progress">
              <div className="target-progress-bar-track">
                <div
                  className="target-progress-bar-fill"
                  style={{ width: `${targetPercentage}%` }}
                />
              </div>
              <div className="target-dual-labels">
                <span>
                  <strong>{todayCallsCount}</strong> / {dailyTarget.contactsTarget} calls ({targetPercentage}%)
                </span>
                <span>
                  <strong>{sessionMinutes}m</strong> / {dailyTarget.durationMinutesTarget}m
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Progress track */}
      <div className="sheet-progress-strip">
        <div
          className="sheet-progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* ========================================================= */}
      {/* 3. MAIN LEAD CARD + THREE CORE COLUMNS                    */}
      {/* ========================================================= */}
      {queueLeads.length === 0 ? (
        <div className="empty-calling-card">
          <CheckCircle2 size={54} className="text-emerald" />
          <h2>All Leads Completed in this Queue!</h2>
          <p>
            You have called all contacts matching this filter. Switch to &quot;All in Sheet&quot; or return to the Groups Hub.
          </p>
          <div className="empty-actions-row">
            <button
              type="button"
              onClick={() => setQueueFilter('sheet_all')}
              className="btn-switch-queue-all"
            >
              View All Contacts in Sheet
            </button>
            {onExit && (
              <button type="button" onClick={onExit} className="btn-return-hub">
                ← Return to Groups Hub
              </button>
            )}
          </div>
        </div>
      ) : currentLead ? (
        <div className="calling-workspace-body">
          {/* CLIENT CONTACT BANNER */}
          <section className="client-contact-banner">
            <div className="contact-main-info">
              <div className="contact-title-row">
                <span className="contact-seq-pill">#{currentIndex + 1}</span>
                <h1 className="contact-business-name" title={currentLead.businessName}>
                  {currentLead.businessName}
                </h1>
                {currentLead.status && (
                  <span className={`status-pill status-${currentLead.status.toLowerCase().replace(/\s+/g, '-')}`}>
                    {currentLead.status}
                  </span>
                )}
                {currentLead.ownerName && currentLead.ownerName !== currentLead.businessName && (
                  <span className="contact-inline-meta" title="Contact Person">
                    <User size={13} className="text-muted" />
                    <span>{currentLead.ownerName}</span>
                  </span>
                )}
                {currentLead.city && (
                  <span className="contact-inline-meta" title="Location">
                    <MapPin size={13} className="text-muted" />
                    <span>{currentLead.city}</span>
                  </span>
                )}
                <span className="contact-inline-meta" title="Category">
                  <FolderOpen size={13} className="text-muted" />
                  <span>Category: <strong>{currentLead.groupName || 'General'}</strong></span>
                </span>
              </div>
            </div>

            {/* Direct Dialing & WhatsApp Actions */}
            <div className="contact-action-buttons">
              <div className="phone-number-pill">
                <span className="phone-num-text">{currentLead.phone}</span>
                <button
                  type="button"
                  onClick={handleCopyPhone}
                  className="btn-copy-num"
                  title="Copy number"
                >
                  {isCopied ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
                </button>
              </div>

              <a
                href={telLink}
                className="btn-action-call"
                title="Dial directly via phone / FaceTime"
              >
                <PhoneCall size={16} />
                <span>Call Now</span>
              </a>

              <a
                href={waBrochureLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-action-whatsapp"
                title="Send Brochure on WhatsApp"
                onClick={handleSendWhatsAppBrochure}
              >
                <MessageCircle size={16} />
                <span>WhatsApp Brochure</span>
              </a>
            </div>
          </section>

          {/* ========================================================= */}
          {/* THE THREE MAIN PILLARS: RESPONSE, NOTES, SCRIPT          */}
          {/* ========================================================= */}
          <div className="three-pillars-grid">
            {/* ----------------------------------------------------- */}
            {/* PILLAR 1: THE SCRIPT (Sales Pitch & Objections)       */}
            {/* ----------------------------------------------------- */}
            <div className="pillar-card pillar-script">
              <div className="pillar-header">
                <div className="pillar-header-left">
                  <div className="pillar-icon-badge badge-script">
                    <FileText size={16} />
                  </div>
                  <div>
                    <h3 className="pillar-title">3. The Script</h3>
                    <span className="pillar-subtitle">
                      Tailored for {currentLead.groupName || 'Local Business'}
                    </span>
                  </div>
                </div>

                {/* Subtabs: Pitch / Objections / Questions */}
                <div className="script-tab-pills">
                  <button
                    type="button"
                    className={`script-pill ${scriptTab === 'pitch' ? 'active' : ''}`}
                    onClick={() => setScriptTab('pitch')}
                  >
                    Pitch
                  </button>
                  <button
                    type="button"
                    className={`script-pill ${scriptTab === 'objections' ? 'active' : ''}`}
                    onClick={() => setScriptTab('objections')}
                  >
                    Objections
                  </button>
                  <button
                    type="button"
                    className={`script-pill ${scriptTab === 'questions' ? 'active' : ''}`}
                    onClick={() => setScriptTab('questions')}
                  >
                    Questions
                  </button>
                </div>
              </div>

              <div className="pillar-content script-scrollable-content">
                {scriptTab === 'pitch' && (
                  <div className="script-pitch-pane">
                    <div className="script-quote-box">
                      <p className="opening-script-text">&ldquo;{personalizedOpeningScript}&rdquo;</p>
                    </div>

                    {/* Pitch Stages Checklist */}
                    {activeScriptConfig.stages && activeScriptConfig.stages.length > 0 && (
                      <div className="pitch-stages-list">
                        <span className="stages-header-label">Call Flow Stages:</span>
                        {activeScriptConfig.stages.map((stg, sIdx) => (
                          <div key={stg.id || sIdx} className="stage-item">
                            <span className="stage-index-pill">{sIdx + 1}</span>
                            <div className="stage-text">
                              <span className="stage-name">{stg.stageName}</span>
                              <span className="stage-desc">{stg.description}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {scriptTab === 'objections' && (
                  <div className="script-objections-pane">
                    <span className="stages-header-label">Handle Objections Like a Pro:</span>
                    <div className="objection-selector-chips">
                      {activeScriptConfig.objections.map((obj, oIdx) => (
                        <button
                          key={obj.id || oIdx}
                          type="button"
                          className={`objection-chip ${
                            selectedObjectionIndex === oIdx ? 'active' : ''
                          }`}
                          onClick={() => setSelectedObjectionIndex(oIdx)}
                        >
                          {obj.objection}
                        </button>
                      ))}
                    </div>

                    {activeScriptConfig.objections[selectedObjectionIndex] && (
                      <div className="objection-reply-card">
                        <div className="obj-question">
                          <ShieldAlert size={15} className="text-amber" />
                          <span>Client says: &ldquo;{activeScriptConfig.objections[selectedObjectionIndex].objection}&rdquo;</span>
                        </div>
                        <div className="obj-reply">
                          <span className="reply-label">Your Response:</span>
                          <p>&ldquo;{activeScriptConfig.objections[selectedObjectionIndex].reply}&rdquo;</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {scriptTab === 'questions' && (
                  <div className="script-questions-pane">
                    <span className="stages-header-label">High-Value Discovery Questions:</span>
                    <div className="questions-list">
                      {activeScriptConfig.counterQuestions.map((q, qIdx) => (
                        <div key={qIdx} className="question-bubble">
                          <HelpCircle size={15} className="text-blue" />
                          <p>&ldquo;{q}&rdquo;</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ----------------------------------------------------- */}
            {/* PILLAR 2: CUSTOMER NOTES & REQUIREMENTS               */}
            {/* ----------------------------------------------------- */}
            <div className="pillar-card pillar-notes">
              <div className="pillar-header">
                <div className="pillar-header-left">
                  <div className="pillar-icon-badge badge-notes">
                    <Edit3 size={16} />
                  </div>
                  <div>
                    <h3 className="pillar-title">2. Customer Notes</h3>
                    <span className="pillar-subtitle">Live note taking &amp; requirements</span>
                  </div>
                </div>
              </div>

              <div className="pillar-content notes-content-layout">
                {/* Client Requirement */}
                <div className="form-group-field">
                  <label className="field-label">Requirement / Context:</label>
                  <input
                    type="text"
                    value={currentRequirement}
                    onChange={(e) => setCurrentRequirement(e.target.value)}
                    placeholder="e.g. Needs direct booking website, brochure requested"
                    className="requirement-input"
                  />
                </div>

                {/* Live Notes Textarea */}
                <div className="form-group-field flex-grow-notes">
                  <label className="field-label">Notes from Current Call:</label>
                  <textarea
                    rows={3}
                    value={currentNotes}
                    onChange={(e) => setCurrentNotes(e.target.value)}
                    placeholder="Type key discussion points, pricing, or client feedback here..."
                    className="notes-textarea"
                  />
                </div>

                {/* Quick Append Chips */}
                <div className="quick-note-chips-row">
                  {[
                    '+ Interested in Demo',
                    '+ Callback Next Week',
                    '+ WhatsApp Brochure Sent',
                    '+ Budget Issue',
                    '+ Decision Maker Not In',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      className="note-chip-btn"
                      onClick={() => {
                        setCurrentNotes((prev) =>
                          prev.trim() ? `${prev.trim()} | ${chip.replace('+', '').trim()}` : chip.replace('+', '').trim()
                        );
                      }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Previous Call Logs Timeline */}
                {currentLead.callLogs && currentLead.callLogs.length > 0 && (
                  <div className="call-history-timeline">
                    <div className="history-header">
                      <History size={13} />
                      <span>Past Call History ({currentLead.callLogs.length}):</span>
                    </div>
                    <div className="history-items-list">
                      {currentLead.callLogs.slice(0, 3).map((log, idx) => (
                        <div key={log.id || idx} className="history-log-item">
                          <div className="log-badge-line">
                            <span className="log-result-tag">{log.result}</span>
                            <span className="log-date-tag">
                              {log.date ? new Date(log.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : ''}
                            </span>
                          </div>
                          {log.notes && <p className="log-note-text">&ldquo;{log.notes}&rdquo;</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ----------------------------------------------------- */}
            {/* PILLAR 3: THE RESPONSE (Call Outcomes & Disposition)  */}
            {/* ----------------------------------------------------- */}
            <div className="pillar-card pillar-response">
              <div className="pillar-header">
                <div className="pillar-header-left">
                  <div className="pillar-icon-badge badge-response">
                    <PhoneForwarded size={16} />
                  </div>
                  <div>
                    <h3 className="pillar-title">1. The Response</h3>
                    <span className="pillar-subtitle">Select outcome &amp; save</span>
                  </div>
                </div>
              </div>

              <div className="pillar-content response-content-layout">
                {/* OUTCOME BUTTONS GRID */}
                <div className="outcomes-button-grid">
                  {/* Interested */}
                  <button
                    type="button"
                    onClick={() => handleRecordDisposition('Interested', { autoAdvance: true })}
                    className="outcome-card-btn outcome-interested"
                  >
                    <ThumbsUp size={20} />
                    <div className="outcome-label-wrap">
                      <span className="outcome-name">Interested!</span>
                      <span className="outcome-desc">High intent / want proposal</span>
                    </div>
                  </button>

                  {/* Connected */}
                  <button
                    type="button"
                    onClick={() => handleRecordDisposition('Connected', { autoAdvance: true })}
                    className="outcome-card-btn outcome-connected"
                  >
                    <PhoneCall size={20} />
                    <div className="outcome-label-wrap">
                      <span className="outcome-name">Connected</span>
                      <span className="outcome-desc">Spoke, needs follow-up</span>
                    </div>
                  </button>

                  {/* Call Back Later */}
                  <button
                    type="button"
                    onClick={() => setIsFollowUpOpen(!isFollowUpOpen)}
                    className={`outcome-card-btn outcome-callback ${isFollowUpOpen ? 'active' : ''}`}
                  >
                    <PhoneForwarded size={20} />
                    <div className="outcome-label-wrap">
                      <span className="outcome-name">Callback / Later</span>
                      <span className="outcome-desc">Pick date &amp; time</span>
                    </div>
                  </button>

                  {/* Not Picked Up / No Answer */}
                  <button
                    type="button"
                    onClick={() => handleRecordDisposition('Not Picked Up', { autoAdvance: true })}
                    className="outcome-card-btn outcome-not-picked"
                  >
                    <PhoneOff size={20} />
                    <div className="outcome-label-wrap">
                      <span className="outcome-name">No Answer / Busy</span>
                      <span className="outcome-desc">Ringing or switched off</span>
                    </div>
                  </button>

                  {/* Not Interested */}
                  <button
                    type="button"
                    onClick={() => handleRecordDisposition('Not Interested', { autoAdvance: true })}
                    className="outcome-card-btn outcome-not-interested"
                  >
                    <ThumbsDown size={20} />
                    <div className="outcome-label-wrap">
                      <span className="outcome-name">Not Interested</span>
                      <span className="outcome-desc">Rejected / no need</span>
                    </div>
                  </button>

                  {/* Deal Won */}
                  <button
                    type="button"
                    onClick={() => setIsDealWonOpen(!isDealWonOpen)}
                    className={`outcome-card-btn outcome-won ${isDealWonOpen ? 'active' : ''}`}
                  >
                    <Trophy size={20} />
                    <div className="outcome-label-wrap">
                      <span className="outcome-name">Deal Won! 🏆</span>
                      <span className="outcome-desc">Closed &amp; agreed</span>
                    </div>
                  </button>
                </div>

                {/* ACCORDION: CALLBACK / FOLLOW-UP PRESETS */}
                {isFollowUpOpen && (
                  <div className="callback-presets-card">
                    <span className="preset-card-title">Schedule Callback:</span>
                    <div className="preset-buttons-row">
                      <button
                        type="button"
                        className="preset-btn"
                        onClick={() =>
                          handleRecordDisposition('Call Back Later', {
                            followUpDate: todayStr,
                            followUpTime: '16:00',
                          })
                        }
                      >
                        Later Today (4 PM)
                      </button>
                      <button
                        type="button"
                        className="preset-btn"
                        onClick={() =>
                          handleRecordDisposition('Call Back Later', {
                            followUpDate: tomorrowStr,
                            followUpTime: '11:00',
                          })
                        }
                      >
                        Tomorrow Morning (11 AM)
                      </button>
                      <button
                        type="button"
                        className="preset-btn"
                        onClick={() =>
                          handleRecordDisposition('Call Back Later', {
                            followUpDate: tomorrowStr,
                            followUpTime: '17:00',
                          })
                        }
                      >
                        Tomorrow Evening (5 PM)
                      </button>
                    </div>

                    <div className="custom-datetime-row">
                      <input
                        type="date"
                        value={customFollowUpDate || tomorrowStr}
                        onChange={(e) => setCustomFollowUpDate(e.target.value)}
                        className="date-input-sm"
                      />
                      <input
                        type="time"
                        value={customFollowUpTime}
                        onChange={(e) => setCustomFollowUpTime(e.target.value)}
                        className="time-input-sm"
                      />
                      <button
                        type="button"
                        className="btn-confirm-callback"
                        onClick={() =>
                          handleRecordDisposition('Call Back Later', {
                            followUpDate: customFollowUpDate || tomorrowStr,
                            followUpTime: customFollowUpTime,
                          })
                        }
                      >
                        Confirm Callback
                      </button>
                    </div>
                  </div>
                )}

                {/* ACCORDION: DEAL WON AMOUNT */}
                {isDealWonOpen && (
                  <div className="deal-won-presets-card">
                    <span className="preset-card-title">Select Closed Deal Value (₹):</span>
                    <div className="preset-buttons-row">
                      {[15000, 25000, 50000, 100000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          className={`preset-btn ${dealWonAmount === amt ? 'active' : ''}`}
                          onClick={() =>
                            handleRecordDisposition('Deal Won', {
                              dealValue: amt,
                            })
                          }
                        >
                          ₹{amt.toLocaleString('en-IN')}
                        </button>
                      ))}
                    </div>
                    <div className="custom-deal-row">
                      <input
                        type="number"
                        placeholder="Custom ₹ amount"
                        value={dealWonAmount || ''}
                        onChange={(e) => setDealWonAmount(Number(e.target.value) || 0)}
                        className="deal-input-sm"
                      />
                      <button
                        type="button"
                        className="btn-confirm-deal"
                        onClick={() =>
                          handleRecordDisposition('Deal Won', {
                            dealValue: dealWonAmount || 25000,
                          })
                        }
                      >
                        Confirm Deal Won
                      </button>
                    </div>
                  </div>
                )}

                {/* PRIMARY CTA: SAVE & NEXT CONTACT */}
                <div className="save-response-footer">
                  <button
                    type="button"
                    onClick={() =>
                      handleRecordDisposition(selectedDisposition || 'Connected', {
                        autoAdvance: true,
                      })
                    }
                    className="btn-save-and-advance"
                  >
                    <span>Save Response &amp; Next Contact</span>
                    <ArrowRight size={17} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* QUICK WHATSAPP MODAL IF NEEDED */}
      {isWAModalOpen && currentLead && (
        <QuickWhatsAppModal
          lead={currentLead}
          onClose={() => setIsWAModalOpen(false)}
          onSent={() => {
            onSaveCallLog(currentLead.id, {
              repName: activeRep,
              result: 'Connected',
              notes: 'Sent WhatsApp brochure',
              askedForWhatsApp: true,
              brochureSent: true,
            });
            setIsWAModalOpen(false);
          }}
        />
      )}

      <style jsx>{`
        .telecaller-workspace {
          max-width: 1440px;
          width: 100%;
          height: 100%;
          max-height: 100%;
          margin: 0 auto;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          color: #0b1d33;
          overflow: hidden;
          box-sizing: border-box;
        }

        .telecaller-toast {
          position: fixed;
          bottom: 1.5rem;
          right: 1.5rem;
          background: #0f172a;
          color: #ffffff;
          padding: 0.65rem 1.15rem;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
          z-index: 9999;
          animation: slideUp 0.25s ease-out;
        }
        @keyframes slideUp {
          from {
            transform: translateY(12px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        /* 1. TOP NAV */
        .telecaller-top-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 0.25rem 0.75rem;
          gap: 0.65rem;
          flex-shrink: 0;
          min-height: 36px;
          box-sizing: border-box;
        }
        .nav-left-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: nowrap;
        }
        .btn-back-to-hub {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.22rem 0.6rem;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          font-size: 0.78rem;
          font-weight: 700;
          color: #334155;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .btn-back-to-hub:hover {
          background: #f1f5f9;
          border-color: #94a3b8;
        }
        .breadcrumb-pill {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          background: #f1f5f9;
          padding: 0.22rem 0.6rem;
          border-radius: 6px;
          font-size: 0.78rem;
          white-space: nowrap;
        }
        .crumb-cat {
          font-weight: 700;
          color: #1e50bc;
        }
        .crumb-sheet {
          font-weight: 600;
          color: #475569;
        }
        .queue-quick-toggle {
          display: flex;
          align-items: center;
          gap: 0.2rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 2px;
        }
        .queue-sub-btn {
          border: none;
          background: transparent;
          padding: 0.22rem 0.55rem;
          border-radius: 5px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          white-space: nowrap;
        }
        .queue-sub-btn.active {
          background: #ffffff;
          color: #0b1d33;
          font-weight: 700;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
        }
        .nav-center-progress {
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }
        .lead-counter-text {
          font-size: 0.78rem;
          color: #64748b;
          white-space: nowrap;
        }
        .lead-nav-buttons {
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }
        .btn-nav-step {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.22rem 0.6rem;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          font-size: 0.75rem;
          font-weight: 700;
          color: #334155;
          cursor: pointer;
          white-space: nowrap;
        }
        .btn-nav-step:hover:not(:disabled) {
          background: #f1f5f9;
        }
        .btn-nav-step:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        /* 2. TIMERS & TARGET BAR */
        .timers-and-target-strip {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.45rem;
          flex-shrink: 0;
          height: 48px;
          box-sizing: border-box;
        }
        @media (max-width: 900px) {
          .timers-and-target-strip {
            grid-template-columns: repeat(2, 1fr);
            height: auto;
          }
        }
        .timer-badge-box {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 0.35rem 0.65rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.45rem;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
          box-sizing: border-box;
          height: 100%;
        }
        .active-call-timer {
          background: #eff6ff;
          border-color: #bfdbfe;
        }
        .timer-box-meta {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }
        .timer-box-label {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: #64748b;
          line-height: 1;
        }
        .timer-clock-digits {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 1.25rem;
          font-weight: 800;
          color: #1e50bc;
          font-family: var(--font-mono, monospace);
          line-height: 1;
        }
        .stat-digits {
          font-size: 1.2rem;
          font-weight: 800;
          color: #0b1d33;
          line-height: 1;
        }
        .micro-subtext {
          font-size: 0.68rem;
          color: #64748b;
          line-height: 1;
        }
        .timer-micro-actions {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          margin-top: 0.1rem;
        }
        .btn-mini-timer {
          width: 20px;
          height: 20px;
          border-radius: 4px;
          border: 1px solid #bfdbfe;
          background: #ffffff;
          color: #1e50bc;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 0;
        }
        .btn-mini-timer:hover {
          background: #dbeafe;
        }

        .target-summary-box {
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .target-summary-box:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
        }
        .target-box-inner {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }
        .target-box-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .target-box-label {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: #64748b;
          line-height: 1;
        }
        .btn-edit-target {
          display: flex;
          align-items: center;
          gap: 0.2rem;
          border: none;
          background: transparent;
          color: #1e50bc;
          font-size: 0.68rem;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
        }
        .target-dual-progress {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }
        .target-progress-bar-track {
          height: 5px;
          background: #e2e8f0;
          border-radius: 999px;
          overflow: hidden;
        }
        .target-progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #10b981);
          border-radius: 999px;
        }
        .target-dual-labels {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.68rem;
          color: #64748b;
          line-height: 1;
        }

        .sheet-progress-strip {
          height: 3px;
          background: #e2e8f0;
          border-radius: 999px;
          overflow: hidden;
          flex-shrink: 0;
        }
        .sheet-progress-fill {
          height: 100%;
          background: #3b82f6;
          transition: width 0.3s ease;
        }

        /* 3. CONTACT BANNER */
        .client-contact-banner {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 0.35rem 0.75rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.65rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          flex-shrink: 0;
          min-height: 42px;
          box-sizing: border-box;
        }
        .contact-main-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          overflow: hidden;
          min-width: 0;
        }
        .contact-title-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: nowrap;
          overflow: hidden;
          white-space: nowrap;
        }
        .contact-seq-pill {
          font-size: 0.7rem;
          font-weight: 800;
          background: #f1f5f9;
          color: #64748b;
          padding: 0.12rem 0.45rem;
          border-radius: 5px;
          flex-shrink: 0;
        }
        .contact-business-name {
          font-size: 1.05rem;
          font-weight: 800;
          color: #0b1d33;
          margin: 0;
          letter-spacing: -0.01em;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .status-pill {
          font-size: 0.68rem;
          font-weight: 700;
          padding: 0.12rem 0.45rem;
          border-radius: 5px;
          background: #f1f5f9;
          color: #475569;
          flex-shrink: 0;
        }
        .status-new {
          background: #eff6ff;
          color: #1e50bc;
        }
        .status-interested {
          background: #dcfce7;
          color: #15803d;
        }
        .status-won {
          background: #fef3c7;
          color: #b45309;
        }
        .contact-inline-meta {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.78rem;
          color: #64748b;
          flex-shrink: 0;
          padding-left: 0.35rem;
          border-left: 1px solid #e2e8f0;
        }
        .contact-action-buttons {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }
        .phone-number-pill {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          padding: 0.28rem 0.65rem;
          border-radius: 7px;
          font-weight: 700;
          font-size: 0.84rem;
          color: #0b1d33;
        }
        .btn-copy-num {
          border: none;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
        }
        .btn-action-call {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          background: #1e50bc;
          color: #ffffff;
          padding: 0.32rem 0.85rem;
          border-radius: 7px;
          font-size: 0.82rem;
          font-weight: 700;
          text-decoration: none;
          box-shadow: 0 1px 4px rgba(30, 80, 188, 0.25);
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .btn-action-call:hover {
          background: #18429c;
          transform: translateY(-1px);
        }
        .btn-action-whatsapp {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          background: #25d366;
          color: #ffffff;
          padding: 0.32rem 0.85rem;
          border-radius: 7px;
          font-size: 0.82rem;
          font-weight: 700;
          text-decoration: none;
          box-shadow: 0 1px 4px rgba(37, 211, 102, 0.25);
          transition: all 0.15s ease;
          white-space: nowrap;
          cursor: pointer;
        }
        .btn-action-whatsapp:hover {
          background: #1ebd59;
          transform: translateY(-1px);
        }

        /* ========================================================= */
        /* THE THREE PILLARS GRID                                    */
        /* ========================================================= */
        .calling-workspace-body {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          overflow: hidden;
          box-sizing: border-box;
        }
        .three-pillars-grid {
          flex: 1;
          min-height: 0;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 0.5rem;
          overflow: hidden;
          align-items: stretch;
          box-sizing: border-box;
        }
        @media (max-width: 1050px) {
          .three-pillars-grid {
            grid-template-columns: 1fr;
            overflow-y: auto;
          }
        }
        .pillar-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          min-height: 0;
          height: 100%;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          box-sizing: border-box;
        }
        .pillar-header {
          padding: 0.35rem 0.75rem;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.4rem;
          flex-shrink: 0;
          min-height: 36px;
          box-sizing: border-box;
        }
        .pillar-header-left {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .pillar-icon-badge {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .badge-response {
          background: #eff6ff;
          color: #1e50bc;
        }
        .badge-notes {
          background: #fef3c7;
          color: #b45309;
        }
        .badge-script {
          background: #ede9fe;
          color: #6d28d9;
        }
        .pillar-title {
          font-size: 0.88rem;
          font-weight: 800;
          color: #0b1d33;
          margin: 0;
          line-height: 1.1;
        }
        .pillar-subtitle {
          font-size: 0.68rem;
          color: #64748b;
          line-height: 1;
        }
        .pillar-content {
          padding: 0.5rem 0.65rem;
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          box-sizing: border-box;
          scrollbar-width: thin;
        }

        /* PILLAR 1: SCRIPT */
        .script-tab-pills {
          display: flex;
          align-items: center;
          gap: 0.2rem;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 5px;
          padding: 2px;
        }
        .script-pill {
          border: none;
          background: transparent;
          padding: 0.2rem 0.45rem;
          font-size: 0.68rem;
          font-weight: 700;
          color: #64748b;
          border-radius: 4px;
          cursor: pointer;
        }
        .script-pill.active {
          background: #1e50bc;
          color: #ffffff;
        }
        .script-scrollable-content {
          overflow-y: auto;
          scrollbar-width: thin;
        }
        .script-quote-box {
          background: #f5f3ff;
          border-left: 3px solid #7c3aed;
          padding: 0.6rem 0.75rem;
          border-radius: 0 8px 8px 0;
        }
        .opening-script-text {
          font-size: 0.82rem;
          line-height: 1.45;
          color: #3b0764;
          margin: 0;
          font-style: italic;
        }
        .stages-header-label {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: #64748b;
          display: block;
          margin-bottom: 0.35rem;
        }
        .pitch-stages-list {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          margin-top: 0.35rem;
        }
        .stage-item {
          display: flex;
          align-items: flex-start;
          gap: 0.45rem;
          background: #f8fafc;
          padding: 0.4rem 0.6rem;
          border-radius: 6px;
          border: 1px solid #f1f5f9;
        }
        .stage-index-pill {
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: #e2e8f0;
          color: #334155;
          font-size: 0.66rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .stage-text {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }
        .stage-name {
          font-size: 0.78rem;
          font-weight: 700;
          color: #0b1d33;
        }
        .stage-desc {
          font-size: 0.7rem;
          color: #64748b;
        }
        .objection-selector-chips {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          flex-wrap: wrap;
          margin-bottom: 0.5rem;
        }
        .objection-chip {
          padding: 0.22rem 0.5rem;
          border-radius: 5px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          font-size: 0.7rem;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
        }
        .objection-chip.active {
          background: #7c3aed;
          color: #ffffff;
          border-color: #7c3aed;
        }
        .objection-reply-card {
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 8px;
          padding: 0.65rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .obj-question {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.78rem;
          font-weight: 700;
          color: #92400e;
        }
        .obj-reply {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }
        .reply-label {
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #b45309;
        }
        .obj-reply p {
          font-size: 0.8rem;
          line-height: 1.45;
          color: #451a03;
          margin: 0;
        }
        .questions-list {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .question-bubble {
          display: flex;
          align-items: flex-start;
          gap: 0.45rem;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          padding: 0.5rem 0.65rem;
          border-radius: 6px;
        }
        .question-bubble p {
          font-size: 0.78rem;
          color: #1e3a8a;
          margin: 0;
          line-height: 1.4;
          font-weight: 600;
        }

        /* PILLAR 2: NOTES */
        .notes-content-layout {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }
        .form-group-field {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }
        .field-label {
          font-size: 0.7rem;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .requirement-input {
          padding: 0.32rem 0.6rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.8rem;
          background: #ffffff;
          outline: none;
          color: #0b1d33;
          height: 30px;
          box-sizing: border-box;
        }
        .requirement-input:focus {
          border-color: #1e50bc;
        }
        .flex-grow-notes {
          flex: 1;
        }
        .notes-textarea {
          width: 100%;
          min-height: 70px;
          max-height: 110px;
          padding: 0.4rem 0.6rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.8rem;
          background: #ffffff;
          outline: none;
          resize: none;
          color: #0b1d33;
          line-height: 1.4;
          box-sizing: border-box;
        }
        .notes-textarea:focus {
          border-color: #1e50bc;
        }
        .quick-note-chips-row {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          flex-wrap: wrap;
        }
        .note-chip-btn {
          font-size: 0.68rem;
          font-weight: 600;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 0.16rem 0.45rem;
          border-radius: 5px;
          color: #475569;
          cursor: pointer;
        }
        .note-chip-btn:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }
        .call-history-timeline {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 0.5rem;
          margin-top: 0.2rem;
        }
        .history-header {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.7rem;
          font-weight: 700;
          color: #64748b;
          margin-bottom: 0.3rem;
        }
        .history-items-list {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }
        .history-log-item {
          background: #ffffff;
          border: 1px solid #f1f5f9;
          border-radius: 5px;
          padding: 0.3rem 0.5rem;
        }
        .log-badge-line {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.68rem;
        }
        .log-result-tag {
          font-weight: 700;
          color: #1e50bc;
        }
        .log-date-tag {
          color: #94a3b8;
        }
        .log-note-text {
          font-size: 0.72rem;
          color: #475569;
          margin: 0.15rem 0 0 0;
        }

        /* PILLAR 3: RESPONSE */
        .response-content-layout {
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }
        .outcomes-button-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.45rem;
        }
        .outcome-card-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.45rem 0.55rem;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
          box-sizing: border-box;
          min-height: 48px;
        }
        .outcome-card-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
        }
        .outcome-label-wrap {
          display: flex;
          flex-direction: column;
          line-height: 1.15;
        }
        .outcome-name {
          font-size: 0.8rem;
          font-weight: 800;
          color: #0b1d33;
        }
        .outcome-desc {
          font-size: 0.65rem;
          color: #64748b;
        }
        .outcome-interested {
          background: #f0fdf4;
          border-color: #bbf7d0;
          color: #15803d;
        }
        .outcome-interested:hover {
          background: #dcfce7;
        }
        .outcome-connected {
          background: #eff6ff;
          border-color: #bfdbfe;
          color: #1e40af;
        }
        .outcome-connected:hover {
          background: #dbeafe;
        }
        .outcome-callback {
          background: #fffbeb;
          border-color: #fde68a;
          color: #b45309;
        }
        .outcome-callback:hover, .outcome-callback.active {
          background: #fef3c7;
        }
        .outcome-not-picked {
          background: #f8fafc;
          border-color: #e2e8f0;
          color: #475569;
        }
        .outcome-not-picked:hover {
          background: #f1f5f9;
        }
        .outcome-not-interested {
          background: #fef2f2;
          border-color: #fecaca;
          color: #b91c1c;
        }
        .outcome-not-interested:hover {
          background: #fee2e2;
        }
        .outcome-won {
          background: #fffbeb;
          border-color: #f59e0b;
          color: #b45309;
        }
        .outcome-won:hover, .outcome-won.active {
          background: #fde68a;
        }

        .callback-presets-card, .deal-won-presets-card {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 0.55rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .preset-card-title {
          font-size: 0.7rem;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
        }
        .preset-buttons-row {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          flex-wrap: wrap;
        }
        .preset-btn {
          font-size: 0.72rem;
          font-weight: 600;
          padding: 0.25rem 0.5rem;
          border-radius: 5px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #1e50bc;
          cursor: pointer;
        }
        .preset-btn:hover, .preset-btn.active {
          background: #1e50bc;
          color: #ffffff;
          border-color: #1e50bc;
        }
        .custom-datetime-row, .custom-deal-row {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .date-input-sm, .time-input-sm, .deal-input-sm {
          padding: 0.3rem 0.5rem;
          border: 1px solid #cbd5e1;
          border-radius: 5px;
          font-size: 0.75rem;
          background: #ffffff;
        }
        .btn-confirm-callback, .btn-confirm-deal {
          padding: 0.35rem 0.7rem;
          border-radius: 5px;
          border: none;
          background: #1e50bc;
          color: #ffffff;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
        }

        .save-response-footer {
          margin-top: auto;
          padding-top: 0.35rem;
        }
        .btn-save-and-advance {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          padding: 0.5rem 0.85rem;
          border-radius: 8px;
          border: none;
          background: #1e50bc;
          color: #ffffff;
          font-size: 0.86rem;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(30, 80, 188, 0.25);
          transition: all 0.15s ease;
        }
        .btn-save-and-advance:hover {
          background: #18429c;
          transform: translateY(-1px);
        }

        /* EMPTY STATE */
        .empty-calling-card {
          background: #ffffff;
          border: 2px dashed #cbd5e1;
          border-radius: 16px;
          padding: 2.5rem 1.5rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.65rem;
        }
        .empty-calling-card h2 {
          font-size: 1.25rem;
          font-weight: 800;
          margin: 0;
        }
        .empty-calling-card p {
          font-size: 0.85rem;
          color: #64748b;
          max-width: 440px;
          margin: 0;
        }
        .empty-actions-row {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          margin-top: 0.4rem;
        }
        .btn-switch-queue-all {
          padding: 0.55rem 1rem;
          background: #1e50bc;
          color: #ffffff;
          border-radius: 8px;
          border: none;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-return-hub {
          padding: 0.55rem 1rem;
          background: #f1f5f9;
          color: #334155;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
