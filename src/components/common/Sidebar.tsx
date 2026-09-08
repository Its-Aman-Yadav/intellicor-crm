'use client';

import React from 'react';
import Image from 'next/image';
import {
  Calendar,
  PhoneCall,
  BarChart3,
  Database,
  MessageSquare,
  Download,
  ClipboardPaste,
  Plus,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const SALES_REPS = ['All Reps', 'Aman', 'Priya', 'Rahul', 'Arjun'];

interface SidebarProps {
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
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({
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
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  // Initials for avatar
  const getRepInitials = (rep: string) => {
    if (rep === 'All Reps' || rep === 'All') return 'ALL';
    if (rep === 'Aman') return 'AY';
    if (rep === 'Priya') return 'PS';
    if (rep === 'Rahul') return 'RM';
    if (rep === 'Arjun') return 'AK';
    return rep.slice(0, 2).toUpperCase();
  };

  return (
    <aside className={`sidebar-container ${isCollapsed ? 'is-collapsed' : ''}`}>
      <div className="sidebar-inner-content">
        {/* 1. BRAND HEADER */}
        <div className="sidebar-brand-header">
          <div className="brand-logo-badge" title="Intellicor Technologies">
            <Image
              src="/logo.png"
              alt="Intellicor CRM Logo"
              width={34}
              height={34}
              priority
              className="brand-logo-img"
            />
          </div>
          {!isCollapsed && (
            <div className="brand-info-block">
              <div className="brand-title-row">
                <span className="brand-name-text">Intellicor</span>
                <span className="brand-pill">CRM</span>
              </div>
              <span className="brand-subtitle">Sales &amp; Funnel Cadence</span>
            </div>
          )}
        </div>

        {/* 2. SALES REP SWITCHER */}
        <div className="sidebar-rep-section">
          <div
            className="rep-avatar-pill"
            title={`Active Rep: ${activeRep} (Click dropdown to switch)`}
          >
            <span className="rep-avatar-initials">{getRepInitials(activeRep)}</span>
          </div>
          {!isCollapsed && (
            <div className="rep-dropdown-container">
              <span className="rep-meta-title">Representative</span>
              <div className="rep-select-wrapper">
                <select
                  value={activeRep}
                  onChange={(e) => setActiveRep(e.target.value)}
                  className="rep-select-input"
                >
                  {SALES_REPS.map((rep) => (
                    <option key={rep} value={rep}>
                      {rep}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} className="rep-select-icon" />
              </div>
            </div>
          )}
        </div>

        {/* 3. PRIMARY ACTION: ADD NEW LEAD */}
        <div className="sidebar-action-wrap">
          <button
            onClick={onOpenNewLead}
            className={`btn btn-primary add-lead-btn ${isCollapsed ? 'collapsed-btn' : ''}`}
            title="Log New Business Lead"
          >
            <Plus size={17} />
            {!isCollapsed && <span>+ Add New Lead</span>}
          </button>
        </div>

        {/* 4. CORE NAVIGATION TABS */}
        <div className="sidebar-nav-block">
          {!isCollapsed && <div className="nav-group-caption">CORE PIPELINE</div>}

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`nav-tab-btn ${activeTab === 'dashboard' ? 'active-tab' : ''}`}
            title="Today's Dashboard & Calls"
          >
            <div className="nav-tab-icon">
              <Calendar size={18} />
            </div>
            {!isCollapsed && <span className="nav-tab-label">Today&apos;s Dashboard</span>}
          </button>

          <button
            onClick={() => setActiveTab('pipeline')}
            className={`nav-tab-btn ${activeTab === 'pipeline' ? 'active-tab' : ''}`}
            title="Leads & Pipeline"
          >
            <div className="nav-tab-icon">
              <PhoneCall size={18} />
            </div>
            {!isCollapsed && (
              <>
                <span className="nav-tab-label">Leads &amp; Pipeline</span>
                <span className="nav-tab-counter">{totalLeadsCount}</span>
              </>
            )}
            {isCollapsed && totalLeadsCount > 0 && (
              <span className="nav-tab-counter-mini">{totalLeadsCount}</span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`nav-tab-btn ${activeTab === 'analytics' ? 'active-tab' : ''}`}
            title="7-Day Performance & Analytics"
          >
            <div className="nav-tab-icon">
              <BarChart3 size={18} />
            </div>
            {!isCollapsed && <span className="nav-tab-label">7-Day Review</span>}
          </button>
        </div>

        {/* 5. WORKFLOW & INGESTION UTILITIES */}
        <div className="sidebar-nav-block">
          {!isCollapsed && <div className="nav-group-caption">WORKFLOW TOOLS</div>}

          <button
            onClick={onOpenBulkPaste}
            className="utility-item-btn"
            title="Smart Bulk Lead Importer (Auto-detects columns)"
          >
            <div className="util-icon-box util-bulk">
              <ClipboardPaste size={16} />
            </div>
            {!isCollapsed && (
              <div className="util-info-row">
                <span className="util-name">Bulk Lead Import</span>
                <span className="util-smart-chip">
                  <Sparkles size={9} /> Smart
                </span>
              </div>
            )}
          </button>

          <button
            onClick={onOpenTemplates}
            className="utility-item-btn"
            title="WhatsApp Cadence Follow-Up Copy"
          >
            <div className="util-icon-box util-whatsapp">
              <MessageSquare size={16} />
            </div>
            {!isCollapsed && <span className="util-name">WhatsApp Scripts</span>}
          </button>

          <button
            onClick={onExportCSV}
            className="utility-item-btn"
            title="Export Leads to CSV File"
          >
            <div className="util-icon-box util-export">
              <Download size={16} />
            </div>
            {!isCollapsed && <span className="util-name">Export Leads CSV</span>}
          </button>
        </div>

        {/* 6. CLOUD DATABASE & SYSTEM */}
        <div className="sidebar-nav-block">
          {!isCollapsed && <div className="nav-group-caption">DATABASE &amp; SYSTEM</div>}

          <button
            onClick={onOpenFirebaseSettings}
            className={`db-connection-card ${isFirestoreConnected ? 'is-connected' : 'is-offline'} ${
              isCollapsed ? 'is-collapsed-db' : ''
            }`}
            title={`Cloud Firestore: ${isFirestoreConnected ? 'Live & Connected' : 'Offline'}`}
          >
            <div className="db-card-head">
              <div className="db-label-group">
                <Database size={15} />
                {!isCollapsed && <span className="db-title-text">Cloud Firestore</span>}
              </div>
              <div className="db-pulse-dot-wrap">
                <span
                  className={`live-pulse-indicator ${
                    isFirestoreConnected ? 'dot-connected' : 'dot-offline'
                  }`}
                />
                {!isCollapsed && (
                  <span className="db-status-badge">
                    {isFirestoreConnected ? 'Live' : 'Offline'}
                  </span>
                )}
              </div>
            </div>
          </button>

          <button
            onClick={onResetData}
            className="sidebar-reset-action"
            title="Reset sample leads to original defaults"
          >
            <RotateCcw size={14} />
            {!isCollapsed && <span>Reset Demo Data</span>}
          </button>
        </div>

        {/* 7. FOOTER COLLAPSE TOGGLE & APP INFO */}
        <div className="sidebar-footer-section">
          <button
            onClick={onToggleCollapse}
            className="sidebar-collapse-toggle-btn"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {!isCollapsed && <span>Collapse Sidebar</span>}
          </button>

          {!isCollapsed && (
            <div className="sidebar-version-tag">
              <span>Intellicor CRM v1.1</span>
              <span className="sidebar-status-tag">• Active</span>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        /* ================= SIDEBAR CONTAINER ================= */
        .sidebar-container {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          height: 100vh;
          width: 260px;
          min-width: 260px;
          background: #ffffff;
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          z-index: 100;
          transition: width 0.22s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 2px 0 10px rgba(11, 29, 51, 0.03);
          user-select: none;
        }

        .sidebar-container.is-collapsed {
          width: 72px;
          min-width: 72px;
        }

        .sidebar-inner-content {
          height: 100%;
          overflow-y: auto;
          overflow-x: hidden;
          display: flex;
          flex-direction: column;
          padding: 1.15rem 0.85rem 1rem;
          gap: 1.15rem;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }

        .sidebar-inner-content::-webkit-scrollbar {
          width: 4px;
        }
        .sidebar-inner-content::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 4px;
        }

        /* ================= 1. BRAND HEADER ================= */
        .sidebar-brand-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.2rem 0.25rem 0.4rem;
        }
        .brand-logo-badge {
          width: 40px;
          height: 40px;
          border-radius: 9px;
          background: #eff6ff;
          border: 1px solid var(--brand-border);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .brand-logo-img {
          border-radius: 6px;
        }
        .brand-info-block {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .brand-title-row {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .brand-name-text {
          font-weight: 800;
          font-size: 1.08rem;
          color: var(--brand-navy);
          letter-spacing: -0.02em;
          line-height: 1.2;
        }
        .brand-pill {
          font-size: 0.65rem;
          font-weight: 700;
          color: #ffffff;
          background: var(--brand-blue);
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
        }
        .brand-subtitle {
          font-size: 0.7rem;
          color: var(--text-muted);
          margin-top: 0.1rem;
          white-space: nowrap;
        }

        /* ================= 2. SALES REP SWITCHER ================= */
        .sidebar-rep-section {
          background: #f8fafc;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 0.55rem 0.65rem;
          display: flex;
          align-items: center;
          gap: 0.6rem;
          transition: border-color 0.15s ease;
        }
        .sidebar-rep-section:hover {
          border-color: var(--brand-border);
          background: #f1f5f9;
        }
        .rep-avatar-pill {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          background: #1e3a8a;
          color: #ffffff;
          font-weight: 700;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .rep-dropdown-container {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
        }
        .rep-meta-title {
          font-size: 0.66rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .rep-select-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .rep-select-input {
          appearance: none;
          background: transparent;
          border: none;
          font-size: 0.84rem;
          font-weight: 700;
          color: var(--brand-navy);
          cursor: pointer;
          width: 100%;
          padding-right: 1.25rem;
          outline: none;
        }
        .rep-select-icon {
          position: absolute;
          right: 0;
          pointer-events: none;
          color: var(--text-muted);
        }

        /* ================= 3. PRIMARY ACTION BUTTON ================= */
        .sidebar-action-wrap {
          width: 100%;
        }
        .add-lead-btn {
          width: 100%;
          justify-content: center;
          padding: 0.65rem 0.75rem;
          font-weight: 700;
          font-size: 0.86rem;
          box-shadow: 0 2px 4px rgba(30, 80, 188, 0.2);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .add-lead-btn.collapsed-btn {
          padding: 0.65rem 0;
          width: 42px;
          height: 42px;
          margin: 0 auto;
          border-radius: 9px;
        }

        /* ================= 4. NAVIGATION SECTION ================= */
        .sidebar-nav-block {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .nav-group-caption {
          font-size: 0.66rem;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding-left: 0.45rem;
          margin-bottom: 0.2rem;
        }
        .nav-tab-btn {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          width: 100%;
          padding: 0.58rem 0.65rem;
          border-radius: var(--radius-sm);
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
          position: relative;
        }
        .nav-tab-btn:hover {
          background: #f1f5f9;
          color: var(--brand-navy);
        }
        .nav-tab-btn.active-tab {
          background: #eff6ff;
          color: var(--brand-blue);
          font-weight: 700;
          box-shadow: inset 3px 0 0 var(--brand-blue);
        }
        .nav-tab-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          color: inherit;
          flex-shrink: 0;
          width: 22px;
        }
        .nav-tab-label {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .nav-tab-counter {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.1rem 0.45rem;
          border-radius: var(--radius-full);
          background: #dbeafe;
          color: #1e40af;
        }
        .nav-tab-counter-mini {
          position: absolute;
          top: 4px;
          right: 4px;
          font-size: 0.6rem;
          font-weight: 700;
          background: var(--brand-blue);
          color: #ffffff;
          padding: 0.05rem 0.3rem;
          border-radius: 999px;
        }

        /* ================= 5. UTILITY TOOLS ================= */
        .utility-item-btn {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          width: 100%;
          padding: 0.48rem 0.55rem;
          border-radius: var(--radius-sm);
          border: 1px solid transparent;
          background: transparent;
          cursor: pointer;
          text-align: left;
          transition: all 0.15s ease;
        }
        .utility-item-btn:hover {
          background: #f8fafc;
          border-color: var(--border);
        }
        .util-icon-box {
          width: 30px;
          height: 30px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .util-bulk {
          background: #faf5ff;
          color: #9333ea;
          border: 1px solid #f3e8ff;
        }
        .util-whatsapp {
          background: #ecfdf5;
          color: #059669;
          border: 1px solid #d1fae5;
        }
        .util-export {
          background: #eff6ff;
          color: #2563eb;
          border: 1px solid #dbeafe;
        }
        .util-name {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
        }
        .util-info-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex: 1;
        }
        .util-smart-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.2rem;
          font-size: 0.62rem;
          font-weight: 700;
          color: #7e22ce;
          background: #faf5ff;
          border: 1px solid #e9d5ff;
          padding: 0.1rem 0.35rem;
          border-radius: var(--radius-full);
        }

        /* ================= 6. DATABASE STATUS ================= */
        .db-connection-card {
          background: #f8fafc;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 0.5rem 0.6rem;
          width: 100%;
          cursor: pointer;
          text-align: left;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          transition: all 0.15s ease;
        }
        .db-connection-card:hover {
          border-color: var(--brand-border);
          background: #f1f5f9;
        }
        .db-connection-card.is-connected {
          background: #f0fdf4;
          border-color: #bbf7d0;
        }
        .db-connection-card.is-collapsed-db {
          align-items: center;
          padding: 0.5rem 0;
        }
        .db-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }
        .db-label-group {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.76rem;
          font-weight: 700;
          color: var(--brand-navy);
        }
        .db-pulse-dot-wrap {
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }
        .live-pulse-indicator {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }
        .live-pulse-indicator.dot-connected {
          background: #10b981;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
        }
        .live-pulse-indicator.dot-offline {
          background: #f59e0b;
        }
        .db-status-badge {
          font-size: 0.66rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .sidebar-reset-action {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          width: 100%;
          padding: 0.4rem 0.55rem;
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 0.74rem;
          font-weight: 500;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.12s ease;
        }
        .sidebar-reset-action:hover {
          color: #dc2626;
          background: #fef2f2;
        }

        /* ================= 7. FOOTER TOGGLE ================= */
        .sidebar-footer-section {
          margin-top: auto;
          padding-top: 0.65rem;
          border-top: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }
        .sidebar-collapse-toggle-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.45rem 0.6rem;
          background: #f8fafc;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          font-size: 0.76rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          justify-content: center;
        }
        .sidebar-collapse-toggle-btn:hover {
          background: #eff6ff;
          color: var(--brand-blue);
          border-color: var(--brand-border);
        }
        .sidebar-version-tag {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 0.25rem;
          font-size: 0.68rem;
          color: var(--text-muted);
          font-weight: 500;
        }
        .sidebar-status-tag {
          color: #059669;
          font-weight: 600;
        }

        /* Collapsed specific alignment */
        .sidebar-container.is-collapsed .sidebar-brand-header,
        .sidebar-container.is-collapsed .sidebar-rep-section,
        .sidebar-container.is-collapsed .nav-tab-btn,
        .sidebar-container.is-collapsed .utility-item-btn,
        .sidebar-container.is-collapsed .sidebar-reset-action {
          justify-content: center;
          padding-left: 0;
          padding-right: 0;
        }

        @media (max-width: 640px) {
          .sidebar-container {
            width: 68px;
            min-width: 68px;
          }
          .sidebar-container .brand-info-block,
          .sidebar-container .rep-dropdown-container,
          .sidebar-container .nav-tab-label,
          .sidebar-container .nav-tab-counter,
          .sidebar-container .util-name,
          .sidebar-container .util-smart-chip,
          .sidebar-container .db-title-text,
          .sidebar-container .db-status-badge,
          .sidebar-container .sidebar-reset-action span,
          .sidebar-container .sidebar-collapse-toggle-btn span,
          .sidebar-container .sidebar-version-tag,
          .sidebar-container .nav-group-caption {
            display: none !important;
          }
          .sidebar-container .add-lead-btn {
            padding: 0.65rem 0;
            width: 40px;
            height: 40px;
            margin: 0 auto;
            border-radius: 8px;
          }
          .sidebar-container .add-lead-btn span {
            display: none !important;
          }
        }
      `}</style>
    </aside>
  );
}
