'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Lead,
  CallResult,
  CallOpenerScript,
  CommonObjection,
  CallScriptConfig,
  ObjectionItem,
  CALL_OPENER_SCRIPTS,
  COMMON_OBJECTIONS,
} from '@/types/crm';
import { cleanPhoneNumber } from '@/lib/whatsapp';
import { getStoredCallScripts, saveStoredCallScripts } from '@/lib/storage';
import InstagramIcon from '@/components/common/InstagramIcon';
import {
  X,
  PhoneCall,
  Phone,
  MessageCircle,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Globe,
  MapPin,
  Sparkles,
  Search,
  CheckSquare,
  Square,
  HelpCircle,
  Volume2,
  Copy,
  Check,
  Edit3,
  Settings,
  ChevronRight,
  Clock,
  AlertCircle,
  Tag,
  Flame,
  Snowflake,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

interface InCallAssistantModalProps {
  lead: Lead;
  activeRep: string;
  onClose: () => void;
  onSaveCallLog: (
    leadId: string,
    log: {
      repName: string;
      openerScript: CallOpenerScript;
      result: CallResult;
      objection?: CommonObjection;
      objections?: string[];
      askedForWhatsApp: boolean;
      notes: string;
      nextFollowUpDate?: string;
    },
    leadUpdates?: {
      requirement?: string;
      notes?: string;
      followUpDate?: string;
    }
  ) => void;
}

export default function InCallAssistantModal({
  lead,
  activeRep,
  onClose,
  onSaveCallLog,
}: InCallAssistantModalProps) {
  // Call script configuration from storage (editable)
  const [scriptConfig, setScriptConfig] = useState<CallScriptConfig>(() =>
    getStoredCallScripts()
  );
  const [isEditingScripts, setIsEditingScripts] = useState(false);

  // Form State
  const [repName, setRepName] = useState(
    activeRep !== 'All' && activeRep !== 'All Reps'
      ? activeRep
      : lead.assignedRep || 'Aman'
  );
  const [openerScript, setOpenerScript] =
    useState<CallOpenerScript>('Direct GBP Audit');
  const [result, setResult] = useState<CallResult>('Connected');
  const [taggedObjections, setTaggedObjections] = useState<string[]>([]);
  const [askedForWhatsApp, setAskedForWhatsApp] = useState(false);
  const [callNotes, setCallNotes] = useState(lead.notes || '');
  const [requirementText, setRequirementText] = useState(lead.requirement || '');
  const [nextFollowUpDate, setNextFollowUpDate] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );

  // Live Call Checklist progress tracking
  const [checkedStages, setCheckedStages] = useState<Record<string, boolean>>({
    'stage-1': true, // Opening checked by default
  });

  // Objection Lookup search & selected reply
  const [objectionSearch, setObjectionSearch] = useState('');
  const [selectedObjection, setSelectedObjection] = useState<ObjectionItem | null>(
    () => scriptConfig.objections[0] || null
  );

  // Copy feedback state
  const [isCopied, setIsCopied] = useState(false);

  // Call timer elapsed
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  // Refs for auto-focusing textareas
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const requirementRef = useRef<HTMLTextAreaElement>(null);

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleStage = (stageId: string) => {
    setCheckedStages((prev) => ({
      ...prev,
      [stageId]: !prev[stageId],
    }));
  };

  // Replace [Rep Name] dynamically in the opening script
  const dynamicOpeningScript = scriptConfig.openingScript.replace(
    /\[Rep Name\]/gi,
    repName || 'Aman'
  );

  const handleCopyOpening = () => {
    navigator.clipboard.writeText(dynamicOpeningScript);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Objection click: show verbatim reply and auto-tag in call log
  const handleSelectObjection = (obj: ObjectionItem) => {
    setSelectedObjection(obj);
    if (!taggedObjections.includes(obj.objection)) {
      setTaggedObjections((prev) => [...prev, obj.objection]);
    }
  };

  const handleToggleObjectionTag = (objectionText: string) => {
    setTaggedObjections((prev) =>
      prev.includes(objectionText)
        ? prev.filter((o) => o !== objectionText)
        : [...prev, objectionText]
    );
  };

  // Qualification Question trigger: auto-fill & auto-focus matching field
  const handleTriggerQualification = (
    mapsTo: 'notes' | 'requirement',
    headerPrefix: string
  ) => {
    if (mapsTo === 'requirement') {
      const updated = requirementText
        ? `${requirementText}\n${headerPrefix}`
        : `${headerPrefix}`;
      setRequirementText(updated);
      setTimeout(() => {
        if (requirementRef.current) {
          requirementRef.current.focus();
          requirementRef.current.scrollTop = requirementRef.current.scrollHeight;
        }
      }, 50);
    } else {
      const updated = callNotes
        ? `${callNotes}\n${headerPrefix}`
        : `${headerPrefix}`;
      setCallNotes(updated);
      setTimeout(() => {
        if (notesRef.current) {
          notesRef.current.focus();
          notesRef.current.scrollTop = notesRef.current.scrollHeight;
        }
      }, 50);
    }
  };

  // Handle Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Map the first tagged objection or standard objection for backward compatibility
    const matchedCommonObj = COMMON_OBJECTIONS.find((o) =>
      taggedObjections.some((tag) => tag.toLowerCase().includes(o.toLowerCase()))
    );

    const callLogPayload = {
      repName,
      openerScript,
      result,
      objection: matchedCommonObj,
      objections: taggedObjections,
      askedForWhatsApp,
      notes: callNotes,
      nextFollowUpDate:
        result === 'Callback' || result === 'Interested' || result === 'Connected'
          ? nextFollowUpDate
          : undefined,
    };

    const leadUpdatesPayload = {
      requirement: requirementText,
      notes: callNotes,
      followUpDate:
        result === 'Callback' || result === 'Interested' || result === 'Connected'
          ? nextFollowUpDate
          : lead.followUpDate,
    };

    onSaveCallLog(lead.id, callLogPayload, leadUpdatesPayload);
    onClose();
  };

  const cleanedPhone = cleanPhoneNumber(lead.phone);

  // Filtered objections
  const filteredObjections = scriptConfig.objections.filter((o) =>
    o.objection.toLowerCase().includes(objectionSearch.toLowerCase()) ||
    o.reply.toLowerCase().includes(objectionSearch.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content in-call-assistant-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP BAR: PROSPECT IDENTITY & REAL-TIME CALL CONTROLS */}
        <div className="assistant-top-header">
          <div className="header-left-col">
            <div className="call-live-indicator">
              <span className="live-call-dot" />
              <PhoneCall size={16} className="call-icon" />
              <span className="timer-badge">{formatTimer(secondsElapsed)}</span>
            </div>
            <div>
              <div className="lead-title-row">
                <h2 className="lead-business-name">{lead.businessName}</h2>
                <span className={`priority-tag ${lead.priority.toLowerCase()}`}>
                  {lead.priority === 'HOT' && <Flame size={12} />}
                  {lead.priority === 'COLD' && <Snowflake size={12} />}
                  {lead.priority} ({lead.score} pts)
                </span>
              </div>
              <div className="lead-meta-row">
                <span className="lead-owner-name">{lead.ownerName || 'Business Owner'}</span>
                <span className="meta-bullet">•</span>
                <span className="lead-industry-text">{lead.industry || 'Local Business'}</span>
                <span className="meta-bullet">•</span>
                <span className="lead-city-text">{lead.city || 'India'}</span>
              </div>
            </div>
          </div>

          <div className="header-right-actions">
            {/* Quick Dialers */}
            <a
              href={`tel:${cleanedPhone}`}
              className="btn btn-primary btn-sm quick-dial-btn"
              title="Launch Phone Call on Mobile/Dialer"
            >
              <Phone size={14} />
              <span>Direct Dial</span>
            </a>
            <a
              href={`https://wa.me/${cleanedPhone}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm quick-wa-btn"
              title="Open WhatsApp Chat"
            >
              <MessageCircle size={14} />
              <span>WhatsApp</span>
            </a>
            <button
              onClick={() => setIsEditingScripts(!isEditingScripts)}
              className="btn-icon btn-secondary"
              title="Customize Sales Scripts"
            >
              <Settings size={15} />
            </button>
            <button onClick={onClose} className="btn-icon btn-secondary" title="Close Assistant">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* 1. DIGITAL PRESENCE OBSERVATION STRIP */}
        <div className="observation-bar">
          <span className="observation-label">Live Online Observation:</span>
          <div className="observation-items">
            {lead.website ? (
              <a
                href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                target="_blank"
                rel="noreferrer"
                className="obs-chip has-asset"
                title={`Open Website: ${lead.website}`}
              >
                <Globe size={13} />
                <span>Website</span>
                <ExternalLink size={10} />
              </a>
            ) : (
              <span className="obs-chip missing-asset" title="Opportunity: Prospect has no website (+3 Score)">
                <Globe size={13} />
                <span>No Website</span>
              </span>
            )}

            {lead.googleProfile ? (
              <a
                href={lead.googleProfile.startsWith('http') ? lead.googleProfile : `https://${lead.googleProfile}`}
                target="_blank"
                rel="noreferrer"
                className="obs-chip has-asset"
                title="Open Google Business Profile"
              >
                <MapPin size={13} />
                <span>Google Profile</span>
                <ExternalLink size={10} />
              </a>
            ) : (
              <span className="obs-chip missing-asset" title="Opportunity: Google Profile not optimized">
                <MapPin size={13} />
                <span>Google Profile Missing</span>
              </span>
            )}

            {lead.instagram ? (
              <a
                href={lead.instagram.startsWith('http') ? lead.instagram : `https://${lead.instagram}`}
                target="_blank"
                rel="noreferrer"
                className="obs-chip has-asset"
                title="Open Instagram Profile"
              >
                <InstagramIcon size={13} />
                <span>Instagram</span>
                <ExternalLink size={10} />
              </a>
            ) : (
              <span className="obs-chip missing-asset" title="Opportunity: Inactive or Missing Instagram">
                <InstagramIcon size={13} />
                <span>Instagram Missing</span>
              </span>
            )}
          </div>
        </div>

        {/* SCRIPT EDITOR MODAL DRAWER (WHEN MANAGER OPENS SETTINGS) */}
        {isEditingScripts && (
          <div className="script-editor-box">
            <div className="editor-header">
              <div className="editor-title-row">
                <Edit3 size={15} />
                <strong>Customize In-Call Scripts &amp; Pitch Wording</strong>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingScripts(false)}
                className="btn btn-secondary btn-sm"
              >
                Close Editor
              </button>
            </div>
            <div className="editor-field">
              <label className="editor-label">Opening Pitch Template (use [Rep Name] for dynamic insertion)</label>
              <textarea
                rows={3}
                value={scriptConfig.openingScript}
                onChange={(e) => {
                  const updated = { ...scriptConfig, openingScript: e.target.value };
                  setScriptConfig(updated);
                  saveStoredCallScripts(updated);
                }}
                className="form-textarea editor-textarea"
              />
            </div>
          </div>
        )}

        {/* MAIN BODY: 2-COLUMN DESKTOP SPLIT (LEFT: SCRIPT & OBJECTIONS | RIGHT: QUALIFICATION & LOGGING) */}
        <div className="assistant-main-grid">
          {/* ================= LEFT COLUMN: LIVE SALES SCRIPT & OBJECTIONS ================= */}
          <div className="assistant-left-col">
            {/* A. DYNAMIC OPENING PITCH SCRIPT */}
            <div className="script-card opening-card">
              <div className="script-card-header">
                <div className="header-badge-title">
                  <Volume2 size={15} className="blue-icon" />
                  <span className="card-title-text">Opening Pitch (Hinglish)</span>
                  <span className="rep-tag-badge">Rep: {repName}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyOpening}
                  className="copy-btn"
                  title="Copy Opening Script"
                >
                  {isCopied ? <Check size={13} className="check-green" /> : <Copy size={13} />}
                  <span>{isCopied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              <div className="opening-script-content">
                &ldquo;{dynamicOpeningScript}&rdquo;
              </div>
            </div>

            {/* B. 5-STAGE LIVE CALL PROGRESS CHECKLIST */}
            <div className="script-card stages-card">
              <div className="script-card-header">
                <div className="header-badge-title">
                  <CheckSquare size={15} className="green-icon" />
                  <span className="card-title-text">5-Stage Call Flow Checklist</span>
                </div>
                <span className="stages-count-text">
                  {Object.values(checkedStages).filter(Boolean).length} / {scriptConfig.stages.length} Completed
                </span>
              </div>

              <div className="stages-list">
                {scriptConfig.stages.map((stg, index) => {
                  const isChecked = !!checkedStages[stg.id];
                  return (
                    <div
                      key={stg.id}
                      onClick={() => toggleStage(stg.id)}
                      className={`stage-row-item ${isChecked ? 'is-completed' : ''}`}
                    >
                      <button type="button" className="stage-check-btn">
                        {isChecked ? (
                          <CheckCircle2 size={16} className="check-icon-active" />
                        ) : (
                          <Square size={16} className="check-icon-inactive" />
                        )}
                      </button>
                      <div className="stage-content-col">
                        <div className="stage-name-row">
                          <span className="stage-number">Step {index + 1}:</span>
                          <strong className="stage-title">{stg.stageName}</strong>
                          <span className="stage-desc">{stg.description}</span>
                        </div>
                        {stg.suggestedPrompt && (
                          <p className="stage-cue-tip">{stg.suggestedPrompt}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* C. OBJECTION QUICK-REPLY LOOKUP */}
            <div className="script-card objections-card">
              <div className="script-card-header">
                <div className="header-badge-title">
                  <ShieldCheck size={15} className="purple-icon" />
                  <span className="card-title-text">Objection Quick-Reply Lookup</span>
                </div>
                <div className="objection-search-input-wrap">
                  <Search size={12} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search objection (e.g. budget, marketing)..."
                    value={objectionSearch}
                    onChange={(e) => setObjectionSearch(e.target.value)}
                    className="objection-search-input"
                  />
                </div>
              </div>

              {/* Objection Pill Tap Targets */}
              <div className="objection-pill-grid">
                {filteredObjections.map((obj) => {
                  const isSelected = selectedObjection?.id === obj.id;
                  const isTagged = taggedObjections.includes(obj.objection);
                  return (
                    <button
                      key={obj.id}
                      type="button"
                      onClick={() => handleSelectObjection(obj)}
                      className={`objection-chip-btn ${isSelected ? 'is-active-obj' : ''} ${
                        isTagged ? 'is-tagged-obj' : ''
                      }`}
                    >
                      <span>{obj.objection}</span>
                      {isTagged && <span className="tagged-mini-dot" title="Tagged in call log" />}
                    </button>
                  );
                })}
              </div>

              {/* Selected Objection Full Verbatim Scripted Reply */}
              {selectedObjection && (
                <div className="verbatim-reply-box">
                  <div className="reply-header-row">
                    <span className="reply-caption">
                      SCRIPTED REPLY FOR: <strong>&ldquo;{selectedObjection.objection}&rdquo;</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleObjectionTag(selectedObjection.objection)}
                      className={`tag-toggle-btn ${
                        taggedObjections.includes(selectedObjection.objection) ? 'tagged' : ''
                      }`}
                    >
                      <Tag size={11} />
                      <span>
                        {taggedObjections.includes(selectedObjection.objection)
                          ? 'Tagged in Log ✓'
                          : '+ Tag in Log'}
                      </span>
                    </button>
                  </div>
                  <blockquote className="verbatim-reply-text">
                    &ldquo;{selectedObjection.reply}&rdquo;
                  </blockquote>
                </div>
              )}
            </div>

            {/* D. 5 POWERFUL COUNTER-QUESTIONS REFERENCE STRIP */}
            <div className="counter-questions-bar">
              <div className="counter-head">
                <HelpCircle size={14} className="counter-head-icon" />
                <span className="counter-title">5 Powerful Counter-Questions Reference:</span>
              </div>
              <div className="counter-questions-scroller">
                {scriptConfig.counterQuestions.map((q, idx) => (
                  <div key={idx} className="counter-q-pill">
                    <span className="counter-q-idx">Q{idx + 1}</span>
                    <span className="counter-q-text">{q}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: QUALIFICATION CHECKLIST & IN-PANEL LOGGING ================= */}
          <div className="assistant-right-col">
            <form onSubmit={handleSubmit} className="in-call-form">
              {/* SECTION 1: QUALIFICATION QUESTIONS CHECKLIST */}
              <div className="script-card qualification-card">
                <div className="script-card-header">
                  <div className="header-badge-title">
                    <Sparkles size={15} className="amber-icon" />
                    <span className="card-title-text">Qualification Prompts</span>
                  </div>
                  <span className="field-hint-mini">Tap question to auto-focus note</span>
                </div>

                <div className="qual-buttons-list">
                  {scriptConfig.qualificationPrompts.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleTriggerQualification(item.mapsTo, item.headerPrefix)}
                      className="qual-item-row"
                      title={`Append to ${item.mapsTo.toUpperCase()}: ${item.hint}`}
                    >
                      <div className="qual-text-left">
                        <span className="qual-q-text">{item.question}</span>
                        <span className="qual-dest-badge">
                          &rarr; {item.mapsTo === 'notes' ? 'Call Notes' : 'Lead Requirement'}
                        </span>
                      </div>
                      <ChevronRight size={14} className="qual-arrow-icon" />
                    </button>
                  ))}
                </div>
              </div>

              {/* SECTION 2: IN-PANEL CALL LOGGING */}
              <div className="script-card log-form-card">
                <div className="script-card-header">
                  <div className="header-badge-title">
                    <CheckCircle2 size={15} className="blue-icon" />
                    <span className="card-title-text">Call Outcome &amp; Activity Log</span>
                  </div>
                </div>

                <div className="form-fields-container">
                  <div className="form-row-2">
                    {/* Active Rep */}
                    <div className="form-field-group">
                      <label className="field-label">Representative</label>
                      <input
                        type="text"
                        value={repName}
                        onChange={(e) => setRepName(e.target.value)}
                        className="form-input"
                        required
                      />
                    </div>

                    {/* Call Result */}
                    <div className="form-field-group">
                      <label className="field-label">Call Result</label>
                      <select
                        value={result}
                        onChange={(e) => setResult(e.target.value as CallResult)}
                        className="form-select"
                        required
                      >
                        <option value="Connected">Connected</option>
                        <option value="Interested">Interested (Discovery/Pitch)</option>
                        <option value="Callback">Callback Requested</option>
                        <option value="No Answer">No Answer / Busy</option>
                        <option value="Not Interested">Not Interested</option>
                      </select>
                    </div>
                  </div>

                  {/* Tagged Objections Summary */}
                  {taggedObjections.length > 0 && (
                    <div className="tagged-objections-summary">
                      <span className="tagged-label">Objections Faced:</span>
                      <div className="tagged-pills-row">
                        {taggedObjections.map((tag) => (
                          <span key={tag} className="tagged-pill-badge">
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleToggleObjectionTag(tag)}
                              className="remove-tag-btn"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Asked for WhatsApp Checkbox */}
                  <div className="whatsapp-request-box">
                    <label className="wa-checkbox-label">
                      <input
                        type="checkbox"
                        checked={askedForWhatsApp}
                        onChange={(e) => setAskedForWhatsApp(e.target.checked)}
                      />
                      <span>Prospect agreed to WhatsApp demo / video audit</span>
                    </label>
                  </div>

                  {/* Scheduled Callback / Next Follow-up Date */}
                  {(result === 'Callback' || result === 'Interested' || result === 'Connected') && (
                    <div className="form-field-group">
                      <label className="field-label">
                        <Calendar size={13} /> Schedule Follow-up / Callback Date
                      </label>
                      <div className="date-input-with-presets">
                        <input
                          type="date"
                          value={nextFollowUpDate}
                          onChange={(e) => setNextFollowUpDate(e.target.value)}
                          className="form-input"
                        />
                        <div className="date-presets">
                          <button
                            type="button"
                            onClick={() =>
                              setNextFollowUpDate(
                                new Date(Date.now() + 86400000).toISOString().slice(0, 10)
                              )
                            }
                            className="preset-btn"
                          >
                            Tomorrow
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setNextFollowUpDate(
                                new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)
                              )
                            }
                            className="preset-btn"
                          >
                            In 2 Days
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Lead Requirement Note (Mapped from Qualification) */}
                  <div className="form-field-group">
                    <label className="field-label">
                      Lead Requirement &amp; Pain Points
                      <span className="field-subtext">(Saved directly to Lead profile)</span>
                    </label>
                    <textarea
                      ref={requirementRef}
                      rows={3}
                      placeholder="E.g., Needs complete GBP ranking overhaul + 5-page responsive website..."
                      value={requirementText}
                      onChange={(e) => setRequirementText(e.target.value)}
                      className="form-textarea"
                    />
                  </div>

                  {/* Call Discussion Notes */}
                  <div className="form-field-group">
                    <label className="field-label">
                      Call Discussion Notes
                      <span className="field-subtext">(Logged in Call History)</span>
                    </label>
                    <textarea
                      ref={notesRef}
                      rows={3}
                      placeholder="E.g., Owner was polite, asked for video comparison with competitor clinic..."
                      value={callNotes}
                      onChange={(e) => setCallNotes(e.target.value)}
                      className="form-textarea"
                    />
                  </div>
                </div>

                {/* Footer Save Action */}
                <div className="in-call-footer">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary submit-call-btn">
                    <CheckCircle2 size={16} />
                    <span>Save &amp; Complete Call</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      <style jsx>{`
        .in-call-assistant-dialog {
          max-width: 1200px;
          width: 95vw;
          max-height: 92vh;
          display: flex;
          flex-direction: column;
          padding: 0;
          overflow: hidden;
          background: #f8fafc;
          border-radius: var(--radius-lg);
          box-shadow: 0 25px 50px -12px rgba(11, 29, 51, 0.25);
        }

        /* TOP HEADER */
        .assistant-top-header {
          background: #ffffff;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .header-left-col {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .call-live-indicator {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          padding: 0.35rem 0.65rem;
          border-radius: var(--radius-full);
        }
        .live-call-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #dc2626;
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.2);
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        .call-icon {
          color: #dc2626;
        }
        .timer-badge {
          font-family: var(--font-mono);
          font-size: 0.78rem;
          font-weight: 700;
          color: #dc2626;
        }
        .lead-title-row {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }
        .lead-business-name {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--brand-navy);
          letter-spacing: -0.02em;
        }
        .priority-tag {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.15rem 0.5rem;
          border-radius: var(--radius-full);
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }
        .priority-tag.hot {
          background: var(--priority-hot-bg);
          color: var(--priority-hot-text);
          border: 1px solid var(--priority-hot-border);
        }
        .priority-tag.warm {
          background: var(--priority-warm-bg);
          color: var(--priority-warm-text);
          border: 1px solid var(--priority-warm-border);
        }
        .priority-tag.cold {
          background: var(--priority-cold-bg);
          color: var(--priority-cold-text);
          border: 1px solid var(--priority-cold-border);
        }
        .lead-meta-row {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-top: 0.15rem;
        }
        .lead-owner-name {
          font-weight: 600;
          color: var(--text-secondary);
        }
        .meta-bullet {
          color: var(--border);
        }
        .header-right-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .quick-dial-btn {
          gap: 0.35rem;
          font-weight: 700;
        }
        .quick-wa-btn {
          gap: 0.35rem;
          font-weight: 600;
          background: #ecfdf5;
          color: #059669;
          border-color: #a7f3d0;
        }
        .quick-wa-btn:hover {
          background: #d1fae5;
        }

        /* OBSERVATION BAR */
        .observation-bar {
          background: #eff6ff;
          border-bottom: 1px solid #dbeafe;
          padding: 0.55rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.85rem;
          flex-wrap: wrap;
        }
        .observation-label {
          font-size: 0.76rem;
          font-weight: 700;
          color: var(--brand-navy);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .observation-items {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .obs-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.76rem;
          font-weight: 600;
          padding: 0.2rem 0.55rem;
          border-radius: var(--radius-full);
          transition: all 0.15s ease;
        }
        .obs-chip.has-asset {
          background: #ffffff;
          color: var(--brand-blue);
          border: 1px solid var(--brand-border);
        }
        .obs-chip.has-asset:hover {
          background: var(--brand-blue);
          color: #ffffff;
        }
        .obs-chip.missing-asset {
          background: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fecaca;
        }

        /* SCRIPT EDITOR BOX */
        .script-editor-box {
          background: #ffffff;
          border-bottom: 2px solid var(--brand-blue);
          padding: 1rem 1.5rem;
          animation: slideDown 0.2s ease;
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .editor-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }
        .editor-title-row {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          color: var(--brand-navy);
          font-size: 0.88rem;
        }
        .editor-label {
          font-size: 0.76rem;
          font-weight: 600;
          color: var(--text-secondary);
          display: block;
          margin-bottom: 0.25rem;
        }
        .editor-textarea {
          font-size: 0.85rem;
          line-height: 1.4;
        }

        /* MAIN GRID */
        .assistant-main-grid {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 1.25rem;
          padding: 1.25rem 1.5rem;
          overflow-y: auto;
          flex: 1;
        }

        .assistant-left-col {
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
        }

        .assistant-right-col {
          display: flex;
          flex-direction: column;
        }

        .in-call-form {
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
        }

        /* SCRIPT CARDS */
        .script-card {
          background: #ffffff;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-xs);
          overflow: hidden;
        }
        .script-card-header {
          padding: 0.65rem 0.95rem;
          background: #f8fafc;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .header-badge-title {
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }
        .card-title-text {
          font-size: 0.84rem;
          font-weight: 700;
          color: var(--brand-navy);
        }
        .rep-tag-badge {
          font-size: 0.68rem;
          font-weight: 600;
          color: var(--brand-blue);
          background: #eff6ff;
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
        }
        .blue-icon {
          color: var(--brand-blue);
        }
        .green-icon {
          color: #059669;
        }
        .purple-icon {
          color: #7e22ce;
        }
        .amber-icon {
          color: #d97706;
        }
        .copy-btn {
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 0.2rem 0.5rem;
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 0.3rem;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .copy-btn:hover {
          background: #ffffff;
          border-color: var(--brand-blue);
          color: var(--brand-blue);
        }
        .check-green {
          color: #059669;
        }

        /* OPENING CARD */
        .opening-script-content {
          padding: 0.9rem 1rem;
          font-size: 0.92rem;
          line-height: 1.5;
          color: #0b1d33;
          font-style: italic;
          background: #fcfdfe;
        }

        /* 5 STAGES CARD */
        .stages-count-text {
          font-size: 0.72rem;
          font-weight: 700;
          color: #059669;
          background: #ecfdf5;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
        }
        .stages-list {
          padding: 0.4rem 0.6rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .stage-row-item {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          padding: 0.5rem 0.65rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.12s ease;
        }
        .stage-row-item:hover {
          background: #f8fafc;
        }
        .stage-row-item.is-completed {
          background: #f0fdf4;
        }
        .stage-check-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          padding-top: 0.1rem;
          display: flex;
        }
        .check-icon-active {
          color: #10b981;
        }
        .check-icon-inactive {
          color: #94a3b8;
        }
        .stage-content-col {
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .stage-name-row {
          display: flex;
          align-items: baseline;
          gap: 0.35rem;
          font-size: 0.82rem;
        }
        .stage-number {
          font-weight: 700;
          color: var(--text-muted);
          font-size: 0.75rem;
        }
        .stage-title {
          font-weight: 700;
          color: var(--brand-navy);
        }
        .stage-desc {
          color: var(--text-secondary);
        }
        .stage-cue-tip {
          font-size: 0.72rem;
          color: #2563eb;
          margin-top: 0.15rem;
          font-style: italic;
        }

        /* OBJECTION LOOKUP */
        .objection-search-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .search-icon {
          position: absolute;
          left: 0.5rem;
          color: var(--text-muted);
        }
        .objection-search-input {
          padding: 0.25rem 0.5rem 0.25rem 1.6rem;
          font-size: 0.75rem;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          outline: none;
          width: 190px;
        }
        .objection-search-input:focus {
          border-color: var(--brand-blue);
        }
        .objection-pill-grid {
          padding: 0.75rem;
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          background: #fafafa;
          border-bottom: 1px solid var(--border);
        }
        .objection-chip-btn {
          font-size: 0.78rem;
          font-weight: 600;
          padding: 0.35rem 0.65rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
          background: #ffffff;
          color: var(--text-primary);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          transition: all 0.15s ease;
        }
        .objection-chip-btn:hover {
          border-color: var(--brand-blue);
          color: var(--brand-blue);
        }
        .objection-chip-btn.is-active-obj {
          background: #eff6ff;
          border-color: var(--brand-blue);
          color: var(--brand-blue);
          font-weight: 700;
        }
        .objection-chip-btn.is-tagged-obj {
          border-color: #8b5cf6;
          background: #f5f3ff;
          color: #6d28d9;
        }
        .tagged-mini-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #7c3aed;
        }
        .verbatim-reply-box {
          padding: 0.9rem 1rem;
          background: #ffffff;
        }
        .reply-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.45rem;
        }
        .reply-caption {
          font-size: 0.72rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .reply-caption strong {
          color: var(--brand-navy);
        }
        .tag-toggle-btn {
          font-size: 0.72rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.3rem;
          background: #f8fafc;
          border: 1px solid var(--border);
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          cursor: pointer;
          color: var(--text-secondary);
        }
        .tag-toggle-btn:hover {
          background: #eff6ff;
          color: var(--brand-blue);
        }
        .tag-toggle-btn.tagged {
          background: #ecfdf5;
          color: #065f46;
          border-color: #a7f3d0;
        }
        .verbatim-reply-text {
          font-size: 0.88rem;
          line-height: 1.5;
          color: #1e293b;
          border-left: 3px solid var(--brand-blue);
          padding-left: 0.75rem;
          margin: 0;
          font-weight: 500;
        }

        /* COUNTER QUESTIONS STRIP */
        .counter-questions-bar {
          background: #f1f5f9;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 0.65rem 0.85rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .counter-head {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .counter-head-icon {
          color: var(--brand-blue);
        }
        .counter-title {
          font-size: 0.74rem;
          font-weight: 700;
          color: var(--brand-navy);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .counter-questions-scroller {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .counter-q-pill {
          display: flex;
          align-items: baseline;
          gap: 0.4rem;
          font-size: 0.78rem;
          color: var(--text-secondary);
          background: #ffffff;
          padding: 0.3rem 0.55rem;
          border-radius: 4px;
          border: 1px solid var(--border-subtle);
        }
        .counter-q-idx {
          font-weight: 700;
          color: var(--brand-blue);
          font-size: 0.7rem;
        }

        /* QUALIFICATION QUESTIONS */
        .qualification-card {
          border-color: #fde68a;
          background: #fffbeb;
        }
        .field-hint-mini {
          font-size: 0.68rem;
          color: #92400e;
        }
        .qual-buttons-list {
          padding: 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .qual-item-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #ffffff;
          border: 1px solid #fef3c7;
          border-radius: var(--radius-sm);
          padding: 0.5rem 0.75rem;
          cursor: pointer;
          text-align: left;
          transition: all 0.15s ease;
        }
        .qual-item-row:hover {
          background: #fffdf5;
          border-color: #f59e0b;
          transform: translateX(2px);
        }
        .qual-text-left {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }
        .qual-q-text {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--brand-navy);
        }
        .qual-dest-badge {
          font-size: 0.68rem;
          color: #d97706;
          font-weight: 600;
        }
        .qual-arrow-icon {
          color: #d97706;
        }

        /* LOG FORM */
        .form-fields-container {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .form-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }
        .form-field-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .field-label {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--brand-navy);
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }
        .field-subtext {
          font-size: 0.68rem;
          font-weight: 500;
          color: var(--text-muted);
          margin-left: 0.25rem;
        }
        .tagged-objections-summary {
          background: #f5f3ff;
          border: 1px solid #ddd6fe;
          border-radius: var(--radius-sm);
          padding: 0.5rem 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .tagged-label {
          font-size: 0.72rem;
          font-weight: 700;
          color: #6d28d9;
          text-transform: uppercase;
        }
        .tagged-pills-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
        }
        .tagged-pill-badge {
          font-size: 0.74rem;
          font-weight: 600;
          background: #ffffff;
          border: 1px solid #c4b5fd;
          color: #5b21b6;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
        }
        .remove-tag-btn {
          background: transparent;
          border: none;
          color: #9333ea;
          cursor: pointer;
          font-size: 0.9rem;
          line-height: 1;
        }
        .whatsapp-request-box {
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          border-radius: var(--radius-sm);
          padding: 0.55rem 0.75rem;
        }
        .wa-checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.82rem;
          font-weight: 600;
          color: #065f46;
          cursor: pointer;
        }
        .date-input-with-presets {
          display: flex;
          gap: 0.4rem;
        }
        .date-presets {
          display: flex;
          gap: 0.3rem;
        }
        .preset-btn {
          background: #f1f5f9;
          border: 1px solid var(--border);
          border-radius: 4px;
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-secondary);
          padding: 0.25rem 0.5rem;
          cursor: pointer;
          white-space: nowrap;
        }
        .preset-btn:hover {
          background: #e2e8f0;
          color: var(--brand-navy);
        }
        .in-call-footer {
          padding: 0.85rem 1rem;
          border-top: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.5rem;
          background: #f8fafc;
        }
        .submit-call-btn {
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.6rem 1.2rem;
        }

        /* RESPONSIVE LAYOUT */
        @media (max-width: 900px) {
          .assistant-main-grid {
            grid-template-columns: 1fr;
          }
          .in-call-assistant-dialog {
            width: 100vw;
            height: 100vh;
            max-height: 100vh;
            border-radius: 0;
          }
          .assistant-top-header {
            padding: 0.75rem 1rem;
          }
          .form-row-2 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
