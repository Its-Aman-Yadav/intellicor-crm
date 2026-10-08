'use client';

import React, { useState } from 'react';
import { UserDailyTarget } from '@/types/crm';
import { Target, Clock, PhoneCall, X, Check, Sparkles } from 'lucide-react';

interface DailyTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTarget: UserDailyTarget;
  onSaveTarget: (newTarget: UserDailyTarget) => void;
}

export default function DailyTargetModal({
  isOpen,
  onClose,
  currentTarget,
  onSaveTarget,
}: DailyTargetModalProps) {
  const [contactsTarget, setContactsTarget] = useState<number>(
    currentTarget.contactsTarget || 50
  );
  const [durationMinutesTarget, setDurationMinutesTarget] = useState<number>(
    currentTarget.durationMinutesTarget || 120
  );
  const [mode, setMode] = useState<'contacts' | 'duration' | 'both'>(
    currentTarget.mode || 'both'
  );

  if (!isOpen) return null;

  const handleApplyPreset = (calls: number, mins: number) => {
    setContactsTarget(calls);
    setDurationMinutesTarget(mins);
  };

  const handleSave = () => {
    onSaveTarget({
      contactsTarget: Math.max(1, contactsTarget),
      durationMinutesTarget: Math.max(1, durationMinutesTarget),
      mode,
    });
    onClose();
  };

  return (
    <div className="target-modal-backdrop" onClick={onClose}>
      <div
        className="target-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="target-modal-header">
          <div className="header-left">
            <div className="header-icon-box">
              <Target size={22} className="text-blue" />
            </div>
            <div>
              <h2 className="modal-title">Set Daily Calling Targets</h2>
              <p className="modal-sub">
                Define your daily goal for contacts contacted or total calling duration
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-close-modal">
            <X size={18} />
          </button>
        </div>

        <div className="target-modal-body">
          {/* Quick Presets */}
          <div className="presets-section">
            <span className="section-label">Quick Goal Presets:</span>
            <div className="presets-grid">
              <button
                type="button"
                className={`preset-card ${
                  contactsTarget === 30 && durationMinutesTarget === 60 ? 'active' : ''
                }`}
                onClick={() => handleApplyPreset(30, 60)}
              >
                <span className="preset-name">Warm Up</span>
                <span className="preset-specs">30 calls • 1 Hour</span>
              </button>
              <button
                type="button"
                className={`preset-card ${
                  contactsTarget === 50 && durationMinutesTarget === 120 ? 'active' : ''
                }`}
                onClick={() => handleApplyPreset(50, 120)}
              >
                <span className="preset-name">Recommended (Standard)</span>
                <span className="preset-specs">50 calls • 2 Hours</span>
              </button>
              <button
                type="button"
                className={`preset-card ${
                  contactsTarget === 80 && durationMinutesTarget === 180 ? 'active' : ''
                }`}
                onClick={() => handleApplyPreset(80, 180)}
              >
                <span className="preset-name">Power Closer</span>
                <span className="preset-specs">80 calls • 3 Hours</span>
              </button>
            </div>
          </div>

          {/* Custom Contacts Target */}
          <div className="target-input-block">
            <div className="input-label-row">
              <div className="label-with-icon">
                <PhoneCall size={16} className="text-blue" />
                <label>Daily Contacts Target</label>
              </div>
              <span className="current-val-badge">
                <strong>{contactsTarget}</strong> contacts / day
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={150}
              step={5}
              value={contactsTarget}
              onChange={(e) => setContactsTarget(Number(e.target.value))}
              className="target-slider"
            />
            <div className="slider-ticks">
              <span>10 calls</span>
              <span>50 calls</span>
              <span>100 calls</span>
              <span>150 calls</span>
            </div>
          </div>

          {/* Custom Duration Target */}
          <div className="target-input-block">
            <div className="input-label-row">
              <div className="label-with-icon">
                <Clock size={16} className="text-emerald" />
                <label>Daily Calling Duration Target</label>
              </div>
              <span className="current-val-badge">
                <strong>{Math.floor(durationMinutesTarget / 60)}h {durationMinutesTarget % 60}m</strong> / day
              </span>
            </div>
            <input
              type="range"
              min={30}
              max={360}
              step={15}
              value={durationMinutesTarget}
              onChange={(e) => setDurationMinutesTarget(Number(e.target.value))}
              className="target-slider slider-emerald"
            />
            <div className="slider-ticks">
              <span>30m</span>
              <span>1h (60m)</span>
              <span>2h (120m)</span>
              <span>4h (240m)</span>
              <span>6h (360m)</span>
            </div>
          </div>
        </div>

        <div className="target-modal-footer">
          <button type="button" onClick={onClose} className="btn-cancel">
            Cancel
          </button>
          <button type="button" onClick={handleSave} className="btn-save-target">
            <Check size={16} />
            <span>Save &amp; Apply Target</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        .target-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          z-index: 9999;
        }
        .target-modal-card {
          background: #ffffff;
          border-radius: 18px;
          width: 100%;
          max-width: 520px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          overflow: hidden;
          animation: popIn 0.2s ease-out;
        }
        @keyframes popIn {
          from {
            transform: scale(0.96);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .target-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #e2e8f0;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }
        .header-icon-box {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .modal-title {
          font-size: 1.15rem;
          font-weight: 800;
          color: #0b1d33;
          margin: 0;
        }
        .modal-sub {
          font-size: 0.78rem;
          color: #64748b;
          margin: 0.15rem 0 0 0;
        }
        .btn-close-modal {
          border: none;
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
        }
        .btn-close-modal:hover {
          color: #0b1d33;
        }
        .target-modal-body {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.35rem;
        }
        .section-label {
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #64748b;
          margin-bottom: 0.45rem;
          display: block;
        }
        .presets-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.65rem;
        }
        .preset-card {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 0.75rem 0.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: center;
        }
        .preset-card:hover {
          background: #f1f5f9;
        }
        .preset-card.active {
          background: #eff6ff;
          border-color: #1e50bc;
        }
        .preset-name {
          font-size: 0.8rem;
          font-weight: 700;
          color: #0b1d33;
        }
        .preset-specs {
          font-size: 0.7rem;
          color: #64748b;
        }
        .target-input-block {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1rem 1.15rem;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }
        .input-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .label-with-icon {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.85rem;
          font-weight: 700;
          color: #0b1d33;
        }
        .current-val-badge {
          font-size: 0.82rem;
          color: #1e50bc;
          background: #eff6ff;
          padding: 0.15rem 0.55rem;
          border-radius: 6px;
        }
        .target-slider {
          width: 100%;
          cursor: pointer;
          accent-color: #1e50bc;
        }
        .slider-emerald {
          accent-color: #10b981;
        }
        .slider-ticks {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.7rem;
          color: #94a3b8;
        }
        .target-modal-footer {
          padding: 1rem 1.5rem;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.75rem;
        }
        .btn-cancel {
          padding: 0.55rem 1rem;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #ffffff;
          font-size: 0.85rem;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
        }
        .btn-save-target {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.55rem 1.25rem;
          border-radius: 8px;
          border: none;
          background: #1e50bc;
          color: #ffffff;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-save-target:hover {
          background: #18429c;
        }
      `}</style>
    </div>
  );
}
