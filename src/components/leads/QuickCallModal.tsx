'use client';

import React, { useState } from 'react';
import {
  Lead,
  CallResult,
  CallOpenerScript,
  CommonObjection,
  CALL_OPENER_SCRIPTS,
  COMMON_OBJECTIONS,
} from '@/types/crm';
import { cleanPhoneNumber } from '@/lib/whatsapp';
import {
  X,
  PhoneCall,
  Phone,
  MessageCircle,
  Clock,
  Calendar,
  Tag,
  FileText,
  CheckCircle2,
} from 'lucide-react';

interface QuickCallModalProps {
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
      askedForWhatsApp: boolean;
      notes: string;
      nextFollowUpDate?: string;
    }
  ) => void;
}

export default function QuickCallModal({
  lead,
  activeRep,
  onClose,
  onSaveCallLog,
}: QuickCallModalProps) {
  const [repName, setRepName] = useState(
    activeRep !== 'All' && activeRep !== 'All Reps' ? activeRep : lead.assignedRep || 'Aman'
  );
  const [openerScript, setOpenerScript] = useState<CallOpenerScript>('Direct GBP Audit');
  const [result, setResult] = useState<CallResult>('Connected');
  const [objection, setObjection] = useState<CommonObjection | ''>('');
  const [askedForWhatsApp, setAskedForWhatsApp] = useState(false);
  const [notes, setNotes] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveCallLog(lead.id, {
      repName,
      openerScript,
      result,
      objection: objection ? (objection as CommonObjection) : undefined,
      askedForWhatsApp,
      notes,
      nextFollowUpDate:
        result === 'Callback' || result === 'Interested' || result === 'Connected'
          ? nextFollowUpDate
          : undefined,
    });
    onClose();
  };

  const cleanedPhone = cleanPhoneNumber(lead.phone);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content quick-call-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="call-icon-badge">
              <PhoneCall size={18} />
            </div>
            <div>
              <h2 className="modal-title">Log Call Attempt</h2>
              <p className="modal-sub">
                {lead.businessName} • {lead.ownerName || 'Owner'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon btn-secondary">
            <X size={16} />
          </button>
        </div>

        {/* Quick Dial Action Bar */}
        <div className="dial-action-bar">
          <div className="dial-phone-text">
            <span>Phone: </span>
            <strong>{lead.phone}</strong>
          </div>
          <div className="dial-btn-row">
            <a
              href={`tel:${cleanedPhone}`}
              className="btn btn-primary btn-sm"
              title="Launch Phone Dialer"
            >
              <Phone size={13} /> Direct Dial
            </a>
            <a
              href={`https://wa.me/${cleanedPhone}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm"
            >
              <MessageCircle size={13} /> WhatsApp
            </a>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="call-form">
          <div className="form-grid-2">
            {/* Sales Rep */}
            <div className="form-group">
              <label className="form-label">Calling Rep</label>
              <input
                type="text"
                value={repName}
                onChange={(e) => setRepName(e.target.value)}
                className="form-input"
                required
              />
            </div>

            {/* Call Result */}
            <div className="form-group">
              <label className="form-label">Call Result</label>
              <select
                value={result}
                onChange={(e) => setResult(e.target.value as CallResult)}
                className="form-select"
                required
              >
                <option value="Connected">Connected</option>
                <option value="Interested">Interested (Qualification)</option>
                <option value="Callback">Callback Requested</option>
                <option value="No Answer">No Answer / Busy</option>
                <option value="Not Interested">Not Interested</option>
              </select>
            </div>
          </div>

          <div className="form-grid-2">
            {/* Call Opener / Script Used */}
            <div className="form-group">
              <label className="form-label">Call Opener / Script Variant</label>
              <select
                value={openerScript}
                onChange={(e) => setOpenerScript(e.target.value as CallOpenerScript)}
                className="form-select"
              >
                {CALL_OPENER_SCRIPTS.map((script) => (
                  <option key={script} value={script}>
                    {script}
                  </option>
                ))}
              </select>
              <span className="field-hint">
                Used to analyze top-converting openers in 7-day review
              </span>
            </div>

            {/* Objection Tagged */}
            <div className="form-group">
              <label className="form-label">Objection Faced (Optional)</label>
              <select
                value={objection}
                onChange={(e) => setObjection(e.target.value as CommonObjection | '')}
                className="form-select"
              >
                <option value="">None / No Objection</option>
                {COMMON_OBJECTIONS.map((obj) => (
                  <option key={obj} value={obj}>
                    {obj}
                  </option>
                ))}
              </select>
              <span className="field-hint">
                Tracks common objections across calls
              </span>
            </div>
          </div>

          {/* Asked for WhatsApp */}
          <div className="whatsapp-checkbox-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={askedForWhatsApp}
                onChange={(e) => setAskedForWhatsApp(e.target.checked)}
              />
              <span>Prospect requested details / audit over WhatsApp</span>
            </label>
          </div>

          {/* Callback / Next Follow-up Date */}
          {(result === 'Callback' || result === 'Interested' || result === 'Connected') && (
            <div className="form-group">
              <label className="form-label">
                <span className="label-with-icon">
                  <Calendar size={13} /> Schedule Next Follow-up / Callback Date
                </span>
              </label>
              <input
                type="date"
                value={nextFollowUpDate}
                onChange={(e) => setNextFollowUpDate(e.target.value)}
                className="form-input"
              />
            </div>
          )}

          {/* Call Notes */}
          <div className="form-group">
            <label className="form-label">Call Discussion &amp; Requirement Notes</label>
            <textarea
              rows={3}
              placeholder="E.g., Dr. Joshi asked for a video audit comparing his clinic with competitors in Andheri..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="form-textarea"
            />
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <CheckCircle2 size={15} /> Save Call Attempt
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .quick-call-dialog {
          max-width: 580px;
          padding: 1.5rem;
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border);
          padding-bottom: 0.9rem;
          margin-bottom: 1rem;
        }
        .modal-header-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .call-icon-badge {
          width: 38px;
          height: 38px;
          border-radius: 8px;
          background: #eff6ff;
          color: var(--brand-blue);
          border: 1px solid var(--brand-border);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--brand-navy);
        }
        .modal-sub {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .dial-action-bar {
          background: #f8fafc;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 0.65rem 0.85rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.25rem;
        }
        .dial-phone-text {
          font-size: 0.84rem;
          color: var(--text-secondary);
        }
        .dial-phone-text strong {
          color: var(--brand-navy);
          font-family: var(--font-mono);
        }
        .dial-btn-row {
          display: flex;
          gap: 0.4rem;
        }
        .form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.85rem;
        }
        .field-hint {
          font-size: 0.7rem;
          color: var(--text-muted);
          margin-top: 0.2rem;
        }
        .whatsapp-checkbox-row {
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          border-radius: var(--radius-sm);
          padding: 0.65rem 0.85rem;
          margin-bottom: 1rem;
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          font-size: 0.82rem;
          font-weight: 600;
          color: #065f46;
          cursor: pointer;
        }
        .label-with-icon {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
          border-top: 1px solid var(--border);
          padding-top: 1rem;
          margin-top: 0.5rem;
        }
        @media (max-width: 600px) {
          .form-grid-2 {
            grid-template-columns: 1fr;
          }
          .dial-action-bar {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}
