'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Calendar,
  PhoneCall,
  BarChart3,
  Users,
  Database,
  MessageSquare,
  Download,
  ClipboardPaste,
  Plus,
  RotateCcw,
  Menu,
  X,
  Sparkles,
  ChevronDown,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
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
}: SidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Initials for avatar
  const getRepInitials = (rep: string) => {
    if (rep === 'All Reps' || rep === 'All') return 'ALL';
    if (rep === 'Aman') return 'AY';
    if (rep === 'Priya') return 'PS';
    if (rep === 'Rahul') return 'RM';
    if (rep === 'Arjun') return 'AK';
    return rep.slice(0, 2).toUpperCase();
  };

  const handleTabClick = (tab: 'dashboard' | 'pipeline' | 'analytics') => {
    setActiveTab(tab);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* MOBILE TOP BAR (Visible only on screens < 1024px) */}
      <div className="mobile-top-bar">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="mobile-hamburger-btn"
          aria-label="Open Navigation Menu"
        >
          <Menu size={20} />
        </button>

        <div className="mobile-brand-group">
          <Image
            src="/logo.png"
            alt="Intellicor Technologies"
            width={28}
            height={28}
            priority
            className="mobile-brand-logo"
          />
          <div className="mobile-brand-text">
            <span className="mobile-brand-title">Intellicor</span>
            <span className="mobile-brand-badge">CRM</span>
          </div>
        </div>

        <button
          onClick={onOpenNewLead}
          className="mobile-quick-add-btn"
          title="Add New Lead"
        >
          <Plus size={16} />
          <span>Add</span>
        </button>
      </div>

      {/* BACKDROP OVERLAY FOR MOBILE DRAWER */}
      {isMobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* MAIN LEFT-HAND SIDEBAR */}
      <aside className={`sidebar-root ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-inner">
          {/* 1. BRAND HEADER */}
          <div className="sidebar-brand-section">
            <div className="sidebar-brand-left">
              <div className="logo-badge-container">
                <Image
                  src="/logo.png"
                  alt="Intellicor Technologies Logo"
                  width={38}
                  height={38}
                  priority
                  className="brand-logo-img"
                />
              </div>
              <div className="brand-text-container">
                <div className="brand-name-row">
                  <span className="brand-company-name">Intellicor</span>
                  <span className="brand-crm-pill">CRM</span>
                </div>
                <span className="brand-tagline">Sales &amp; Funnel Cadence</span>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="sidebar-close-btn"
              aria-label="Close Sidebar"
            >
              <X size={18} />
            </button>
          </div>

          {/* 2. SALES REP SELECTOR CARD */}
          <div className="rep-profile-card">
            <div className="rep-avatar-box">
              <span className="rep-avatar-text">{getRepInitials(activeRep)}</span>
            </div>
            <div className="rep-info-col">
              <span className="rep-role-caption">Active Representative</span>
              <div className="rep-dropdown-wrapper">
                <select
                  value={activeRep}
                  onChange={(e) => setActiveRep(e.target.value)}
                  className="rep-dropdown-select"
                >
                  {SALES_REPS.map((rep) => (
                    <option key={rep} value={rep}>
                      {rep}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} className="dropdown-arrow-icon" />
              </div>
            </div>
          </div>

          {/* 3. PRIMARY ACTION: ADD NEW LEAD */}
          <div className="sidebar-primary-action">
            <button
              onClick={() => {
                onOpenNewLead();
                setIsMobileOpen(false);
              }}
              className="btn btn-primary add-lead-sidebar-btn"
            >
              <Plus size={16} />
              <span>+ Add New Lead</span>
            </button>
          </div>

          {/* 4. NAVIGATION LINKS SECTION */}
          <div className="sidebar-nav-group">
            <div className="nav-section-title">CORE PIPELINE</div>

            <button
              onClick={() => handleTabClick('dashboard')}
              className={`sidebar-nav-item ${
                activeTab === 'dashboard' ? 'is-active' : ''
              }`}
            >
              <div className="nav-icon-wrapper">
                <Calendar size={18} />
              </div>
              <span className="nav-item-label">Today&apos;s Dashboard</span>
            </button>

            <button
              onClick={() => handleTabClick('pipeline')}
              className={`sidebar-nav-item ${
                activeTab === 'pipeline' ? 'is-active' : ''
              }`}
            >
              <div className="nav-icon-wrapper">
                <PhoneCall size={18} />
              </div>
              <span className="nav-item-label">Leads &amp; Pipeline</span>
              <span className="nav-badge-count">{totalLeadsCount}</span>
            </button>

            <button
              onClick={() => handleTabClick('analytics')}
              className={`sidebar-nav-item ${
                activeTab === 'analytics' ? 'is-active' : ''
              }`}
            >
              <div className="nav-icon-wrapper">
                <BarChart3 size={18} />
              </div>
              <span className="nav-item-label">7-Day Review</span>
            </button>
          </div>

          {/* 5. QUICK LEAD INGESTION & TOOLS */}
          <div className="sidebar-nav-group">
            <div className="nav-section-title">LEAD WORKFLOW</div>

            <button
              onClick={() => {
                onOpenBulkPaste();
                setIsMobileOpen(false);
              }}
              className="sidebar-tool-item"
              title="Smart Bulk Lead Importer (Auto-Detect)"
            >
              <div className="tool-icon-wrapper tool-bulk">
                <ClipboardPaste size={16} />
              </div>
              <div className="tool-text-col">
                <span className="tool-label">Bulk Lead Import</span>
                <span className="tool-sub">Auto-detect columns</span>
              </div>
              <span className="tool-smart-chip">
                <Sparkles size={10} /> Smart
              </span>
            </button>

            <button
              onClick={() => {
                onOpenTemplates();
                setIsMobileOpen(false);
              }}
              className="sidebar-tool-item"
              title="WhatsApp Cadence Message Templates"
            >
              <div className="tool-icon-wrapper tool-wa">
                <MessageSquare size={16} />
              </div>
              <div className="tool-text-col">
                <span className="tool-label">WhatsApp Templates</span>
                <span className="tool-sub">4-stage cadence copy</span>
              </div>
            </button>

            <button
              onClick={onExportCSV}
              className="sidebar-tool-item"
              title="Download Leads as CSV"
            >
              <div className="tool-icon-wrapper tool-export">
                <Download size={16} />
              </div>
              <div className="tool-text-col">
                <span className="tool-label">Export Leads CSV</span>
                <span className="tool-sub">Instant backup download</span>
              </div>
            </button>
          </div>

          {/* 6. DATABASE & SYSTEM SETTINGS */}
          <div className="sidebar-nav-group">
            <div className="nav-section-title">DATABASE &amp; SYSTEM</div>

            <button
              onClick={() => {
                onOpenFirebaseSettings();
                setIsMobileOpen(false);
              }}
              className={`sidebar-db-status-card ${
                isFirestoreConnected ? 'connected' : 'disconnected'
              }`}
            >
              <div className="db-status-top">
                <div className="db-status-left">
                  <Database size={15} />
                  <span className="db-title">Cloud Firestore</span>
                </div>
                <div className="status-indicator-dot">
                  <span
                    className={`live-pulse-dot ${
                      isFirestoreConnected ? 'is-green' : 'is-orange'
                    }`}
                  />
                  <span className="status-label-text">
                    {isFirestoreConnected ? 'Connected' : 'Offline'}
                  </span>
                </div>
              </div>
              <span className="db-project-subtext">Project: intellicor-crm</span>
            </button>

            <button
              onClick={onResetData}
              className="sidebar-reset-btn"
              title="Reset sample leads to initial factory defaults"
            >
              <RotateCcw size={13} />
              <span>Reset Demo Data</span>
            </button>
          </div>

          {/* 7. FOOTER BRAND SIGNATURE */}
          <div className="sidebar-footer">
            <div className="footer-signature">
              <span className="footer-version">Intellicor CRM • v1.1</span>
              <span className="footer-copyright">© 2026 Intellicor Technologies</span>
            </div>
          </div>
        </div>
      </aside>

      <style jsx>{`
        /* ================= MOBILE TOP BAR ================= */
        .mobile-top-bar {
          display: none;
          position: sticky;
          top: 0;
          z-index: 40;
          background: #ffffff;
          border-bottom: 1px solid var(--border);
          padding: 0.65rem 1rem;
          align-items: center;
          justify-content: space-between;
        }
        .mobile-hamburger-btn {
          background: none;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--brand-navy);
          cursor: pointer;
        }
        .mobile-brand-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .mobile-brand-logo {
          border-radius: 6px;
        }
        .mobile-brand-text {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .mobile-brand-title {
          font-weight: 800;
          font-size: 1rem;
          color: var(--brand-navy);
          letter-spacing: -0.02em;
        }
        .mobile-brand-badge {
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--brand-blue);
          background: #eff6ff;
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
        }
        .mobile-quick-add-btn {
          background: var(--brand-blue);
          color: #ffffff;
          border: none;
          border-radius: var(--radius-sm);
          padding: 0.45rem 0.75rem;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
        }

        /* ================= SIDEBAR BACKDROP ================= */
        .sidebar-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(11, 29, 51, 0.45);
          backdrop-filter: blur(2px);
          z-index: 998;
        }

        /* ================= SIDEBAR CONTAINER ================= */
        .sidebar-root {
          width: 270px;
          min-width: 270px;
          max-width: 270px;
          height: 100vh;
          position: sticky;
          top: 0;
          background: #ffffff;
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          z-index: 50;
          box-shadow: 2px 0 8px rgba(11, 29, 51, 0.02);
        }

        .sidebar-inner {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 1.25rem 1rem 1rem;
          gap: 1.25rem;
        }

        /* ================= 1. BRAND SECTION ================= */
        .sidebar-brand-section {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 0.25rem;
        }
        .sidebar-brand-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .logo-badge-container {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          background: #eff6ff;
          border: 1px solid var(--brand-border);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-xs);
        }
        .brand-logo-img {
          border-radius: 8px;
        }
        .brand-text-container {
          display: flex;
          flex-direction: column;
        }
        .brand-name-row {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .brand-company-name {
          font-weight: 800;
          font-size: 1.12rem;
          color: var(--brand-navy);
          letter-spacing: -0.02em;
          line-height: 1.2;
        }
        .brand-crm-pill {
          font-size: 0.65rem;
          font-weight: 700;
          color: #ffffff;
          background: var(--brand-blue);
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
        }
        .brand-tagline {
          font-size: 0.72rem;
          color: var(--text-muted);
          margin-top: 0.1rem;
        }
        .sidebar-close-btn {
          display: none;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0.3rem;
          border-radius: 4px;
        }

        /* ================= 2. SALES REP CARD ================= */
        .rep-profile-card {
          background: #f8fafc;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 0.65rem 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.65rem;
          transition: all 0.15s ease;
        }
        .rep-profile-card:hover {
          border-color: var(--brand-border);
          background: #f1f5f9;
        }
        .rep-avatar-box {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: #1e3a8a;
          color: #ffffff;
          font-weight: 700;
          font-size: 0.78rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .rep-info-col {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
        }
        .rep-role-caption {
          font-size: 0.68rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-weight: 600;
        }
        .rep-dropdown-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .rep-dropdown-select {
          appearance: none;
          background: transparent;
          border: none;
          font-size: 0.86rem;
          font-weight: 700;
          color: var(--brand-navy);
          cursor: pointer;
          width: 100%;
          padding-right: 1.25rem;
          outline: none;
        }
        .dropdown-arrow-icon {
          position: absolute;
          right: 0;
          pointer-events: none;
          color: var(--text-muted);
        }

        /* ================= 3. PRIMARY ACTION ================= */
        .sidebar-primary-action {
          width: 100%;
        }
        .add-lead-sidebar-btn {
          width: 100%;
          justify-content: center;
          padding: 0.65rem 1rem;
          font-weight: 700;
          font-size: 0.88rem;
          box-shadow: 0 2px 4px rgba(30, 80, 188, 0.2);
          border-radius: var(--radius-md);
        }

        /* ================= 4. NAVIGATION SECTION ================= */
        .sidebar-nav-group {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }
        .nav-section-title {
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding-left: 0.5rem;
          margin-bottom: 0.2rem;
        }
        .sidebar-nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.6rem 0.75rem;
          border-radius: var(--radius-sm);
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-size: 0.86rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
        }
        .sidebar-nav-item:hover {
          background: #f1f5f9;
          color: var(--brand-navy);
        }
        .sidebar-nav-item.is-active {
          background: #eff6ff;
          color: var(--brand-blue);
          font-weight: 700;
          box-shadow: inset 3px 0 0 var(--brand-blue);
        }
        .sidebar-nav-item.is-active .nav-icon-wrapper {
          color: var(--brand-blue);
        }
        .nav-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          transition: color 0.15s ease;
        }
        .nav-item-label {
          flex: 1;
        }
        .nav-badge-count {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 0.1rem 0.45rem;
          border-radius: var(--radius-full);
          background: #dbeafe;
          color: #1e40af;
        }

        /* ================= 5. TOOLS & WORKFLOW ================= */
        .sidebar-tool-item {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          width: 100%;
          padding: 0.5rem 0.65rem;
          border-radius: var(--radius-sm);
          border: 1px solid transparent;
          background: transparent;
          cursor: pointer;
          text-align: left;
          transition: all 0.15s ease;
        }
        .sidebar-tool-item:hover {
          background: #f8fafc;
          border-color: var(--border);
        }
        .tool-icon-wrapper {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .tool-bulk {
          background: #faf5ff;
          color: #9333ea;
          border: 1px solid #f3e8ff;
        }
        .tool-wa {
          background: #ecfdf5;
          color: #059669;
          border: 1px solid #d1fae5;
        }
        .tool-export {
          background: #eff6ff;
          color: #2563eb;
          border: 1px solid #dbeafe;
        }
        .tool-text-col {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
        }
        .tool-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .tool-sub {
          font-size: 0.68rem;
          color: var(--text-muted);
        }
        .tool-smart-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.2rem;
          font-size: 0.64rem;
          font-weight: 700;
          color: #7e22ce;
          background: #faf5ff;
          border: 1px solid #e9d5ff;
          padding: 0.1rem 0.35rem;
          border-radius: var(--radius-full);
        }

        /* ================= 6. DATABASE & SYSTEM ================= */
        .sidebar-db-status-card {
          background: #f8fafc;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 0.55rem 0.65rem;
          width: 100%;
          cursor: pointer;
          text-align: left;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          transition: all 0.15s ease;
        }
        .sidebar-db-status-card:hover {
          border-color: var(--brand-border);
          background: #f1f5f9;
        }
        .sidebar-db-status-card.connected {
          background: #f0fdf4;
          border-color: #bbf7d0;
        }
        .db-status-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .db-status-left {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--brand-navy);
        }
        .status-indicator-dot {
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }
        .live-pulse-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }
        .live-pulse-dot.is-green {
          background: #10b981;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
        }
        .live-pulse-dot.is-orange {
          background: #f59e0b;
        }
        .status-label-text {
          font-size: 0.66rem;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .db-project-subtext {
          font-size: 0.68rem;
          color: var(--text-muted);
        }

        .sidebar-reset-btn {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          width: 100%;
          padding: 0.45rem 0.65rem;
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 0.76rem;
          font-weight: 500;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.12s ease;
        }
        .sidebar-reset-btn:hover {
          color: #dc2626;
          background: #fef2f2;
        }

        /* ================= 7. FOOTER ================= */
        .sidebar-footer {
          margin-top: auto;
          padding-top: 0.75rem;
          border-top: 1px solid var(--border-subtle);
        }
        .footer-signature {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }
        .footer-version {
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .footer-copyright {
          font-size: 0.65rem;
          color: var(--text-muted);
        }

        /* ================= RESPONSIVE RULES ================= */
        @media (max-width: 1024px) {
          .mobile-top-bar {
            display: flex;
          }
          .sidebar-root {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            height: 100vh;
            transform: translateX(-100%);
            transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 999;
            box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
          }
          .sidebar-root.mobile-open {
            transform: translateX(0);
          }
          .sidebar-close-btn {
            display: flex;
          }
        }
      `}</style>
    </>
  );
}
