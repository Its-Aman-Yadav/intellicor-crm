'use client';

import React, { useState } from 'react';
import { Lead } from '@/types/crm';
import { cleanPhoneNumber } from '@/lib/whatsapp';
import { QUICK_WA_TEMPLATES, QuickWATemplate } from '@/lib/whatsappTemplates';
import { getStoredBrochureConfig } from '@/lib/brochureSettings';
import {
  MessageCircle,
  X,
  ExternalLink,
  Copy,
  Check,
  Send,
  Sparkles,
  PhoneOff,
  FileText,
  Clock,
  Briefcase,
  Zap,
} from 'lucide-react';

interface QuickWhatsAppModalProps {
  lead: Lead;
  onClose: () => void;
  onSent?: () => void;
}

export default function QuickWhatsAppModal({
  lead,
  onClose,
  onSent,
}: QuickWhatsAppModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('missed_call');
  const [copied, setCopied] = useState<boolean>(false);
  const brochureConfig = getStoredBrochureConfig();

  const rawPhone = cleanPhoneNumber(lead.phone);
  const selectedTemplate =
    QUICK_WA_TEMPLATES.find((t) => t.id === selectedTemplateId) || QUICK_WA_TEMPLATES[0];

  const [customText, setCustomText] = useState<string>(() =>
    selectedTemplate.generateText(lead, brochureConfig.brochureUrl)
  );

  const handleSelectTemplate = (tpl: QuickWATemplate) => {
    setSelectedTemplateId(tpl.id);
    setCustomText(tpl.generateText(lead, brochureConfig.brochureUrl));
    setCopied(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(customText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    const waUrl = `https://wa.me/${rawPhone}?text=${encodeURIComponent(customText)}`;
    window.open(waUrl, '_blank');
    if (onSent) onSent();
    onClose();
  };

  const handleDirectChat = () => {
    const waUrl = `https://wa.me/${rawPhone}`;
    window.open(waUrl, '_blank');
    onClose();
  };

  const getTemplateIcon = (name: string) => {
    switch (name) {
      case 'missed':
        return <PhoneOff size={14} />;
      case 'brochure':
        return <FileText size={14} />;
      case 'reminder':
        return <Clock size={14} />;
      case 'proposal':
        return <Briefcase size={14} />;
      default:
        return <Zap size={14} />;
    }
  };

  return (
    <div className="wa-modal-backdrop" onClick={onClose}>
      <div className="wa-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="wa-modal-header">
          <div className="wa-header-title">
            <div className="wa-icon-box">
              <MessageCircle size={20} />
            </div>
            <div>
              <h3 className="wa-lead-name">
                WhatsApp: {lead.ownerName || lead.businessName}
              </h3>
              <span className="wa-lead-phone">+{rawPhone}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn-close-wa" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Template Selector Pills */}
        <div className="wa-modal-body">
          <label className="section-label">Select 1-Tap Quick Template:</label>
          <div className="template-pills-list">
            {QUICK_WA_TEMPLATES.map((tpl) => {
              const isActive = tpl.id === selectedTemplateId;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleSelectTemplate(tpl)}
                  className={`tpl-pill-btn ${isActive ? 'active' : ''}`}
                >
                  <span className="tpl-icon">{getTemplateIcon(tpl.iconName)}</span>
                  <span className="tpl-label">{tpl.title}</span>
                </button>
              );
            })}
          </div>

          {/* Editable Preview Box */}
          <div className="wa-preview-box">
            <div className="preview-top-bar">
              <span className="preview-heading">Message Preview (Editable):</span>
              <button
                type="button"
                onClick={handleCopy}
                className="btn-copy-preview"
                title="Copy text"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <textarea
              rows={4}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              className="wa-textarea-preview"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="wa-modal-footer">
          <button
            type="button"
            onClick={handleDirectChat}
            className="btn-wa-direct"
            title="Open WhatsApp chat without any prefilled text"
          >
            <span>Open Blank Chat</span>
          </button>
          <div className="footer-right-send">
            <button type="button" onClick={onClose} className="btn-wa-cancel">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              className="btn-wa-send"
              title="Open WhatsApp with this message"
            >
              <Send size={15} />
              <span>Send Message</span>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .wa-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(11, 29, 51, 0.6);
          backdrop-filter: blur(4px);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          animation: fadeIn 0.2s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .wa-modal-card {
          background: #ffffff;
          border-radius: 16px;
          width: 100%;
          max-width: 520px;
          box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.25);
          border: 1px solid #e2e8f0;
          overflow: hidden;
          animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .wa-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
        }
        .wa-header-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .wa-icon-box {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: #dcfce7;
          color: #15803d;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .wa-lead-name {
          font-size: 1rem;
          font-weight: 700;
          color: #0b1d33;
          margin: 0;
          line-height: 1.2;
        }
        .wa-lead-phone {
          font-size: 0.8rem;
          color: #64748b;
          font-family: var(--font-mono, monospace);
        }
        .btn-close-wa {
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
          width: 30px;
          height: 30px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .btn-close-wa:hover {
          background: #e2e8f0;
          color: #0b1d33;
        }
        .wa-modal-body {
          padding: 1.15rem 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .section-label {
          font-size: 0.76rem;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .template-pills-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }
        .tpl-pill-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.4rem 0.65rem;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #334155;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .tpl-pill-btn:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }
        .tpl-pill-btn.active {
          background: #16a34a;
          color: #ffffff;
          border-color: #16a34a;
        }
        .tpl-icon {
          display: flex;
          align-items: center;
        }
        .wa-preview-box {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 10px;
          padding: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .preview-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .preview-heading {
          font-size: 0.75rem;
          font-weight: 700;
          color: #166534;
        }
        .btn-copy-preview {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.72rem;
          font-weight: 600;
          background: #ffffff;
          border: 1px solid #86efac;
          color: #15803d;
          padding: 0.2rem 0.45rem;
          border-radius: 6px;
          cursor: pointer;
        }
        .btn-copy-preview:hover {
          background: #dcfce7;
        }
        .wa-textarea-preview {
          width: 100%;
          background: #ffffff;
          border: 1px solid #86efac;
          border-radius: 8px;
          padding: 0.55rem;
          font-size: 0.85rem;
          color: #0b1d33;
          font-family: inherit;
          line-height: 1.4;
          outline: none;
          resize: vertical;
        }
        .wa-textarea-preview:focus {
          box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.2);
        }
        .wa-modal-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.85rem 1.25rem;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
          gap: 0.5rem;
        }
        .footer-right-send {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .btn-wa-direct {
          background: transparent;
          border: 1px solid #cbd5e1;
          color: #475569;
          padding: 0.5rem 0.8rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-wa-direct:hover {
          background: #f1f5f9;
          color: #0b1d33;
        }
        .btn-wa-cancel {
          background: transparent;
          border: 1px solid transparent;
          color: #64748b;
          padding: 0.5rem 0.8rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-wa-cancel:hover {
          background: #e2e8f0;
          color: #0b1d33;
        }
        .btn-wa-send {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: #25d366;
          color: #ffffff;
          border: none;
          padding: 0.55rem 1.15rem;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s;
          box-shadow: 0 2px 4px rgba(37, 211, 102, 0.3);
        }
        .btn-wa-send:hover {
          background: #128c7e;
        }
        @media (max-width: 480px) {
          .wa-modal-footer {
            flex-direction: column;
            align-items: stretch;
          }
          .footer-right-send {
            width: 100%;
          }
          .btn-wa-direct,
          .btn-wa-send {
            flex: 1;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
