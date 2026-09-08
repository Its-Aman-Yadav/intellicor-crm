'use client';

import React from 'react';
import Image from 'next/image';
import {
  PhoneCall,
  Plus,
  Download,
  Upload,
  MessageSquare,
  BarChart3,
  Calendar,
  Users,
  RotateCcw,
  ClipboardPaste,
  Database,
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'dashboard' | 'pipeline' | 'analytics';
  setActiveTab: (tab: 'dashboard' | 'pipeline' | 'analytics') => void;
  activeRep: string;
  setActiveRep: (rep: string) => void;
  onOpenNewLead: () => void;
  onOpenBulkPaste: () => void;
  onOpenTemplates: () => void;
  onExportCSV: () => void;
  onResetData: () => void;
  totalLeadsCount: number;
  isFirestoreConnected: boolean;
  onOpenFirebaseSettings: () => void;
}

export const SALES_REPS = ['All Reps', 'Aman', 'Priya', 'Rahul', 'Arjun'];

export default function Header({
  activeTab,
  setActiveTab,
  activeRep,
  setActiveRep,
  onOpenNewLead,
  onOpenBulkPaste,
  onOpenTemplates,
  onExportCSV,
  onResetData,
  totalLeadsCount,
  isFirestoreConnected,
  onOpenFirebaseSettings,
}: HeaderProps) {
  const todayFormatted = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  return (
    <header className="header-root">
      <div className="header-container">
        {/* Left: Brand logo & Title */}
        <div className="brand-group">
          <div className="logo-wrapper">
            <Image
              src="/logo.png"
              alt="Intellicor Technologies Logo"
              width={42}
              height={42}
              priority
              className="brand-logo"
            />
          </div>
          <div>
            <div className="brand-title-row">
              <span className="brand-name">Intellicor Technologies</span>
              <span className="brand-tag">CRM</span>
            </div>
            <p className="brand-subtext">Local Business Sales Pipeline & Scoring</p>
          </div>
        </div>

        {/* Center: Navigation Tabs */}
        <nav className="header-nav">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`nav-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            <Calendar size={16} />
            <span>Today&apos;s Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`nav-tab-btn ${activeTab === 'pipeline' ? 'active' : ''}`}
          >
            <PhoneCall size={16} />
            <span>Leads & Pipeline ({totalLeadsCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`nav-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          >
            <BarChart3 size={16} />
            <span>7-Day Review</span>
          </button>
        </nav>

        {/* Right: Rep Switcher & Actions */}
        <div className="header-actions">
          {/* Rep filter */}
          <div className="rep-selector-wrapper">
            <Users size={14} className="rep-icon" />
            <select
              value={activeRep}
              onChange={(e) => setActiveRep(e.target.value)}
              className="rep-select"
              title="Filter by Sales Representative"
            >
              {SALES_REPS.map((rep) => (
                <option key={rep} value={rep}>
                  {rep}
                </option>
              ))}
            </select>
          </div>

          {/* Firestore Database status */}
          <button
            onClick={onOpenFirebaseSettings}
            className={`btn btn-sm ${
              isFirestoreConnected ? 'btn-firestore-connected' : 'btn-secondary'
            }`}
            title={
              isFirestoreConnected
                ? 'Cloud Firestore Connected'
                : 'Configure Cloud Firestore'
            }
          >
            <Database
              size={13}
              style={{ color: isFirestoreConnected ? '#059669' : '#d97706' }}
            />
            <span className="hide-mobile">
              {isFirestoreConnected ? 'Firestore' : 'Cloud Sync'}
            </span>
          </button>

          {/* Quick buttons */}
          <button
            onClick={onOpenTemplates}
            className="btn btn-secondary btn-sm"
            title="WhatsApp Message Templates"
          >
            <MessageSquare size={14} />
            <span className="hide-mobile">Templates</span>
          </button>

          <button
            onClick={onExportCSV}
            className="btn btn-secondary btn-sm"
            title="Export Leads to CSV"
          >
            <Download size={14} />
            <span className="hide-mobile">Export CSV</span>
          </button>

          <button
            onClick={onOpenBulkPaste}
            className="btn btn-secondary btn-sm"
            title="Bulk Import / Upload Leads"
            style={{ fontWeight: 600, color: 'var(--brand-navy)' }}
          >
            <ClipboardPaste size={14} style={{ color: 'var(--brand-blue)' }} />
            <span>⚡ Bulk Import</span>
          </button>

          <button
            onClick={onResetData}
            className="btn btn-secondary btn-sm"
            title="Reset sample leads to initial factory defaults"
          >
            <RotateCcw size={13} />
            <span className="hide-mobile">Reset</span>
          </button>

          <button
            onClick={onOpenNewLead}
            className="btn btn-primary btn-sm add-lead-btn"
          >
            <Plus size={15} />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Mobile Fixed Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`mobile-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
        >
          <Calendar size={18} />
          <span>Today</span>
        </button>
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`mobile-nav-item ${activeTab === 'pipeline' ? 'active' : ''}`}
        >
          <PhoneCall size={18} />
          <span>Leads</span>
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`mobile-nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
        >
          <BarChart3 size={18} />
          <span>Review</span>
        </button>
        <button onClick={onOpenBulkPaste} className="mobile-nav-item">
          <ClipboardPaste size={18} />
          <span>Paste</span>
        </button>
        <button onClick={onOpenNewLead} className="mobile-nav-item highlight-add">
          <Plus size={18} />
          <span>Add</span>
        </button>
      </nav>

      <style jsx>{`
        .header-root {
          background: #ffffff;
          border-bottom: 1px solid var(--border);
          position: sticky;
          top: 0;
          z-index: 50;
          box-shadow: 0 1px 3px rgba(11, 29, 51, 0.04);
        }
        .header-container {
          max-width: 1440px;
          margin: 0 auto;
          padding: 0.65rem 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }
        .brand-group {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .logo-wrapper {
          width: 42px;
          height: 42px;
          border-radius: 8px;
          overflow: hidden;
          background: #0b1d33;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(11, 29, 51, 0.15);
        }
        .brand-logo {
          object-fit: cover;
          width: 100%;
          height: 100%;
        }
        .brand-title-row {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .brand-name {
          font-weight: 700;
          font-size: 1.05rem;
          color: var(--brand-navy);
          letter-spacing: -0.01em;
        }
        .brand-tag {
          font-size: 0.65rem;
          font-weight: 700;
          background: var(--brand-light);
          color: var(--brand-blue);
          border: 1px solid var(--brand-border);
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
        }
        .brand-subtext {
          font-size: 0.73rem;
          color: var(--text-muted);
          font-weight: 400;
        }
        .header-nav {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          background: #f8fafc;
          padding: 0.25rem;
          border-radius: 8px;
          border: 1px solid var(--border);
        }
        .nav-tab-btn {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.4rem 0.85rem;
          font-size: 0.82rem;
          font-weight: 500;
          color: var(--text-secondary);
          background: transparent;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .nav-tab-btn:hover {
          color: var(--brand-blue);
          background: rgba(30, 80, 188, 0.05);
        }
        .nav-tab-btn.active {
          background: #ffffff;
          color: var(--brand-blue);
          font-weight: 600;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .rep-selector-wrapper {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          background: #f8fafc;
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 0.25rem 0.5rem;
        }
        .rep-icon {
          color: var(--text-muted);
        }
        .rep-select {
          background: transparent;
          border: none;
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--text-primary);
          outline: none;
          cursor: pointer;
        }
        .btn-firestore-connected {
          background: #ecfdf5;
          color: #059669;
          border-color: #a7f3d0;
          font-weight: 600;
        }
        .btn-firestore-connected:hover {
          background: #d1fae5;
        }
        .mobile-bottom-nav {
          display: none;
        }
        @media (max-width: 960px) {
          .hide-mobile {
            display: none;
          }
          .brand-subtext {
            display: none;
          }
        }
        @media (max-width: 768px) {
          .header-container {
            padding: 0.5rem 0.85rem;
          }
          .header-nav {
            display: none; /* Replaced by mobile bottom app bar */
          }
          .mobile-bottom-nav {
            display: flex;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: #ffffff;
            border-top: 1px solid var(--border);
            box-shadow: 0 -2px 10px rgba(11, 29, 51, 0.08);
            z-index: 999;
            justify-content: space-around;
            padding: 0.4rem 0.5rem calc(0.4rem + env(safe-area-inset-bottom));
          }
          .mobile-nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.15rem;
            background: none;
            border: none;
            color: var(--text-secondary);
            font-size: 0.68rem;
            font-weight: 500;
            cursor: pointer;
            padding: 0.3rem 0.6rem;
            border-radius: 8px;
            transition: all 0.15s ease;
          }
          .mobile-nav-item.active {
            color: var(--brand-blue);
            font-weight: 700;
            background: #eff6ff;
          }
          .mobile-nav-item.highlight-add {
            color: #ffffff;
            background: var(--brand-blue);
            border-radius: var(--radius-full);
            width: 44px;
            height: 44px;
            padding: 0;
            box-shadow: 0 2px 6px rgba(30, 80, 188, 0.35);
          }
          .mobile-nav-item.highlight-add span {
            display: none;
          }
        }
      `}</style>
    </header>
  );
}
