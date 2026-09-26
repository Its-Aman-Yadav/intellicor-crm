'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Lead, CallResult, CallLog } from '@/types/crm';
import { cleanPhoneNumber, createWhatsAppLink } from '@/lib/whatsapp';
import {
  getStoredBrochureConfig,
  saveStoredBrochureConfig,
  formatBrochureMessage,
  BrochureConfig,
} from '@/lib/brochureSettings';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  PhoneForwarded,
  MessageCircle,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  ArrowLeft,
  SkipForward,
  Copy,
  Check,
  ExternalLink,
  MapPin,
  Building2,
  User,
  FileText,
  Send,
  Sparkles,
  Settings,
  Layers,
  History,
  X,
  Play,
  Pause,
  RotateCcw,
  Trophy,
  Flame,
  Target,
} from 'lucide-react';
import QuickWhatsAppModal from '@/components/common/QuickWhatsAppModal';

interface SimplePowerDialerProps {
  leads: Lead[];
  activeRep: string;
  onSaveCallLog: (
    leadId: string,
    log: {
      repName: string;
      result: CallResult;
      notes: string;
      askedForWhatsApp: boolean;
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
  onExit?: () => void;
  initialLeadId?: string;
}

export type QueueFilter =
  | 'due_today'
  | 'pending'
  | 'followups_tomorrow'
  | 'not_picked_up'
  | 'interested'
  | 'won'
  | 'all';

export default function SimplePowerDialer({
  leads,
  activeRep,
  onSaveCallLog,
  onOpenLeadModal,
  onOpenUploadModal,
  onExit,
  initialLeadId,
}: SimplePowerDialerProps) {
  // Queue Filter
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('pending');
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Live call timer
  const [callTimer, setCallTimer] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);

  // Form states for current lead
  const [currentNotes, setCurrentNotes] = useState<string>('');
  const [currentRequirement, setCurrentRequirement] = useState<string>('');
  const [isFollowUpOpen, setIsFollowUpOpen] = useState<boolean>(false);
  const [customFollowUpDate, setCustomFollowUpDate] = useState<string>('');
  const [customFollowUpTime, setCustomFollowUpTime] = useState<string>('10:00');
  const [isDealWonOpen, setIsDealWonOpen] = useState<boolean>(false);
  const [dealWonAmount, setDealWonAmount] = useState<number>(25000);
  const [isWAModalOpen, setIsWAModalOpen] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Brochure Config
  const [brochureConfig, setBrochureConfig] = useState<BrochureConfig>(() =>
    getStoredBrochureConfig()
  );
  const [isEditingBrochure, setIsEditingBrochure] = useState<boolean>(false);
  const [editBrochureUrl, setEditBrochureUrl] = useState<string>('');

  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);
  const inTwoDaysStr = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);

  // Filter leads according to selected queue
  const queueLeads = useMemo(() => {
    let repLeads = leads;
    if (activeRep !== 'All' && activeRep !== 'All Reps') {
      repLeads = leads.filter((l) => l.assignedRep === activeRep);
    }

    switch (queueFilter) {
      case 'due_today':
        return repLeads.filter(
          (l) => l.followUpDate && l.followUpDate <= todayStr && l.status !== 'Won' && l.callResult !== 'Deal Won'
        );
      case 'pending':
        // Leads that haven't been called yet or were marked as Not Picked Up / Callback
        return repLeads.filter(
          (l) =>
            l.status === 'New' ||
            l.callResult === 'Not Picked Up' ||
            l.callResult === 'No Answer' ||
            l.callResult === 'Call Back Later' ||
            l.callResult === 'Callback'
        );
      case 'followups_tomorrow':
        return repLeads.filter((l) => l.followUpDate === tomorrowStr);
      case 'not_picked_up':
        return repLeads.filter(
          (l) => l.callResult === 'Not Picked Up' || l.callResult === 'No Answer'
        );
      case 'interested':
        return repLeads.filter(
          (l) => l.status === 'Interested' || l.callResult === 'Interested'
        );
      case 'won':
        return repLeads.filter(
          (l) => l.status === 'Won' || l.callResult === 'Deal Won'
        );
      case 'all':
      default:
        return repLeads;
    }
  }, [leads, activeRep, queueFilter, todayStr, tomorrowStr]);

  // Today's total calls counter
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

  // Set initial lead if provided
  useEffect(() => {
    if (initialLeadId && queueLeads.length > 0) {
      const idx = queueLeads.findIndex((l) => l.id === initialLeadId);
      if (idx !== -1) {
        setCurrentIndex(idx);
      }
    }
  }, [initialLeadId, queueLeads]);

  // Ensure current index is within bounds
  useEffect(() => {
    if (currentIndex >= queueLeads.length && queueLeads.length > 0) {
      setCurrentIndex(queueLeads.length - 1);
    }
  }, [currentIndex, queueLeads.length]);

  const currentLead: Lead | undefined = queueLeads[currentIndex];

  // Reset note and timer when lead changes
  useEffect(() => {
    if (currentLead) {
      setCurrentNotes('');
      setCurrentRequirement(currentLead.requirement || '');
      setCallTimer(0);
      setIsTimerRunning(true);
      setIsFollowUpOpen(false);
    }
  }, [currentLead?.id]);

  // Call timer interval
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
      showToast('🎉 You have reached the end of this calling queue!');
    }
  }, [currentIndex, queueLeads.length]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  // Save disposition and advance to next lead
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

    let toastText = `✓ Logged "${result}"`;
    if (result === 'Deal Won') {
      toastText = `🎉 Deal Won! (₹${(dealValue || 25000).toLocaleString('en-IN')})`;
    } else if (followUpDate) {
      toastText += ` (Follow-up: ${followUpDate} ${followUpTime || ''})`;
    }
    showToast(toastText);
    setIsDealWonOpen(false);

    if (autoAdvance) {
      if (currentIndex < queueLeads.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        showToast('🎉 Finished all leads in this queue!');
      }
    }
  }, [currentLead, activeRep, currentNotes, currentIndex, queueLeads.length, onSaveCallLog]);

  // Send brochure on WhatsApp
  const handleSendBrochureWhatsApp = () => {
    if (!currentLead) return;

    const msg = formatBrochureMessage(
      brochureConfig.whatsappMessageTemplate,
      brochureConfig.brochureUrl,
      currentLead.ownerName || currentLead.businessName,
      currentLead.businessName,
      activeRep
    );

    const waLink = createWhatsAppLink(currentLead.phone, msg);
    window.open(waLink, '_blank');

    // Automatically mark brochure as sent
    const nowIso = new Date().toISOString();
    onSaveCallLog(
      currentLead.id,
      {
        repName: activeRep,
        result: 'Connected',
        notes: currentNotes.trim() ? `${currentNotes.trim()} | Sent brochure on WhatsApp` : 'Sent brochure on WhatsApp',
        askedForWhatsApp: true,
        brochureSent: true,
      },
      {
        requirement: currentRequirement.trim(),
        notes: currentNotes.trim()
          ? (currentLead.notes ? `${currentLead.notes} | ${currentNotes.trim()}` : currentNotes.trim())
          : currentLead.notes,
        brochureSent: true,
        brochureSentDate: nowIso.slice(0, 10),
      }
    );

    showToast('📲 WhatsApp opened & marked Brochure as Sent!');
  };

  const handleToggleBrochureSent = () => {
    if (!currentLead) return;
    const newStatus = !currentLead.brochureSent;
    const nowIso = new Date().toISOString();

    onSaveCallLog(
      currentLead.id,
      {
        repName: activeRep,
        result: currentLead.callResult || 'Connected',
        notes: currentNotes.trim(),
        askedForWhatsApp: newStatus,
        brochureSent: newStatus,
      },
      {
        requirement: currentRequirement.trim(),
        notes: currentNotes.trim()
          ? (currentLead.notes ? `${currentLead.notes} | ${currentNotes.trim()}` : currentNotes.trim())
          : currentLead.notes,
        brochureSent: newStatus,
        brochureSentDate: newStatus ? nowIso.slice(0, 10) : undefined,
      }
    );

    showToast(newStatus ? '✓ Marked Brochure as Sent' : 'Marked Brochure as Not Sent');
  };

  const handleCopyPhone = () => {
    if (!currentLead) return;
    navigator.clipboard.writeText(currentLead.phone);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSaveBrochureConfig = () => {
    const updated = {
      ...brochureConfig,
      brochureUrl: editBrochureUrl.trim() || brochureConfig.brochureUrl,
    };
    setBrochureConfig(updated);
    saveStoredBrochureConfig(updated);
    setIsEditingBrochure(false);
    showToast('✓ Updated Brochure link');
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in a textarea or input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key.toLowerCase() === 'n') {
        handleRecordDisposition('Not Picked Up');
      } else if (e.key.toLowerCase() === 'x') {
        handleRecordDisposition('Not Interested');
      } else if (e.key.toLowerCase() === 'i') {
        handleRecordDisposition('Interested', { autoAdvance: false });
      } else if (e.key.toLowerCase() === 'w') {
        handleSendBrochureWhatsApp();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrevious, handleRecordDisposition]);

  // Clean phone for tel: link
  const rawCleanPhone = currentLead ? cleanPhoneNumber(currentLead.phone) : '';
  const telLink = `tel:${rawCleanPhone.startsWith('+') ? rawCleanPhone : `+${rawCleanPhone}`}`;

  // Progress percentage
  const totalInQueue = queueLeads.length;
  const progressPercent = totalInQueue > 0 ? Math.round(((currentIndex + 1) / totalInQueue) * 100) : 0;

  return (
    <div className="dialer-wrapper">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="dialer-toast">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar: Queue Selector & Progress */}
      <div className="dialer-top-bar">
        <div className="queue-filter-group">
          <span className="queue-label">
            <Layers size={15} /> Queue:
          </span>
          <div className="queue-pills">
            {leads.filter((l) => l.followUpDate && l.followUpDate <= todayStr && l.status !== 'Won' && l.callResult !== 'Deal Won').length > 0 && (
              <button
                onClick={() => {
                  setQueueFilter('due_today');
                  setCurrentIndex(0);
                }}
                className={`queue-pill pill-alert ${queueFilter === 'due_today' ? 'active' : ''}`}
              >
                🔥 Due Today ({leads.filter((l) => l.followUpDate && l.followUpDate <= todayStr && l.status !== 'Won' && l.callResult !== 'Deal Won').length})
              </button>
            )}
            <button
              onClick={() => {
                setQueueFilter('pending');
                setCurrentIndex(0);
              }}
              className={`queue-pill ${queueFilter === 'pending' ? 'active' : ''}`}
            >
              Pending Calls ({leads.filter((l) => l.status === 'New' || l.callResult === 'Not Picked Up' || l.callResult === 'Call Back Later').length})
            </button>
            <button
              onClick={() => {
                setQueueFilter('followups_tomorrow');
                setCurrentIndex(0);
              }}
              className={`queue-pill ${queueFilter === 'followups_tomorrow' ? 'active' : ''}`}
            >
              Follow-ups Tomorrow ({leads.filter((l) => l.followUpDate === tomorrowStr).length})
            </button>
            <button
              onClick={() => {
                setQueueFilter('not_picked_up');
                setCurrentIndex(0);
              }}
              className={`queue-pill ${queueFilter === 'not_picked_up' ? 'active' : ''}`}
            >
              Not Picked Up ({leads.filter((l) => l.callResult === 'Not Picked Up' || l.callResult === 'No Answer').length})
            </button>
            <button
              onClick={() => {
                setQueueFilter('interested');
                setCurrentIndex(0);
              }}
              className={`queue-pill ${queueFilter === 'interested' ? 'active' : ''}`}
            >
              Interested ({leads.filter((l) => l.status === 'Interested').length})
            </button>
            {leads.filter((l) => l.status === 'Won' || l.callResult === 'Deal Won').length > 0 && (
              <button
                onClick={() => {
                  setQueueFilter('won');
                  setCurrentIndex(0);
                }}
                className={`queue-pill pill-won ${queueFilter === 'won' ? 'active' : ''}`}
              >
                🏆 Won ({leads.filter((l) => l.status === 'Won' || l.callResult === 'Deal Won').length})
              </button>
            )}
            <button
              onClick={() => {
                setQueueFilter('all');
                setCurrentIndex(0);
              }}
              className={`queue-pill ${queueFilter === 'all' ? 'active' : ''}`}
            >
              All Leads ({leads.length})
            </button>
          </div>
        </div>

        <div className="top-right-controls">
          <div className="dialer-call-counter" title="Calls made today towards daily solo goal (50)">
            <Target size={14} className="text-blue" />
            <span>Today: <strong>{todayCallsCount}</strong> / 50</span>
          </div>
          {onOpenUploadModal && (
            <button onClick={onOpenUploadModal} className="btn-upload-more">
              + Upload Excel
            </button>
          )}
          {onExit && (
            <button onClick={onExit} className="btn-exit" title="Back to table view">
              <X size={18} />
              <span>Back</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress & Navigation Bar */}
      <div className="dialer-progress-bar-container">
        <div className="progress-info-row">
          <div className="progress-text">
            <strong>Calling Lead {totalInQueue > 0 ? currentIndex + 1 : 0}</strong> of{' '}
            {totalInQueue} in queue
          </div>
          <div className="nav-btn-group">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="nav-btn"
              title="Previous lead (Left Arrow)"
            >
              <ArrowLeft size={16} />
              <span>Prev</span>
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex >= totalInQueue - 1}
              className="nav-btn"
              title="Skip / Next lead (Right Arrow)"
            >
              <span>Skip / Next</span>
              <SkipForward size={16} />
            </button>
          </div>
        </div>

        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Empty State */}
      {queueLeads.length === 0 ? (
        <div className="empty-queue-card">
          <CheckCircle2 size={48} className="empty-icon text-success" />
          <h3>All caught up in this queue!</h3>
          <p>
            There are no leads matching &quot;{queueFilter.replace('_', ' ')}&quot;. You can
            switch to &quot;All Leads&quot; or upload a new Excel sheet to keep calling.
          </p>
          <div className="empty-actions">
            <button
              onClick={() => setQueueFilter('all')}
              className="btn-switch-all"
            >
              View All Leads ({leads.length})
            </button>
            {onOpenUploadModal && (
              <button onClick={onOpenUploadModal} className="btn-upload-primary">
                📁 Upload New Excel Sheet
              </button>
            )}
          </div>
        </div>
      ) : currentLead ? (
        /* MAIN CALLING WORKSPACE */
        <div className="dialer-content-grid">
          {/* LEFT COLUMN: CLIENT DETAILS & CALL ACTIONS */}
          <div className="client-main-card">
            {/* Lead Header */}
            <div className="client-header">
              <div>
                <span className="lead-seq-badge">
                  Lead #{currentIndex + 1}
                </span>
                <h1 className="client-business-name">{currentLead.businessName}</h1>
                {currentLead.ownerName && currentLead.ownerName !== currentLead.businessName && (
                  <div className="client-owner-name">
                    <User size={15} />
                    <span>Contact: {currentLead.ownerName}</span>
                  </div>
                )}
              </div>

              {/* Call Timer */}
              <div className="call-timer-box">
                <div className="timer-display">
                  <Clock size={16} className="timer-icon" />
                  <span>{formatTimer(callTimer)}</span>
                </div>
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className="timer-pause-btn"
                  title={isTimerRunning ? 'Pause timer' : 'Resume timer'}
                >
                  {isTimerRunning ? <Pause size={12} /> : <Play size={12} />}
                </button>
                <button
                  onClick={() => setCallTimer(0)}
                  className="timer-pause-btn"
                  title="Reset timer"
                >
                  <RotateCcw size={12} />
                </button>
              </div>
            </div>

            {/* Prominent Phone & Quick Call Actions */}
            <div className="phone-call-banner">
              <div className="phone-number-group">
                <span className="phone-label">PHONE NUMBER</span>
                <div className="phone-val-row">
                  <span className="phone-display">{currentLead.phone}</span>
                  <button
                    onClick={handleCopyPhone}
                    className="btn-copy-phone"
                    title="Copy phone number"
                  >
                    {isCopied ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                    <span>{isCopied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="call-buttons-row">
                {/* 1-Tap Dial */}
                <a
                  href={telLink}
                  className="btn-dial-primary"
                  title="Click to dial directly via phone / FaceTime / softphone"
                >
                  <PhoneCall size={20} />
                  <span>Call Now</span>
                </a>

                {/* 1-Tap WhatsApp Templates & Direct Chat */}
                <button
                  type="button"
                  onClick={() => setIsWAModalOpen(true)}
                  className="btn-wa-direct"
                  title="Open 1-Tap WhatsApp templates or direct chat"
                >
                  <MessageCircle size={19} />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Client Basic Details Chips */}
            <div className="client-meta-chips">
              {currentLead.city && (
                <div className="meta-chip">
                  <MapPin size={14} className="text-blue" />
                  <span>{currentLead.city}</span>
                </div>
              )}
              {currentLead.industry && (
                <div className="meta-chip">
                  <Building2 size={14} className="text-slate" />
                  <span>{currentLead.industry}</span>
                </div>
              )}
              <div className="meta-chip">
                <History size={14} />
                <span>
                  {currentLead.callLogs?.length || 0} previous call
                  {(currentLead.callLogs?.length || 0) === 1 ? '' : 's'}
                </span>
              </div>
              {currentLead.status && (
                <div className={`meta-chip chip-status-${currentLead.status.toLowerCase().replace(/\s+/g, '-')}`}>
                  <span>Status: {currentLead.status}</span>
                </div>
              )}
            </div>

            {/* Requirement / Notes Box (Always editable so user can write their own) */}
            <div className="requirement-box">
              <div className="requirement-title">
                <FileText size={15} />
                <span>Client Requirement / Notes:</span>
              </div>
              <textarea
                rows={2}
                value={currentRequirement}
                onChange={(e) => setCurrentRequirement(e.target.value)}
                placeholder="Type or paste client requirement / inquiry details here..."
                className="requirement-textarea"
              />
            </div>

            {/* Quick Live Notes Input */}
            <div className="notes-entry-box">
              <label className="notes-label">
                <FileText size={14} /> Quick Notes from this call:
              </label>
              <textarea
                rows={2}
                value={currentNotes}
                onChange={(e) => setCurrentNotes(e.target.value)}
                placeholder="Type any quick points, pricing discussed, or client feedback here..."
                className="dialer-textarea"
              />
            </div>

            {/* Previous Call Logs Timeline */}
            {currentLead.callLogs && currentLead.callLogs.length > 0 && (
              <div className="past-calls-box">
                <div className="past-calls-title">
                  <History size={14} />
                  <span>Previous Call Notes & Outcomes ({currentLead.callLogs.length}):</span>
                </div>
                <div className="past-calls-list">
                  {currentLead.callLogs
                    .slice()
                    .reverse()
                    .slice(0, 4)
                    .map((log, idx) => (
                      <div key={log.id || idx} className="past-call-item">
                        <div className="past-call-top">
                          <span className={`log-outcome-badge badge-${(log.result || '').toLowerCase().replace(/\s+/g, '-')}`}>
                            {log.result}
                          </span>
                          <span className="past-call-date">
                            {log.date ? new Date(log.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        {log.notes && <p className="past-call-notes">&ldquo;{log.notes}&rdquo;</p>}
                        {log.nextFollowUpDate && (
                          <span className="past-call-followup">
                            Follow-up: {log.nextFollowUpDate} {log.nextFollowUpTime || ''}
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: DISPOSITION BUTTONS & BROCHURE SECTION */}
          <div className="actions-side-panel">
            {/* SECTION 1: ONE-CLICK OUTCOME / DISPOSITION */}
            <div className="panel-box disposition-box">
              <div className="panel-title-row">
                <h3 className="panel-title">1. What happened on the call?</h3>
                <span className="panel-subtitle">1-tap logs outcome & advances to next lead</span>
              </div>

              <div className="outcome-buttons-grid">
                {/* 🔴 Not Picked Up / No Answer */}
                <button
                  type="button"
                  onClick={() => handleRecordDisposition('Not Picked Up')}
                  className="outcome-btn btn-not-picked"
                  title="Logs Not Picked Up and moves to next lead (Press N)"
                >
                  <PhoneOff size={22} />
                  <div className="outcome-btn-text">
                    <span className="outcome-primary">Not Picked Up</span>
                    <span className="outcome-hint">Ringing / Busy / Switched Off</span>
                  </div>
                  <span className="key-shortcut-hint">Key N</span>
                </button>

                {/* ⏰ Call Back Later / Follow-up */}
                <button
                  type="button"
                  onClick={() => setIsFollowUpOpen(!isFollowUpOpen)}
                  className={`outcome-btn btn-callback ${isFollowUpOpen ? 'is-active-drop' : ''}`}
                  title="Open follow-up schedule options (Press B)"
                >
                  <PhoneForwarded size={22} />
                  <div className="outcome-btn-text">
                    <span className="outcome-primary">Call Back Later</span>
                    <span className="outcome-hint">Save for tomorrow or pick time</span>
                  </div>
                  <span className="key-shortcut-hint">Key B</span>
                </button>

                {/* 🟢 Interested */}
                <button
                  type="button"
                  onClick={() => handleRecordDisposition('Interested', { autoAdvance: false })}
                  className="outcome-btn btn-interested"
                  title="Mark as Interested (Press I)"
                >
                  <ThumbsUp size={22} />
                  <div className="outcome-btn-text">
                    <span className="outcome-primary">Interested!</span>
                    <span className="outcome-hint">Positive conversation / demo</span>
                  </div>
                  <span className="key-shortcut-hint">Key I</span>
                </button>

                {/* 🏆 Deal Won */}
                <button
                  type="button"
                  onClick={() => setIsDealWonOpen(!isDealWonOpen)}
                  className={`outcome-btn btn-deal-won ${isDealWonOpen ? 'is-active-drop' : ''}`}
                  title="Mark as Deal Won & Record Value"
                >
                  <Trophy size={22} />
                  <div className="outcome-btn-text">
                    <span className="outcome-primary">Deal Won! 🏆</span>
                    <span className="outcome-hint">Closed & payment agreed</span>
                  </div>
                  <span className="key-shortcut-hint">Won</span>
                </button>

                {/* ⚪ Not Interested */}
                <button
                  type="button"
                  onClick={() => handleRecordDisposition('Not Interested')}
                  className="outcome-btn btn-not-interested"
                  title="Mark as Not Interested (Press X)"
                >
                  <ThumbsDown size={22} />
                  <div className="outcome-btn-text">
                    <span className="outcome-primary">Not Interested</span>
                    <span className="outcome-hint">No requirement / rejected</span>
                  </div>
                  <span className="key-shortcut-hint">Key X</span>
                </button>
              </div>

              {/* QUICK DEAL WON ACCORDION */}
              {isDealWonOpen && (
                <div className="deal-won-presets-panel">
                  <div className="deal-won-header">
                    <Trophy size={16} className="text-amber" />
                    <span>🎉 Deal Won Amount (₹): (Select or enter custom amount)</span>
                  </div>

                  <div className="deal-amount-presets">
                    {[15000, 25000, 50000, 100000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() =>
                          handleRecordDisposition('Deal Won', {
                            dealValue: amt,
                          })
                        }
                        className={`deal-preset-btn ${dealWonAmount === amt ? 'active' : ''}`}
                      >
                        <span>{amt >= 100000 ? `₹${amt / 100000} Lakh` : `₹${amt / 1000}k`}</span>
                        <small>₹{amt.toLocaleString('en-IN')}</small>
                      </button>
                    ))}
                  </div>

                  {/* Custom Deal Amount */}
                  <div className="deal-custom-row">
                    <label>Custom ₹:</label>
                    <input
                      type="number"
                      placeholder="e.g. 35000"
                      value={dealWonAmount || ''}
                      onChange={(e) => setDealWonAmount(Number(e.target.value) || 0)}
                      className="deal-custom-input"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleRecordDisposition('Deal Won', {
                          dealValue: Number(dealWonAmount) || 0,
                        })
                      }
                      className="btn-confirm-deal-won"
                    >
                      Confirm Deal 🏆 →
                    </button>
                  </div>
                </div>
              )}

              {/* QUICK FOLLOW-UP ACCORDION (Tomorrow Presets) */}
              {isFollowUpOpen && (
                <div className="followup-presets-panel">
                  <div className="followup-panel-header">
                    <Calendar size={16} />
                    <span>When should we call back? (1-click saves & advances)</span>
                  </div>

                  <div className="presets-row">
                    <button
                      type="button"
                      onClick={() =>
                        handleRecordDisposition('Call Back Later', {
                          followUpDate: tomorrowStr,
                          followUpTime: '10:00 AM',
                        })
                      }
                      className="preset-btn"
                    >
                      <span>☀️ Tomorrow Morning</span>
                      <strong>10:00 AM</strong>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleRecordDisposition('Call Back Later', {
                          followUpDate: tomorrowStr,
                          followUpTime: '02:00 PM',
                        })
                      }
                      className="preset-btn"
                    >
                      <span>🌤️ Tomorrow Afternoon</span>
                      <strong>2:00 PM</strong>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleRecordDisposition('Call Back Later', {
                          followUpDate: tomorrowStr,
                          followUpTime: '05:00 PM',
                        })
                      }
                      className="preset-btn"
                    >
                      <span>🌆 Tomorrow Evening</span>
                      <strong>5:00 PM</strong>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleRecordDisposition('Call Back Later', {
                          followUpDate: inTwoDaysStr,
                          followUpTime: '11:00 AM',
                        })
                      }
                      className="preset-btn"
                    >
                      <span>📅 In 2 Days</span>
                      <strong>11:00 AM</strong>
                    </button>
                  </div>

                  {/* Custom Follow-Up Date & Time */}
                  <div className="custom-datetime-row">
                    <div className="custom-date-field">
                      <label>Custom Date:</label>
                      <input
                        type="date"
                        value={customFollowUpDate || tomorrowStr}
                        onChange={(e) => setCustomFollowUpDate(e.target.value)}
                        className="date-input-sm"
                      />
                    </div>
                    <div className="custom-time-field">
                      <label>Time:</label>
                      <input
                        type="time"
                        value={customFollowUpTime}
                        onChange={(e) => setCustomFollowUpTime(e.target.value)}
                        className="date-input-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleRecordDisposition('Call Back Later', {
                          followUpDate: customFollowUpDate || tomorrowStr,
                          followUpTime: customFollowUpTime,
                        })
                      }
                      className="btn-save-custom-followup"
                    >
                      Save & Next →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 2: BROCHURE & WHATSAPP */}
            <div className="panel-box brochure-box">
              <div className="panel-title-row">
                <div className="brochure-heading-left">
                  <h3 className="panel-title">2. Company Brochure</h3>
                  <button
                    onClick={() => {
                      setEditBrochureUrl(brochureConfig.brochureUrl);
                      setIsEditingBrochure(!isEditingBrochure);
                    }}
                    className="btn-edit-brochure-link"
                    title="Change brochure URL or PDF link"
                  >
                    <Settings size={13} />
                    <span>Change Link</span>
                  </button>
                </div>

                {/* Status Badge */}
                {currentLead.brochureSent ? (
                  <span className="brochure-status-badge sent">
                    <CheckCircle2 size={13} />
                    <span>Sent on {currentLead.brochureSentDate || 'Today'}</span>
                  </span>
                ) : (
                  <span className="brochure-status-badge not-sent">
                    Brochure Not Sent
                  </span>
                )}
              </div>

              {/* Edit brochure link inline */}
              {isEditingBrochure && (
                <div className="edit-brochure-drawer">
                  <label>Brochure URL (PDF, Google Drive, or Website):</label>
                  <div className="brochure-url-input-row">
                    <input
                      type="url"
                      value={editBrochureUrl}
                      onChange={(e) => setEditBrochureUrl(e.target.value)}
                      placeholder="https://drive.google.com/your-brochure.pdf"
                      className="brochure-input"
                    />
                    <button
                      onClick={handleSaveBrochureConfig}
                      className="btn-save-url"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}

              {/* Brochure Action Buttons */}
              <div className="brochure-action-row">
                <button
                  type="button"
                  onClick={handleSendBrochureWhatsApp}
                  className="btn-send-brochure-wa"
                  title="Opens WhatsApp directly with pre-filled message + brochure link"
                >
                  <Send size={16} />
                  <span>Send Brochure on WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleBrochureSent}
                  className={`btn-toggle-brochure ${currentLead.brochureSent ? 'is-marked' : ''}`}
                >
                  <Check size={16} />
                  <span>
                    {currentLead.brochureSent ? 'Marked Sent' : 'Mark as Sent'}
                  </span>
                </button>
              </div>
            </div>

            {/* Quick Helper / Keyboard Navigation */}
            <div className="keyboard-shortcuts-pill">
              <span className="keys-label">Shortcuts:</span>
              <span className="key-tag">N: Not Picked Up</span>
              <span className="key-tag">B: Call Back</span>
              <span className="key-tag">I: Interested</span>
              <span className="key-tag">W: WhatsApp Brochure</span>
              <span className="key-tag">→: Skip / Next</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Quick WhatsApp Templates Modal */}
      {isWAModalOpen && currentLead && (
        <QuickWhatsAppModal
          lead={currentLead}
          onClose={() => setIsWAModalOpen(false)}
          onSent={() => showToast('📲 WhatsApp opened!')}
        />
      )}

      <style jsx>{`
        .dialer-wrapper {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
        }

        /* Toast notification */
        .dialer-toast {
          position: fixed;
          top: 1.5rem;
          right: 2rem;
          background: #0b1d33;
          color: #ffffff;
          padding: 0.75rem 1.25rem;
          border-radius: 10px;
          font-size: 0.9rem;
          font-weight: 600;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
          z-index: 99999;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          animation: slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Top Bar */
        .dialer-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #ffffff;
          padding: 0.85rem 1.25rem;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }
        .queue-filter-group {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          overflow-x: auto;
        }
        .queue-label {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.82rem;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }
        .queue-pills {
          display: flex;
          gap: 0.4rem;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          padding-bottom: 2px;
        }
        .queue-pills::-webkit-scrollbar {
          display: none;
        }
        .queue-pill {
          padding: 0.4rem 0.85rem;
          border-radius: 9999px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          font-size: 0.82rem;
          font-weight: 500;
          color: #475569;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          transition: all 0.15s;
        }
        .queue-pill:hover {
          background: #f8fafc;
          border-color: #94a3b8;
        }
        .queue-pill.active {
          background: #1e50bc;
          color: #ffffff;
          border-color: #1e50bc;
          font-weight: 600;
        }
        .queue-pill.pill-alert {
          border-color: #fca5a5;
          color: #dc2626;
          background: #fef2f2;
        }
        .queue-pill.pill-alert.active {
          background: #dc2626;
          color: #ffffff;
          border-color: #dc2626;
        }
        .queue-pill.pill-won {
          border-color: #fde68a;
          color: #b45309;
          background: #fffbeb;
        }
        .queue-pill.pill-won.active {
          background: #d97706;
          color: #ffffff;
          border-color: #d97706;
        }
        .dialer-call-counter {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #15803d;
          padding: 0.4rem 0.8rem;
          border-radius: 9999px;
          font-size: 0.82rem;
          font-weight: 700;
          white-space: nowrap;
        }
        .top-right-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .btn-upload-more {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1e50bc;
          padding: 0.45rem 0.9rem;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-upload-more:hover {
          background: #dbeafe;
        }
        .btn-exit {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          color: #475569;
          padding: 0.45rem 0.85rem;
          border-radius: 8px;
          font-size: 0.82rem;
          cursor: pointer;
        }
        .btn-exit:hover {
          background: #f1f5f9;
        }

        /* Progress Bar */
        .dialer-progress-bar-container {
          background: #ffffff;
          padding: 0.85rem 1.25rem;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .progress-info-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .progress-text {
          font-size: 0.92rem;
          color: #334155;
        }
        .nav-btn-group {
          display: flex;
          gap: 0.5rem;
        }
        .nav-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.85rem;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          font-size: 0.82rem;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
          transition: all 0.15s;
        }
        .nav-btn:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #94a3b8;
        }
        .nav-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .progress-track {
          width: 100%;
          height: 6px;
          background: #f1f5f9;
          border-radius: 9999px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #1e50bc, #3b82f6);
          border-radius: 9999px;
          transition: width 0.3s ease;
        }

        /* Empty state */
        .empty-queue-card {
          background: #ffffff;
          border-radius: 16px;
          border: 1px dashed #cbd5e1;
          padding: 4rem 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }
        .empty-icon {
          color: #16a34a;
        }
        .empty-queue-card h3 {
          font-size: 1.35rem;
          color: #0b1d33;
          font-weight: 700;
        }
        .empty-queue-card p {
          color: #64748b;
          max-width: 480px;
          font-size: 0.95rem;
          line-height: 1.5;
        }
        .empty-actions {
          display: flex;
          gap: 1rem;
          margin-top: 0.5rem;
        }
        .btn-switch-all {
          padding: 0.65rem 1.25rem;
          border-radius: 9px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          font-weight: 600;
          color: #1e293b;
          cursor: pointer;
        }
        .btn-upload-primary {
          padding: 0.65rem 1.25rem;
          border-radius: 9px;
          border: none;
          background: #1e50bc;
          color: #ffffff;
          font-weight: 600;
          cursor: pointer;
        }

        /* Content Grid */
        .dialer-content-grid {
          display: grid;
          grid-template-columns: 1.15fr 1fr;
          gap: 1.25rem;
        }

        /* Left Column: Client Main Card */
        .client-main-card {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          box-shadow: 0 4px 12px rgba(11, 29, 51, 0.04);
        }
        .client-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }
        .lead-seq-badge {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          background: #eff6ff;
          color: #1e50bc;
          padding: 0.2rem 0.55rem;
          border-radius: 4px;
          letter-spacing: 0.05em;
          display: inline-block;
          margin-bottom: 0.35rem;
        }
        .client-business-name {
          font-size: 1.6rem;
          font-weight: 800;
          color: #0b1d33;
          line-height: 1.2;
        }
        .client-owner-name {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          color: #475569;
          font-size: 0.95rem;
          font-weight: 500;
          margin-top: 0.35rem;
        }
        .call-timer-box {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 0.4rem 0.65rem;
          border-radius: 10px;
        }
        .timer-display {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-family: var(--font-mono, monospace);
          font-size: 0.95rem;
          font-weight: 700;
          color: #0b1d33;
        }
        .timer-icon {
          color: #3b82f6;
        }
        .timer-pause-btn {
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 2px;
          display: flex;
          align-items: center;
        }
        .timer-pause-btn:hover {
          color: #0b1d33;
        }

        /* Phone Call Banner */
        .phone-call-banner {
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 14px;
          padding: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }
        .phone-number-group {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }
        .phone-label {
          font-size: 0.7rem;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 0.06em;
        }
        .phone-val-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .phone-display {
          font-family: var(--font-mono, monospace);
          font-size: 1.5rem;
          font-weight: 800;
          color: #0b1d33;
          letter-spacing: -0.02em;
        }
        .btn-copy-phone {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          padding: 0.25rem 0.55rem;
          border-radius: 6px;
          font-size: 0.78rem;
          color: #475569;
          cursor: pointer;
        }
        .btn-copy-phone:hover {
          background: #f1f5f9;
        }
        .call-buttons-row {
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }
        .btn-dial-primary {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #16a34a;
          color: #ffffff;
          padding: 0.75rem 1.35rem;
          border-radius: 10px;
          font-weight: 700;
          font-size: 1rem;
          text-decoration: none;
          box-shadow: 0 4px 12px rgba(22, 163, 74, 0.28);
          transition: all 0.15s;
        }
        .btn-dial-primary:hover {
          background: #15803d;
          transform: translateY(-1px);
        }
        .btn-wa-direct {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          background: #25d366;
          color: #ffffff;
          padding: 0.75rem 1.15rem;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.95rem;
          text-decoration: none;
          transition: all 0.15s;
        }
        .btn-wa-direct:hover {
          background: #128c7e;
          transform: translateY(-1px);
        }

        /* Meta Chips */
        .client-meta-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .meta-chip {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: #f1f5f9;
          padding: 0.35rem 0.75rem;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 500;
          color: #334155;
        }
        .chip-status-interested {
          background: #dcfce7;
          color: #166534;
          font-weight: 600;
        }
        .chip-status-called {
          background: #e0e7ff;
          color: #3730a3;
        }
        .chip-status-new {
          background: #f1f5f9;
          color: #475569;
        }

        /* Requirement Box */
        .requirement-box {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 12px;
          padding: 1rem 1.15rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .requirement-title {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.8rem;
          font-weight: 700;
          color: #1e40af;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .requirement-textarea {
          width: 100%;
          border: 1.5px solid #bfdbfe;
          border-radius: 8px;
          padding: 0.6rem 0.75rem;
          font-size: 0.9rem;
          color: #1e3a8a;
          background: #ffffff;
          outline: none;
          resize: vertical;
          font-family: inherit;
        }
        .requirement-textarea:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }


        /* Notes input */
        .notes-entry-box {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .notes-label {
          font-size: 0.82rem;
          font-weight: 600;
          color: #334155;
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .dialer-textarea {
          width: 100%;
          border: 1.5px solid #cbd5e1;
          border-radius: 10px;
          padding: 0.65rem 0.85rem;
          font-size: 0.88rem;
          outline: none;
          background: #f8fafc;
          resize: vertical;
        }
        .dialer-textarea:focus {
          border-color: #2563eb;
          background: #ffffff;
        }

        /* Past calls timeline */
        .past-calls-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 0.65rem 0.85rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .past-calls-title {
          font-size: 0.78rem;
          font-weight: 700;
          color: #475569;
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .past-calls-list {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }
        .past-call-item {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 0.5rem 0.65rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .past-call-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .log-outcome-badge {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.15rem 0.45rem;
          border-radius: 9999px;
        }
        .badge-interested {
          background: #dcfce7;
          color: #15803d;
        }
        .badge-deal-won {
          background: #fef3c7;
          color: #b45309;
        }
        .badge-call-back-later,
        .badge-callback {
          background: #fef9c3;
          color: #854d0e;
        }
        .badge-not-picked-up,
        .badge-no-answer {
          background: #fee2e2;
          color: #b91c1c;
        }
        .badge-not-interested {
          background: #f1f5f9;
          color: #64748b;
        }
        .past-call-date {
          font-size: 0.7rem;
          color: #94a3b8;
        }
        .past-call-notes {
          font-size: 0.8rem;
          color: #334155;
          margin: 0;
          font-style: italic;
        }
        .past-call-followup {
          font-size: 0.72rem;
          color: #0369a1;
          font-weight: 500;
        }

        /* Right Column: Actions side panel */
        .actions-side-panel {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .panel-box {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          padding: 1.5rem;
          box-shadow: 0 4px 12px rgba(11, 29, 51, 0.04);
        }
        .panel-title-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 1.15rem;
        }
        .panel-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #0b1d33;
        }
        .panel-subtitle {
          font-size: 0.78rem;
          color: #64748b;
        }

        /* Disposition buttons grid */
        .outcome-buttons-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.85rem;
        }
        .outcome-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 0.85rem;
          border-radius: 12px;
          border: 2px solid transparent;
          cursor: pointer;
          text-align: left;
          position: relative;
          transition: all 0.15s;
        }
        .outcome-btn:hover {
          transform: translateY(-2px);
        }
        .outcome-btn-text {
          display: flex;
          flex-direction: column;
        }
        .outcome-primary {
          font-size: 0.95rem;
          font-weight: 700;
        }
        .outcome-hint {
          font-size: 0.73rem;
          opacity: 0.8;
          margin-top: 1px;
        }
        .key-shortcut-hint {
          position: absolute;
          top: 6px;
          right: 8px;
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          opacity: 0.55;
          letter-spacing: 0.04em;
        }

        /* Colors for outcome buttons */
        .btn-not-picked {
          background: #fef2f2;
          border-color: #fecaca;
          color: #dc2626;
        }
        .btn-not-picked:hover {
          background: #fee2e2;
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.18);
        }

        .btn-callback {
          background: #fffbeb;
          border-color: #fde68a;
          color: #b45309;
        }
        .btn-callback:hover,
        .btn-callback.is-active-drop {
          background: #fef3c7;
          border-color: #f59e0b;
          box-shadow: 0 4px 12px rgba(217, 119, 6, 0.18);
        }

        .btn-interested {
          background: #f0fdf4;
          border-color: #bbf7d0;
          color: #16a34a;
        }
        .btn-interested:hover {
          background: #dcfce7;
          box-shadow: 0 4px 12px rgba(22, 163, 74, 0.18);
        }

        .btn-deal-won {
          background: #fefce8;
          border-color: #fef08a;
          color: #854d0e;
        }
        .btn-deal-won:hover,
        .btn-deal-won.is-active-drop {
          background: #fef9c3;
          border-color: #eab308;
          box-shadow: 0 4px 12px rgba(234, 179, 8, 0.25);
        }

        .btn-not-interested {
          background: #f8fafc;
          border-color: #e2e8f0;
          color: #64748b;
          grid-column: span 2;
        }
        .btn-not-interested:hover {
          background: #f1f5f9;
          color: #334155;
        }

        /* Deal won presets panel */
        .deal-won-presets-panel {
          margin-top: 1.15rem;
          background: #fefce8;
          border: 1.5px solid #facc15;
          border-radius: 12px;
          padding: 1.15rem;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          animation: slideDown 0.2s ease;
        }
        .deal-won-header {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.85rem;
          font-weight: 700;
          color: #854d0e;
        }
        .deal-amount-presets {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.5rem;
        }
        .deal-preset-btn {
          background: #ffffff;
          border: 1px solid #facc15;
          padding: 0.55rem 0.6rem;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          transition: all 0.15s;
        }
        .deal-preset-btn:hover,
        .deal-preset-btn.active {
          background: #fef08a;
          border-color: #ca8a04;
          transform: translateY(-1px);
        }
        .deal-preset-btn span {
          font-size: 0.82rem;
          font-weight: 700;
          color: #854d0e;
        }
        .deal-preset-btn small {
          font-size: 0.68rem;
          color: #a16207;
        }
        .deal-custom-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border-top: 1px solid #fef08a;
          padding-top: 0.75rem;
        }
        .deal-custom-row label {
          font-size: 0.75rem;
          font-weight: 700;
          color: #854d0e;
          white-space: nowrap;
        }
        .deal-custom-input {
          flex: 1;
          padding: 0.4rem 0.6rem;
          border: 1px solid #ca8a04;
          border-radius: 6px;
          font-size: 0.85rem;
          background: #ffffff;
        }
        .btn-confirm-deal-won {
          background: #d97706;
          color: #ffffff;
          border: none;
          padding: 0.45rem 0.95rem;
          border-radius: 6px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s;
        }
        .btn-confirm-deal-won:hover {
          background: #b45309;
        }
        .text-amber {
          color: #d97706;
        }

        /* Follow-up presets panel */
        .followup-presets-panel {
          margin-top: 1.15rem;
          background: #fefce8;
          border: 1.5px solid #fde047;
          border-radius: 12px;
          padding: 1.15rem;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          animation: slideDown 0.2s ease;
        }
        .followup-panel-header {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.85rem;
          font-weight: 700;
          color: #854d0e;
        }
        .presets-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.5rem;
        }
        .preset-btn {
          background: #ffffff;
          border: 1px solid #facc15;
          padding: 0.55rem 0.75rem;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          cursor: pointer;
          transition: all 0.15s;
        }
        .preset-btn:hover {
          background: #fef9c3;
          border-color: #eab308;
          transform: translateY(-1px);
        }
        .preset-btn span {
          font-size: 0.75rem;
          color: #713f12;
        }
        .preset-btn strong {
          font-size: 0.88rem;
          color: #854d0e;
        }
        .custom-datetime-row {
          display: flex;
          align-items: flex-end;
          gap: 0.5rem;
          border-top: 1px solid #fef08a;
          padding-top: 0.75rem;
        }
        .custom-date-field,
        .custom-time-field {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .custom-date-field label,
        .custom-time-field label {
          font-size: 0.72rem;
          font-weight: 600;
          color: #713f12;
        }
        .date-input-sm {
          padding: 0.35rem 0.5rem;
          border: 1px solid #ca8a04;
          border-radius: 6px;
          font-size: 0.82rem;
          background: #ffffff;
        }
        .btn-save-custom-followup {
          background: #ca8a04;
          color: #ffffff;
          border: none;
          padding: 0.45rem 0.85rem;
          border-radius: 6px;
          font-weight: 700;
          font-size: 0.82rem;
          cursor: pointer;
        }
        .btn-save-custom-followup:hover {
          background: #a16207;
        }

        /* Brochure Box */
        .brochure-heading-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .btn-edit-brochure-link {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          background: transparent;
          border: none;
          color: #2563eb;
          font-size: 0.78rem;
          font-weight: 500;
          cursor: pointer;
          text-decoration: underline;
        }
        .brochure-status-badge {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.78rem;
          font-weight: 600;
          padding: 0.25rem 0.65rem;
          border-radius: 9999px;
        }
        .brochure-status-badge.sent {
          background: #dcfce7;
          color: #15803d;
        }
        .brochure-status-badge.not-sent {
          background: #f1f5f9;
          color: #64748b;
        }
        .edit-brochure-drawer {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 0.85rem;
          margin-bottom: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .edit-brochure-drawer label {
          font-size: 0.78rem;
          font-weight: 600;
          color: #334155;
        }
        .brochure-url-input-row {
          display: flex;
          gap: 0.5rem;
        }
        .brochure-input {
          flex: 1;
          padding: 0.45rem 0.65rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.85rem;
          outline: none;
        }
        .brochure-input:focus {
          border-color: #2563eb;
        }
        .btn-save-url {
          background: #2563eb;
          color: #ffffff;
          border: none;
          padding: 0.45rem 0.85rem;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.82rem;
          cursor: pointer;
        }
        .brochure-action-row {
          display: flex;
          gap: 0.75rem;
        }
        .btn-send-brochure-wa {
          flex: 1.4;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          background: #1e50bc;
          color: #ffffff;
          border: none;
          padding: 0.85rem 1rem;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.92rem;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(30, 80, 188, 0.25);
          transition: all 0.15s;
        }
        .btn-send-brochure-wa:hover {
          background: #1742a0;
          transform: translateY(-1px);
        }
        .btn-toggle-brochure {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          background: #ffffff;
          border: 1.5px solid #cbd5e1;
          color: #475569;
          padding: 0.85rem 0.75rem;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.88rem;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-toggle-brochure:hover {
          background: #f8fafc;
          border-color: #94a3b8;
        }
        .btn-toggle-brochure.is-marked {
          border-color: #16a34a;
          background: #f0fdf4;
          color: #15803d;
        }

        /* Keyboard shortcuts pill */
        .keyboard-shortcuts-pill {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.5rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 0.65rem 0.85rem;
          border-radius: 10px;
          font-size: 0.75rem;
          color: #64748b;
        }
        .keys-label {
          font-weight: 700;
          color: #334155;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .key-tag {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          font-family: var(--font-mono, monospace);
          font-weight: 600;
          color: #1e293b;
        }

        @media (max-width: 1024px) {
          .dialer-content-grid {
            grid-template-columns: 1fr;
            gap: 1.15rem;
          }
          .client-main-card {
            padding: 1.35rem;
          }
          .panel-box {
            padding: 1.35rem;
          }
        }

        @media (max-width: 768px) {
          .dialer-wrapper {
            gap: 1rem;
          }
          .dialer-top-bar {
            flex-direction: column;
            align-items: stretch;
            gap: 0.65rem;
            padding: 0.75rem 0.95rem;
          }
          .queue-filter-group {
            width: 100%;
          }
          .top-right-controls {
            justify-content: flex-end;
          }
          .keyboard-shortcuts-pill {
            display: none;
          }
          .requirement-textarea,
          .dialer-textarea {
            font-size: 16px !important;
          }
          .progress-info-row {
            gap: 0.5rem;
          }
          .progress-text {
            font-size: 0.85rem;
          }
          .nav-btn {
            padding: 0.45rem 0.75rem;
            font-size: 0.78rem;
            min-height: 38px;
          }
          .phone-call-banner {
            flex-direction: column;
            align-items: stretch;
            gap: 0.85rem;
            padding: 1rem;
          }
          .phone-val-row {
            justify-content: space-between;
          }
          .call-buttons-row {
            width: 100%;
            display: flex;
            gap: 0.5rem;
          }
          .btn-dial-primary,
          .btn-wa-direct {
            flex: 1;
            justify-content: center;
            min-height: 48px;
            font-size: 0.95rem;
          }
          .brochure-action-row {
            flex-direction: column;
            gap: 0.5rem;
          }
          .btn-send-brochure-wa {
            width: 100%;
            min-height: 48px;
            font-size: 0.92rem;
            justify-content: center;
          }
          .btn-toggle-brochure {
            width: 100%;
            min-height: 42px;
            font-size: 0.88rem;
            justify-content: center;
          }
        }

        @media (max-width: 540px) {
          .dialer-top-bar {
            padding: 0.65rem 0.75rem;
          }
          .client-main-card {
            padding: 1rem;
            border-radius: 14px;
            gap: 1rem;
          }
          .client-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }
          .client-business-name {
            font-size: 1.35rem;
            line-height: 1.22;
            word-break: break-word;
          }
          .client-owner-name {
            font-size: 0.88rem;
          }
          .call-timer-box {
            align-self: flex-start;
          }
          .phone-display {
            font-size: 1.35rem;
          }
          .panel-box {
            padding: 1rem;
            border-radius: 14px;
          }
          .panel-title {
            font-size: 1rem;
          }
          .panel-title-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
            margin-bottom: 0.85rem;
          }
          .outcome-buttons-grid {
            gap: 0.5rem;
          }
          .outcome-btn {
            padding: 0.75rem 0.65rem;
            min-height: 52px;
          }
          .outcome-primary {
            font-size: 0.88rem;
          }
          .outcome-hint {
            font-size: 0.7rem;
            line-height: 1.2;
          }
          .key-shortcut-hint {
            display: none;
          }
          .followup-presets-panel {
            padding: 0.85rem;
            gap: 0.65rem;
          }
          .presets-row {
            grid-template-columns: 1fr 1fr;
            gap: 0.4rem;
          }
          .preset-btn {
            padding: 0.5rem 0.55rem;
          }
          .preset-btn span {
            font-size: 0.7rem;
          }
          .preset-btn strong {
            font-size: 0.82rem;
          }
          .custom-datetime-row {
            flex-direction: column;
            align-items: stretch;
            gap: 0.5rem;
          }
          .custom-date-field,
          .custom-time-field {
            width: 100%;
          }
          .date-input-sm {
            width: 100%;
            min-height: 40px;
            font-size: 16px !important;
          }
          .btn-save-custom-followup {
            width: 100%;
            min-height: 42px;
            font-size: 0.88rem;
            justify-content: center;
          }
          .edit-brochure-drawer {
            padding: 0.75rem;
          }
          .brochure-url-input-row {
            flex-direction: column;
            gap: 0.4rem;
          }
          .brochure-input {
            width: 100%;
            min-height: 40px;
            font-size: 16px !important;
          }
          .btn-save-url {
            min-height: 40px;
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
