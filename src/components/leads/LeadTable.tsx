'use client';

import React, { useState, useMemo } from 'react';
import {
  Lead,
  LeadPriority,
  PipelineStage,
  PIPELINE_STAGES,
  INDUSTRIES,
} from '@/types/crm';
import { cleanPhoneNumber } from '@/lib/whatsapp';
import {
  Search,
  Filter,
  Phone,
  PhoneCall,
  MessageCircle,
  ExternalLink,
  Globe,
  MapPin,
  Flame,
  Clock,
  ArrowUpDown,
  Trash2,
  Edit3,
  Calendar,
  Sparkles,
} from 'lucide-react';
import InstagramIcon from '@/components/common/InstagramIcon';

interface LeadTableProps {
  leads: Lead[];
  onOpenLead: (lead: Lead) => void;
  onQuickCall: (lead: Lead) => void;
  onDeleteLead: (leadId: string) => void;
  onUpdateStatus: (leadId: string, newStatus: PipelineStage) => void;
  activeRep: string;
}

export default function LeadTable({
  leads,
  onOpenLead,
  onQuickCall,
  onDeleteLead,
  onUpdateStatus,
  activeRep,
}: LeadTableProps) {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedPriority, setSelectedPriority] = useState<string>('All');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('All');
  const [dueTodayOnly, setDueTodayOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'score' | 'date' | 'name'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const todayStr = new Date().toISOString().slice(0, 10);

  // Filtered and Sorted Leads
  const filteredLeads = useMemo(() => {
    let result = [...leads];

    // Filter by Rep
    if (activeRep !== 'All' && activeRep !== 'All Reps') {
      result = result.filter((l) => l.assignedRep === activeRep);
    }

    // Filter by Search (Name, Owner, Phone, City)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (l) =>
          l.businessName.toLowerCase().includes(q) ||
          (l.ownerName && l.ownerName.toLowerCase().includes(q)) ||
          l.phone.replace(/\s+/g, '').includes(q.replace(/\s+/g, '')) ||
          (l.city && l.city.toLowerCase().includes(q))
      );
    }

    // Filter by Status
    if (selectedStatus !== 'All') {
      result = result.filter((l) => l.status === selectedStatus);
    }

    // Filter by Priority
    if (selectedPriority !== 'All') {
      result = result.filter((l) => l.priority === selectedPriority);
    }

    // Filter by Industry
    if (selectedIndustry !== 'All') {
      result = result.filter((l) => l.industry === selectedIndustry);
    }

    // Filter by Due Today
    if (dueTodayOnly) {
      result = result.filter(
        (l) =>
          l.followUpDate === todayStr ||
          (l.discoveryCallDate && l.discoveryCallDate.slice(0, 10) === todayStr)
      );
    }

    // Default Sorting by Lead Score (descending) as specified in requirements
    result.sort((a, b) => {
      if (sortBy === 'score') {
        return sortOrder === 'desc' ? b.score - a.score : a.score - b.score;
      }
      if (sortBy === 'name') {
        return sortOrder === 'desc'
          ? b.businessName.localeCompare(a.businessName)
          : a.businessName.localeCompare(b.businessName);
      }
      if (sortBy === 'date') {
        const dateA = new Date(a.updatedAt || a.createdAt).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      }
      return 0;
    });

    return result;
  }, [
    leads,
    activeRep,
    searchQuery,
    selectedStatus,
    selectedPriority,
    selectedIndustry,
    dueTodayOnly,
    sortBy,
    sortOrder,
    todayStr,
  ]);

  const toggleSort = (field: 'score' | 'date' | 'name') => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="lead-table-root">
      {/* Controls Bar */}
      <div className="table-controls card">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search business name, owner, phone, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="clear-search-btn"
            >
              ×
            </button>
          )}
        </div>

        <div className="filter-group">
          {/* Priority filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="filter-select"
          >
            <option value="All">All Priorities</option>
            <option value="HOT">🔥 HOT (8+ pts)</option>
            <option value="WARM">⚡ WARM (5-7 pts)</option>
            <option value="COLD">❄️ COLD (0-4 pts)</option>
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="filter-select"
          >
            <option value="All">All Stages</option>
            {PIPELINE_STAGES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          {/* Industry filter */}
          <select
            value={selectedIndustry}
            onChange={(e) => setSelectedIndustry(e.target.value)}
            className="filter-select hide-small"
          >
            <option value="All">All Industries</option>
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>

          {/* Due Today toggle */}
          <button
            onClick={() => setDueTodayOnly((prev) => !prev)}
            className={`btn btn-sm ${
              dueTodayOnly ? 'btn-primary' : 'btn-secondary'
            }`}
          >
            <Calendar size={13} />
            <span>Due Today</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="card table-container">
        <div className="table-meta-bar">
          <span className="results-count">
            Showing <strong>{filteredLeads.length}</strong> of {leads.length} leads
          </span>
          <div className="sort-hint">
            <span>Sorted by: <strong>{sortBy.toUpperCase()} ({sortOrder})</strong></span>
          </div>
        </div>

        <div className="table-scroll-wrapper">
          <table className="crm-table">
            <thead>
              <tr>
                <th onClick={() => toggleSort('name')} className="cursor-sort">
                  <div className="th-content">
                    <span>Business / Lead</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th onClick={() => toggleSort('score')} className="cursor-sort">
                  <div className="th-content">
                    <span>Score &amp; Priority</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th>Contact &amp; Phone</th>
                <th>Stage &amp; Funnel</th>
                <th>Follow-up Due</th>
                <th>Package &amp; Value</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="no-data-cell">
                    <p className="no-data-title">No leads matching your filters</p>
                    <p className="no-data-sub">
                      Try clearing search queries or filter dropdowns.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const cleanedPhone = cleanPhoneNumber(lead.phone);
                  const isDueToday = lead.followUpDate === todayStr;

                  return (
                    <tr key={lead.id} className="lead-row">
                      {/* Business & City */}
                      <td className="business-cell">
                        <div className="business-title-row">
                          <span
                            onClick={() => onOpenLead(lead)}
                            className="business-name-link"
                          >
                            {lead.businessName}
                          </span>
                        </div>
                        <div className="business-sub-meta">
                          <span className="industry-label">{lead.industry}</span>
                          {lead.city && (
                            <span className="city-label">
                              <MapPin size={11} /> {lead.city}
                            </span>
                          )}
                        </div>

                        {/* Social / Web links */}
                        <div className="web-links-row">
                          {lead.website ? (
                            <a
                              href={
                                lead.website.startsWith('http')
                                  ? lead.website
                                  : `https://${lead.website}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="link-icon web"
                              title={lead.website}
                            >
                              <Globe size={12} />
                            </a>
                          ) : (
                            <span className="link-icon disabled" title="No Website">
                              <Globe size={12} />
                            </span>
                          )}

                          {lead.googleProfile ? (
                            <a
                              href={lead.googleProfile}
                              target="_blank"
                              rel="noreferrer"
                              className="link-icon gbp"
                              title="Google Business Profile"
                            >
                              <MapPin size={12} />
                            </a>
                          ) : null}

                          {lead.instagram ? (
                            <a
                              href={lead.instagram}
                              target="_blank"
                              rel="noreferrer"
                              className="link-icon ig"
                              title="Instagram"
                            >
                              <InstagramIcon size={12} />
                            </a>
                          ) : null}
                        </div>
                      </td>

                      {/* Score & Priority */}
                      <td>
                        <div className="score-priority-box">
                          <span
                            className={`badge ${
                              lead.priority === 'HOT'
                                ? 'badge-hot'
                                : lead.priority === 'WARM'
                                ? 'badge-warm'
                                : 'badge-cold'
                            }`}
                          >
                            {lead.priority === 'HOT' && <Flame size={11} />}
                            {lead.priority} ({lead.score} pts)
                          </span>

                          <span className="signals-summary">
                            {lead.signals.noWebsite && 'No Site • '}
                            {lead.signals.badWebsite && 'Bad Site • '}
                            {lead.signals.poorGoogleProfile && 'Poor GBP • '}
                            {lead.signals.multipleBranches && 'Multi-branch'}
                          </span>
                        </div>
                      </td>

                      {/* Contact & Phone */}
                      <td>
                        <div className="contact-cell">
                          <span className="owner-name">
                            {lead.ownerName || 'Owner'}
                          </span>
                          <div className="phone-actions-row">
                            <a
                              href={`tel:${cleanedPhone}`}
                              className="phone-link"
                              title="Click to Call"
                            >
                              <Phone size={12} /> {lead.phone}
                            </a>
                            <a
                              href={`https://wa.me/${cleanedPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="wa-quick-btn"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle size={13} />
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* Stage & Funnel */}
                      <td>
                        <select
                          value={lead.status}
                          onChange={(e) =>
                            onUpdateStatus(lead.id, e.target.value as PipelineStage)
                          }
                          className={`stage-select ${lead.status.replace(
                            /\s+/g,
                            ''
                          )}`}
                        >
                          {PIPELINE_STAGES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Follow-up Due */}
                      <td>
                        {lead.followUpDate ? (
                          <div className="due-date-cell">
                            <div className="due-date-row">
                              <Calendar size={12} />
                              <span className="due-date-text">
                                {lead.followUpDate}
                              </span>
                            </div>
                            {isDueToday && (
                              <span className="due-today-tag">DUE TODAY</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-dash">—</span>
                        )}
                      </td>

                      {/* Package & Value */}
                      <td>
                        <div className="package-cell">
                          <span className="pkg-tag">
                            {lead.packageRecommended || 'Growth'}
                          </span>
                          <span className="expected-value">
                            ₹{(lead.expectedValue || 15000).toLocaleString('en-IN')}
                          </span>
                          <span className="quotation-status">
                            Quote: {lead.quotationStatus}
                          </span>
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td style={{ textAlign: 'right' }}>
                        <div className="action-buttons-group">
                          <button
                            onClick={() => onQuickCall(lead)}
                            className="btn btn-primary btn-sm btn-icon"
                            title="Log Call"
                          >
                            <PhoneCall size={14} />
                          </button>
                          <button
                            onClick={() => onOpenLead(lead)}
                            className="btn btn-secondary btn-sm btn-icon"
                            title="View / Edit Lead"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  `Are you sure you want to delete ${lead.businessName}?`
                                )
                              ) {
                                onDeleteLead(lead.id);
                              }
                            }}
                            className="btn btn-secondary btn-sm btn-icon delete-btn"
                            title="Delete Lead"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Touch Cards View (visible <= 768px) */}
        <div className="mobile-leads-list">
          {filteredLeads.length === 0 ? (
            <div className="no-data-cell" style={{ padding: '2rem 1rem' }}>
              <p className="no-data-title">No leads matching your filters</p>
            </div>
          ) : (
            filteredLeads.map((lead) => {
              const cleanedPhone = cleanPhoneNumber(lead.phone);
              const isDueToday = lead.followUpDate === todayStr;

              return (
                <div key={lead.id} className="mobile-lead-card card">
                  <div className="mobile-lead-top">
                    <div className="mobile-lead-title-box">
                      <h4
                        onClick={() => onOpenLead(lead)}
                        className="mobile-business-name"
                      >
                        {lead.businessName}
                      </h4>
                      <span className="mobile-lead-meta">
                        {lead.industry} {lead.city && `• ${lead.city}`}
                      </span>
                    </div>
                    <span
                      className={`badge ${
                        lead.priority === 'HOT'
                          ? 'badge-hot'
                          : lead.priority === 'WARM'
                          ? 'badge-warm'
                          : 'badge-cold'
                      }`}
                    >
                      {lead.priority} ({lead.score})
                    </span>
                  </div>

                  <div className="mobile-contact-bar">
                    <span className="mobile-owner-name">
                      {lead.ownerName || 'Contact'}
                    </span>
                    <span className="mobile-phone-text">{lead.phone}</span>
                  </div>

                  <div className="mobile-stage-row">
                    <select
                      value={lead.status}
                      onChange={(e) =>
                        onUpdateStatus(lead.id, e.target.value as PipelineStage)
                      }
                      className={`stage-select ${lead.status.replace(/\s+/g, '')}`}
                    >
                      {PIPELINE_STAGES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>

                    {lead.followUpDate && (
                      <span
                        className={`mobile-due-pill ${
                          isDueToday ? 'due-today' : ''
                        }`}
                      >
                        <Calendar size={11} />{' '}
                        {isDueToday ? 'DUE TODAY' : lead.followUpDate}
                      </span>
                    )}
                  </div>

                  {/* Finger-Friendly Tap Targets */}
                  <div className="mobile-action-buttons">
                    <a
                      href={`tel:${cleanedPhone}`}
                      className="btn btn-primary btn-sm mobile-action-btn"
                      title="Direct Dial"
                    >
                      <Phone size={13} /> Call
                    </a>
                    <a
                      href={`https://wa.me/${cleanedPhone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary btn-sm mobile-action-btn wa-btn"
                      title="WhatsApp"
                    >
                      <MessageCircle size={13} /> WhatsApp
                    </a>
                    <button
                      onClick={() => onQuickCall(lead)}
                      className="btn btn-secondary btn-sm mobile-action-btn"
                    >
                      <PhoneCall size={13} /> Log
                    </button>
                    <button
                      onClick={() => onOpenLead(lead)}
                      className="btn btn-secondary btn-sm mobile-action-btn"
                    >
                      <Edit3 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <style jsx>{`
        .lead-table-root {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .table-controls {
          padding: 0.85rem 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.85rem;
        }
        .search-box {
          position: relative;
          display: flex;
          align-items: center;
          flex: 1;
          min-width: 260px;
          background: #f8fafc;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 0 0.65rem;
        }
        .search-icon {
          color: var(--text-muted);
        }
        .search-input {
          width: 100%;
          border: none;
          background: transparent;
          padding: 0.5rem 0.5rem;
          font-size: 0.85rem;
          color: var(--text-primary);
          outline: none;
        }
        .clear-search-btn {
          background: none;
          border: none;
          font-size: 1.1rem;
          color: var(--text-muted);
          cursor: pointer;
        }
        .filter-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .filter-select {
          padding: 0.45rem 0.65rem;
          font-size: 0.82rem;
          background: #ffffff;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--text-primary);
          outline: none;
          cursor: pointer;
        }
        .table-container {
          overflow: hidden;
        }
        .table-meta-bar {
          padding: 0.65rem 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border-subtle);
          font-size: 0.78rem;
          color: var(--text-secondary);
          background: #fafbfc;
        }
        .table-scroll-wrapper {
          overflow-x: auto;
        }
        .crm-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .crm-table th {
          padding: 0.75rem 1.25rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
          background: #f8fafc;
          border-bottom: 1px solid var(--border);
          white-space: nowrap;
        }
        .cursor-sort {
          cursor: pointer;
          user-select: none;
        }
        .th-content {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .crm-table td {
          padding: 0.85rem 1.25rem;
          font-size: 0.83rem;
          border-bottom: 1px solid var(--border-subtle);
          vertical-align: middle;
        }
        .lead-row {
          transition: background 0.12s ease;
        }
        .lead-row:hover {
          background: #f8fafc;
        }
        .business-title-row {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .business-name-link {
          font-weight: 700;
          color: var(--brand-navy);
          cursor: pointer;
          transition: color 0.15s ease;
        }
        .business-name-link:hover {
          color: var(--brand-blue);
          text-decoration: underline;
        }
        .business-sub-meta {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.73rem;
          color: var(--text-muted);
          margin-top: 0.15rem;
        }
        .city-label {
          display: inline-flex;
          align-items: center;
          gap: 0.2rem;
        }
        .web-links-row {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          margin-top: 0.35rem;
        }
        .link-icon {
          width: 22px;
          height: 22px;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border);
          background: #ffffff;
          color: var(--text-secondary);
          transition: all 0.15s ease;
        }
        .link-icon.web:hover { color: #2563eb; border-color: #93c5fd; }
        .link-icon.gbp:hover { color: #ea4335; border-color: #fca5a5; }
        .link-icon.ig:hover { color: #d946ef; border-color: #f0abfc; }
        .link-icon.disabled {
          opacity: 0.4;
          cursor: not-allowed;
          background: #f1f5f9;
        }
        .score-priority-box {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .signals-summary {
          font-size: 0.7rem;
          color: var(--text-muted);
        }
        .contact-cell {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }
        .owner-name {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 0.82rem;
        }
        .phone-actions-row {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .phone-link {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.76rem;
          color: var(--brand-blue);
          font-family: var(--font-mono);
        }
        .phone-link:hover {
          text-decoration: underline;
        }
        .wa-quick-btn {
          width: 20px;
          height: 20px;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #ecfdf5;
          color: #059669;
          border: 1px solid #a7f3d0;
          transition: all 0.15s ease;
        }
        .wa-quick-btn:hover {
          background: #10b981;
          color: #ffffff;
        }
        .stage-select {
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
          font-weight: 600;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
          outline: none;
          cursor: pointer;
        }
        .due-date-cell {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }
        .due-date-row {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.78rem;
          color: var(--text-secondary);
        }
        .due-today-tag {
          font-size: 0.65rem;
          font-weight: 700;
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
          width: fit-content;
        }
        .text-muted-dash {
          color: var(--text-muted);
        }
        .package-cell {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }
        .pkg-tag {
          font-weight: 700;
          font-size: 0.78rem;
          color: var(--brand-navy);
        }
        .expected-value {
          font-size: 0.78rem;
          font-weight: 600;
          color: #059669;
        }
        .quotation-status {
          font-size: 0.68rem;
          color: var(--text-muted);
        }
        .action-buttons-group {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.35rem;
        }
        .delete-btn:hover {
          color: #dc2626;
          border-color: #fecaca;
        }
        .no-data-cell {
          text-align: center;
          padding: 3rem 1rem !important;
          color: var(--text-muted);
        }
        .no-data-title {
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }
        .mobile-leads-list {
          display: none;
        }
        @media (max-width: 900px) {
          .hide-small {
            display: none;
          }
        }
        @media (max-width: 768px) {
          .table-scroll-wrapper {
            display: none;
          }
          .mobile-leads-list {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            padding: 0.75rem;
          }
          .mobile-lead-card {
            padding: 0.85rem;
            display: flex;
            flex-direction: column;
            gap: 0.55rem;
          }
          .mobile-lead-top {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 0.5rem;
          }
          .mobile-business-name {
            font-size: 0.95rem;
            font-weight: 700;
            color: var(--brand-navy);
            cursor: pointer;
          }
          .mobile-lead-meta {
            font-size: 0.73rem;
            color: var(--text-muted);
          }
          .mobile-contact-bar {
            display: flex;
            justify-content: space-between;
            font-size: 0.76rem;
            color: var(--text-secondary);
          }
          .mobile-phone-text {
            font-family: var(--font-mono);
            color: var(--brand-blue);
            font-weight: 600;
          }
          .mobile-stage-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.5rem;
          }
          .mobile-due-pill {
            display: flex;
            align-items: center;
            gap: 0.3rem;
            font-size: 0.7rem;
            color: var(--text-muted);
            background: #f8fafc;
            padding: 0.15rem 0.45rem;
            border-radius: 4px;
          }
          .mobile-due-pill.due-today {
            background: #fef2f2;
            color: #dc2626;
            font-weight: 700;
            border: 1px solid #fecaca;
          }
          .mobile-action-buttons {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 40px;
            gap: 0.35rem;
            margin-top: 0.2rem;
          }
          .mobile-action-btn {
            height: 38px;
            font-size: 0.78rem;
            font-weight: 600;
          }
          .mobile-action-btn.wa-btn {
            color: #059669;
            background: #ecfdf5;
            border-color: #a7f3d0;
          }
        }
      `}</style>
    </div>
  );
}
