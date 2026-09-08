'use client';

import React, { useState } from 'react';
import { WhatsAppTemplate } from '@/types/crm';
import { DEFAULT_WHATSAPP_TEMPLATES } from '@/lib/whatsapp';
import {
  X,
  MessageSquare,
  Save,
  RotateCcw,
  CheckCircle2,
  Copy,
  Info,
} from 'lucide-react';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: WhatsAppTemplate[];
  onSaveTemplates: (templates: WhatsAppTemplate[]) => void;
}

export default function TemplatesModal({
  isOpen,
  onClose,
  templates,
  onSaveTemplates,
}: TemplatesModalProps) {
  const [editedTemplates, setEditedTemplates] = useState<WhatsAppTemplate[]>(templates);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setEditedTemplates(templates);
    }
  }, [isOpen, templates]);

  if (!isOpen) return null;

  const handleChange = (id: string, newText: string) => {
    setEditedTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, template: newText } : t))
    );
  };

  const handleReset = () => {
    if (confirm('Reset all WhatsApp templates to factory defaults?')) {
      setEditedTemplates(DEFAULT_WHATSAPP_TEMPLATES);
    }
  };

  const handleSave = () => {
    onSaveTemplates(editedTemplates);
    onClose();
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content templates-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="icon-badge">
              <MessageSquare size={18} />
            </div>
            <div>
              <h2 className="modal-title">WhatsApp Follow-Up Templates</h2>
              <p className="modal-sub">
                Editable 4-stage cadence triggered after &quot;Demo Sent&quot;
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon btn-secondary">
            <X size={16} />
          </button>
        </div>

        <div className="variables-hint card">
          <div className="hint-top">
            <Info size={14} className="info-icon" />
            <span className="hint-title">Available Personalization Tags:</span>
          </div>
          <div className="tags-row">
            <code>{'{{ownerName}}'}</code>
            <code>{'{{businessName}}'}</code>
            <code>{'{{city}}'}</code>
            <code>{'{{packageName}}'}</code>
            <code>{'{{repName}}'}</code>
          </div>
        </div>

        <div className="templates-list">
          {editedTemplates.map((item) => (
            <div key={item.id} className="template-item-card card">
              <div className="template-card-header">
                <div className="day-badge-group">
                  <span className="day-pill">Day {item.day}</span>
                  <span className="day-label">{item.label}</span>
                </div>
                <span className="day-purpose">{item.purpose}</span>
              </div>

              <textarea
                rows={3}
                value={item.template}
                onChange={(e) => handleChange(item.id, e.target.value)}
                className="form-textarea template-textarea"
              />

              <div className="template-card-footer">
                <button
                  type="button"
                  onClick={() => handleCopy(item.id, item.template)}
                  className="btn btn-secondary btn-sm"
                >
                  <Copy size={13} />{' '}
                  {copiedId === item.id ? 'Copied!' : 'Copy Template'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            onClick={handleReset}
            className="btn btn-secondary"
            title="Reset to initial templates"
          >
            <RotateCcw size={14} /> Reset Defaults
          </button>

          <div className="footer-right-buttons">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="button" onClick={handleSave} className="btn btn-primary">
              <Save size={14} /> Save Templates
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .templates-dialog {
          max-width: 720px;
          padding: 1.5rem;
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border);
          padding-bottom: 0.85rem;
          margin-bottom: 1rem;
        }
        .modal-header-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .icon-badge {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: #ecfdf5;
          color: #059669;
          border: 1px solid #a7f3d0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--brand-navy);
        }
        .modal-sub {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .variables-hint {
          background: #f8fafc;
          padding: 0.75rem 1rem;
          margin-bottom: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .hint-top {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .info-icon {
          color: var(--brand-blue);
        }
        .tags-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }
        .tags-row code {
          background: #ffffff;
          border: 1px solid var(--border);
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          font-size: 0.75rem;
          color: var(--brand-blue);
          font-family: var(--font-mono);
        }
        .templates-list {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          max-height: 52vh;
          overflow-y: auto;
          padding-right: 0.25rem;
        }
        .template-item-card {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }
        .template-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .day-badge-group {
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }
        .day-pill {
          font-size: 0.72rem;
          font-weight: 700;
          color: #047857;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
        }
        .day-label {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--brand-navy);
        }
        .day-purpose {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .template-textarea {
          font-size: 0.82rem;
          line-height: 1.45;
        }
        .template-card-footer {
          display: flex;
          justify-content: flex-end;
        }
        .modal-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid var(--border);
          padding-top: 1rem;
          margin-top: 1rem;
        }
        .footer-right-buttons {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
      `}</style>
    </div>
  );
}
