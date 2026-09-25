'use client';

import React, { useState, useMemo } from 'react';
import { Lead } from '@/types/crm';
import { cleanPhoneNumber } from '@/lib/whatsapp';
import { exportLeadsToExcel } from '@/lib/excelParser';
import QuickWhatsAppModal from '@/components/common/QuickWhatsAppModal';
import {
  Search,
  Phone,
  PhoneCall,
  MessageCircle,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Trash2,
  MapPin,
  ExternalLink,
  Plus,
  Play,
  FileText,
  Clock,
  Sparkles,
  Pencil,
  Save,
  X,
  Check,
  Download,
  Flame,
  Trophy,
} from 'lucide-react';

interface SimpleLeadListProps {
  leads: Lead[];
  activeRep: string;
  onStartCallingQueue: (initialLeadId?: string) => void;
  onOpenUploadModal: () => void;
  onDeleteLead: (leadId: string) => void;
  onClearAllLeads?: () => void;
  onOpenNewLead?: () => void;
  onUpdateLead?: (lead: Lead) => void;
  onOpenLead?: (lead: Lead) => void;
}

export type TableFilterTab =
  | 'all'
  | 'due_today'
  | 'pending'
  | 'tomorrow'
  | 'brochure_sent'
  | 'interested'
  | 'won'
  | 'not_picked'
  | 'not_interested';

export default function SimpleLeadList({
  leads,
  activeRep,
  onStartCallingQueue,
  onOpenUploadModal,
  onDeleteLead,
  onClearAllLeads,
  onOpenNewLead,
  onUpdateLead,
  onOpenLead,
}: SimpleLeadListProps) {
  const [activeTab, setActiveTab] = useState<TableFilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Quick edit modal state
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // Inline notes editing state
  const [editingInlineId, setEditingInlineId] = useState<string | null>(null);
  const [inlineNotesText, setInlineNotesText] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Quick WhatsApp Template Modal state
  const [waModalLead, setWaModalLead] = useState<Lead | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleSaveInlineNotes = (lead: Lead) => {
    if (onUpdateLead) {
      onUpdateLead({
        ...lead,
        requirement: inlineNotesText,
        notes: inlineNotesText,
        updatedAt: new Date().toISOString(),
      });
      showToast('✓ Notes updated!');
    }
    setEditingInlineId(null);
  };

  const handleToggleBrochure = (lead: Lead) => {
    if (onUpdateLead) {
      const nextBrochure = !lead.brochureSent;
      onUpdateLead({
        ...lead,
        brochureSent: nextBrochure,
        brochureSentDate: nextBrochure ? new Date().toISOString().slice(0, 10) : undefined,
        updatedAt: new Date().toISOString(),
      });
      showToast(nextBrochure ? '✓ Marked brochure as sent' : 'Brochure marked not sent');
    }
  };

  const handleSaveEditLead = (startCalling = false) => {
    if (!editingLead) return;
    const updatedLead: Lead = {
      ...editingLead,
      status: editingLead.callResult === 'Deal Won' ? 'Won' : editingLead.status,
      updatedAt: new Date().toISOString(),
    };
    if (onUpdateLead) {
      onUpdateLead(updatedLead);
    }
    const leadId = updatedLead.id;
    setEditingLead(null);
    showToast('✓ Lead updated successfully!');
    if (startCalling) {
      onStartCallingQueue(leadId);
    }
  };

  // Filter leads by Rep
  const repLeads = useMemo(() => {
    if (activeRep === 'All' || activeRep === 'All Reps') return leads;
    return leads.filter((l) => l.assignedRep === activeRep);
  }, [leads, activeRep]);

  // Tab counters
  const counters = useMemo(() => {
    let dueToday = 0;
    let pending = 0;
    let tomorrowCount = 0;
    let brochureSentCount = 0;
    let interested = 0;
    let won = 0;
    let wonRevenue = 0;
    let notPicked = 0;
    let notInterested = 0;

    repLeads.forEach((l) => {
      const isWon = l.status === 'Won' || l.callResult === 'Deal Won';
      if (isWon) {
        won++;
        wonRevenue += l.dealValue || l.expectedValue || 0;
      }
      if (l.followUpDate && l.followUpDate <= todayStr && !isWon) {
        dueToday++;
      }
      if (
        l.status === 'New' ||
        l.callResult === 'Not Picked Up' ||
        l.callResult === 'No Answer' ||
        l.callResult === 'Call Back Later' ||
        l.callResult === 'Callback'
      ) {
        pending++;
      }
      if (l.followUpDate === tomorrowStr) {
        tomorrowCount++;
      }
      if (l.brochureSent) {
        brochureSentCount++;
      }
      if (l.status === 'Interested' || l.callResult === 'Interested') {
        interested++;
      }
      if (l.callResult === 'Not Picked Up' || l.callResult === 'No Answer') {
        notPicked++;
      }
      if (l.callResult === 'Not Interested' || l.status === 'Lost') {
        notInterested++;
      }
    });

    return {
      all: repLeads.length,
      due_today: dueToday,
      pending,
      tomorrow: tomorrowCount,
      brochure_sent: brochureSentCount,
      interested,
      won,
      wonRevenue,
      not_picked: notPicked,
      not_interested: notInterested,
    };
  }, [repLeads, todayStr, tomorrowStr]);

  // Filtered leads based on tab and search
  const filteredLeads = useMemo(() => {
    let result = repLeads;

    // Filter by Tab
    switch (activeTab) {
      case 'due_today':
        result = result.filter(
          (l) => l.followUpDate && l.followUpDate <= todayStr && l.status !== 'Won' && l.callResult !== 'Deal Won'
        );
        break;
      case 'pending':
        result = result.filter(
          (l) =>
            l.status === 'New' ||
            l.callResult === 'Not Picked Up' ||
            l.callResult === 'No Answer' ||
            l.callResult === 'Call Back Later' ||
            l.callResult === 'Callback'
        );
        break;
      case 'tomorrow':
        result = result.filter((l) => l.followUpDate === tomorrowStr);
        break;
      case 'brochure_sent':
        result = result.filter((l) => !!l.brochureSent);
        break;
      case 'interested':
        result = result.filter(
          (l) => l.status === 'Interested' || l.callResult === 'Interested'
        );
        break;
      case 'won':
        result = result.filter(
          (l) => l.status === 'Won' || l.callResult === 'Deal Won'
        );
        break;
      case 'not_picked':
        result = result.filter(
          (l) => l.callResult === 'Not Picked Up' || l.callResult === 'No Answer'
        );
        break;
      case 'not_interested':
        result = result.filter(
          (l) => l.callResult === 'Not Interested' || l.status === 'Lost'
        );
        break;
      case 'all':
      default:
        break;
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (l) =>
          l.businessName.toLowerCase().includes(q) ||
          (l.ownerName && l.ownerName.toLowerCase().includes(q)) ||
          l.phone.includes(q) ||
          (l.city && l.city.toLowerCase().includes(q)) ||
          (l.notes && l.notes.toLowerCase().includes(q)) ||
          (l.requirement && l.requirement.toLowerCase().includes(q))
      );
    }

    return result;
  }, [repLeads, activeTab, tomorrowStr, searchQuery]);

  return (
    <div className="simple-list-container">
      {/* Top Banner with Quick Actions */}
      <div className="list-top-banner">
        <div className="banner-left">
          <h2 className="banner-title">Client Leads & Follow-ups</h2>
          <p className="banner-subtitle">
            Showing {filteredLeads.length} contact{filteredLeads.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="banner-actions">
          {onClearAllLeads && leads.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Clear all leads from CRM? This cannot be undone.')) {
                  onClearAllLeads();
                }
              }}
              className="btn-banner-clear"
              title="Clear all leads"
            >
              <Trash2 size={15} />
              <span>Clear All</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => exportLeadsToExcel(filteredLeads.length > 0 ? filteredLeads : leads)}
            disabled={leads.length === 0}
            className="btn-banner-export"
            title="Export all leads to formatted Excel (.xlsx)"
          >
            <Download size={15} />
            <span>Export Excel</span>
          </button>

          <button onClick={onOpenUploadModal} className="btn-banner-upload">
            <FileSpreadsheet size={16} />
            <span>Upload Excel</span>
          </button>

          <button
            onClick={() => onStartCallingQueue()}
            disabled={filteredLeads.length === 0}
            className="btn-banner-start-calling"
          >
            <PhoneCall size={17} />
            <span>Start Calling 1-by-1</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs-row">
        <button
          onClick={() => setActiveTab('all')}
          className={`filter-tab ${activeTab === 'all' ? 'active' : ''}`}
        >
          <span>All Leads</span>
          <span className="tab-badge">{counters.all}</span>
        </button>

        <button
          onClick={() => setActiveTab('due_today')}
          className={`filter-tab ${activeTab === 'due_today' ? 'active' : ''} ${counters.due_today > 0 ? 'tab-alert' : ''}`}
        >
          <span>🔥 Due Today</span>
          <span className={`tab-badge ${counters.due_today > 0 ? 'badge-red' : ''}`}>{counters.due_today}</span>
        </button>

        <button
          onClick={() => setActiveTab('pending')}
          className={`filter-tab ${activeTab === 'pending' ? 'active' : ''}`}
        >
          <span>⏳ To Call (Pending)</span>
          <span className="tab-badge text-blue">{counters.pending}</span>
        </button>

        <button
          onClick={() => setActiveTab('tomorrow')}
          className={`filter-tab ${activeTab === 'tomorrow' ? 'active' : ''}`}
        >
          <span>⏰ Follow-ups Tomorrow</span>
          <span className="tab-badge badge-amber">{counters.tomorrow}</span>
        </button>

        <button
          onClick={() => setActiveTab('brochure_sent')}
          className={`filter-tab ${activeTab === 'brochure_sent' ? 'active' : ''}`}
        >
          <span>📄 Brochure Sent</span>
          <span className="tab-badge badge-green">{counters.brochure_sent}</span>
        </button>

        <button
          onClick={() => setActiveTab('interested')}
          className={`filter-tab ${activeTab === 'interested' ? 'active' : ''}`}
        >
          <span>🟢 Interested</span>
          <span className="tab-badge badge-green">{counters.interested}</span>
        </button>

        <button
          onClick={() => setActiveTab('won')}
          className={`filter-tab ${activeTab === 'won' ? 'active' : ''}`}
        >
          <span>🏆 Won</span>
          <span className="tab-badge badge-green">
            {counters.won} {counters.wonRevenue > 0 ? `(₹${counters.wonRevenue.toLocaleString('en-IN')})` : ''}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('not_picked')}
          className={`filter-tab ${activeTab === 'not_picked' ? 'active' : ''}`}
        >
          <span>🔴 Not Picked Up</span>
          <span className="tab-badge badge-red">{counters.not_picked}</span>
        </button>

        <button
          onClick={() => setActiveTab('not_interested')}
          className={`filter-tab ${activeTab === 'not_interested' ? 'active' : ''}`}
        >
          <span>⚪ Not Interested</span>
          <span className="tab-badge">{counters.not_interested}</span>
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="search-bar-row">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by client name, phone number, city, or notes..."
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
      </div>

      {/* Leads Table */}
      <div className="table-card">
        {filteredLeads.length === 0 ? (
          <div className="empty-table-state">
            <AlertCircle size={36} className="text-slate" />
            <p className="empty-title">No leads found in this view</p>
            <p className="empty-sub">
              {searchQuery
                ? `No leads match "${searchQuery}". Try a different search term.`
                : 'Upload an Excel sheet or select another tab to view contacts.'}
            </p>
            <button onClick={onOpenUploadModal} className="btn-empty-upload">
              + Upload Leads from Excel
            </button>
          </div>
        ) : (
          <>
            <div className="table-overflow">
            <table className="simple-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Client / Business Name</th>
                  <th>Phone Number</th>
                  <th>City</th>
                  <th>Requirement / Notes</th>
                  <th>Last Call Result</th>
                  <th>Follow-up</th>
                  <th>Brochure</th>
                  <th style={{ textAlign: 'right', width: '130px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead, idx) => {
                  const rawPhone = cleanPhoneNumber(lead.phone);
                  const isFollowUpTomorrow = lead.followUpDate === tomorrowStr;

                  return (
                    <tr key={lead.id} className="lead-table-row">
                      <td className="col-idx">{idx + 1}</td>

                      {/* Business & Owner Name */}
                      <td className="col-name">
                        <div
                          className="name-primary clickable-cell"
                          onClick={() => setEditingLead(lead)}
                          title="Click to edit lead details"
                        >
                          <span>{lead.businessName}</span>
                          <Pencil size={11} className="cell-hover-pen" />
                        </div>
                        {lead.ownerName && lead.ownerName !== lead.businessName && (
                          <div className="name-secondary">{lead.ownerName}</div>
                        )}
                      </td>

                      {/* Phone with quick call / wa link */}
                      <td className="col-phone">
                        <div className="phone-wrapper">
                          <span
                            className="phone-text clickable-cell"
                            onClick={() => setEditingLead(lead)}
                            title="Click to edit phone number"
                          >
                            {lead.phone}
                          </span>
                          <div className="phone-quick-actions">
                            <a
                              href={`tel:${rawPhone}`}
                              className="phone-quick-icon call"
                              title="Direct Phone Call"
                            >
                              <Phone size={13} />
                            </a>
                            <button
                              type="button"
                              onClick={() => setWaModalLead(lead)}
                              className="phone-quick-icon wa"
                              title="WhatsApp with 1-click quick templates"
                            >
                              <MessageCircle size={13} />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* City */}
                      <td className="col-city">
                        {lead.city ? (
                          <span
                            className="city-pill clickable-pill"
                            onClick={() => setEditingLead(lead)}
                            title="Click to edit city"
                          >
                            <MapPin size={11} /> {lead.city}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingLead(lead)}
                            className="btn-add-detail-inline"
                            title="Click to add city"
                          >
                            + City
                          </button>
                        )}
                      </td>

                      {/* Notes / Requirement (Editable inline & via modal) */}
                      <td className="col-notes">
                        {editingInlineId === lead.id ? (
                          <div className="inline-notes-edit-box">
                            <textarea
                              autoFocus
                              rows={2}
                              value={inlineNotesText}
                              onChange={(e) => setInlineNotesText(e.target.value)}
                              onBlur={() => handleSaveInlineNotes(lead)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSaveInlineNotes(lead);
                                } else if (e.key === 'Escape') {
                                  setEditingInlineId(null);
                                }
                              }}
                              placeholder="Type requirement / notes..."
                              className="inline-notes-input"
                            />
                            <div className="inline-notes-actions">
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handleSaveInlineNotes(lead);
                                }}
                                className="btn-inline-save"
                                title="Save (Enter)"
                              >
                                <Check size={12} />
                              </button>
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setEditingInlineId(null);
                                }}
                                className="btn-inline-cancel"
                                title="Cancel (Esc)"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className="notes-display-wrap clickable-cell"
                            onClick={() => {
                              setEditingInlineId(lead.id);
                              setInlineNotesText(lead.requirement || lead.notes || '');
                            }}
                            title="Click to edit requirement / notes directly"
                          >
                            <span className="notes-clamp">
                              {lead.requirement || lead.notes || (
                                <span className="empty-notes-hint">+ Click to add notes</span>
                              )}
                            </span>
                            <Pencil size={11} className="cell-hover-pen" />
                          </div>
                        )}
                      </td>

                      {/* Call Result */}
                      <td className="col-status">
                        <button
                          type="button"
                          onClick={() => setEditingLead(lead)}
                          className={`result-tag result-${(lead.callResult || 'new')
                            .toLowerCase()
                            .replace(/\s+/g, '-')} clickable-tag`}
                          title="Click to edit outcome / status"
                        >
                          <span>{lead.callResult || 'Not Called'}</span>
                          <Pencil size={10} className="tag-pen-icon" />
                        </button>
                      </td>

                      {/* Follow-up Date */}
                      <td className="col-followup">
                        {lead.followUpDate ? (
                          <button
                            type="button"
                            onClick={() => setEditingLead(lead)}
                            className={`followup-pill ${
                              isFollowUpTomorrow ? 'is-tomorrow' : ''
                            } clickable-pill`}
                            title="Click to change follow-up schedule"
                          >
                            <Clock size={12} />
                            <span>
                              {isFollowUpTomorrow
                                ? `Tomorrow ${lead.followUpTime || ''}`
                                : `${lead.followUpDate} ${lead.followUpTime || ''}`}
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingLead(lead)}
                            className="btn-add-detail-inline"
                            title="Click to set follow-up"
                          >
                            + Follow-up
                          </button>
                        )}
                      </td>

                      {/* Brochure Status (1-click toggle) */}
                      <td className="col-brochure">
                        <button
                          type="button"
                          onClick={() => handleToggleBrochure(lead)}
                          className={`brochure-badge ${
                            lead.brochureSent ? 'sent' : 'not-sent'
                          } clickable-badge`}
                          title="Click to toggle brochure sent status"
                        >
                          {lead.brochureSent ? <CheckCircle2 size={12} /> : null}
                          <span>{lead.brochureSent ? 'Sent' : 'Mark Sent'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="col-actions">
                        <div className="action-buttons-group">
                          <button
                            onClick={() => onStartCallingQueue(lead.id)}
                            className="btn-row-call"
                            title="Call this lead now (opens Power Dialer)"
                          >
                            <PhoneCall size={13} />
                            <span>Call</span>
                          </button>
                          <button
                            onClick={() => setEditingLead(lead)}
                            className="btn-row-edit"
                            title="Edit this lead's details"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete lead "${lead.businessName}"?`)) {
                                onDeleteLead(lead.id);
                              }
                            }}
                            className="btn-row-delete"
                            title="Delete lead"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Lead Cards View (< 768px) */}
          <div className="mobile-leads-list">
            {filteredLeads.map((lead, idx) => {
              const rawPhone = cleanPhoneNumber(lead.phone);
              const isFollowUpTomorrow = lead.followUpDate === tomorrowStr;

              return (
                <div key={lead.id} className="mobile-lead-card">
                  {/* Header: Lead # & Status Badge */}
                  <div className="mobile-card-header">
                    <div
                      className="mobile-card-title-row clickable-mob-title"
                      onClick={() => setEditingLead(lead)}
                      title="Click to edit lead details"
                    >
                      <span className="mobile-lead-num">#{idx + 1}</span>
                      <h4 className="mobile-lead-name">{lead.businessName}</h4>
                      <Pencil size={11} className="mob-title-pen" />
                    </div>
                    <div className="mobile-card-badges">
                      {lead.callResult ? (
                        <button
                          type="button"
                          onClick={() => setEditingLead(lead)}
                          className={`result-tag result-${lead.callResult.toLowerCase().replace(/\s+/g, '-')} clickable-tag`}
                          title="Click to edit status"
                        >
                          {lead.callResult}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingLead(lead)}
                          className="result-tag result-new clickable-tag"
                          title="Click to edit status"
                        >
                          Not Called
                        </button>
                      )}
                      {lead.brochureSent && (
                        <button
                          type="button"
                          onClick={() => handleToggleBrochure(lead)}
                          className="brochure-badge sent clickable-badge"
                          title="Click to toggle brochure"
                        >
                          <CheckCircle2 size={11} />
                          <span>Brochure</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {lead.ownerName && lead.ownerName !== lead.businessName && (
                    <div className="mobile-lead-owner">Contact: {lead.ownerName}</div>
                  )}

                  {/* Phone & Quick Actions Bar */}
                  <div className="mobile-card-actions-bar">
                    <div
                      className="mobile-phone-val clickable-mob-phone"
                      onClick={() => setEditingLead(lead)}
                      title="Click to edit phone"
                    >
                      {lead.phone}
                    </div>
                    <div className="mobile-btn-actions">
                      <a
                        href={`tel:${rawPhone}`}
                        className="btn-mob-action call"
                        title="Call directly"
                      >
                        <PhoneCall size={14} />
                        <span>Call</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => setWaModalLead(lead)}
                        className="btn-mob-action wa"
                        title="WhatsApp with 1-click quick templates"
                      >
                        <MessageCircle size={14} />
                        <span>WhatsApp</span>
                      </button>
                      <button
                        onClick={() => onStartCallingQueue(lead.id)}
                        className="btn-mob-action dialer"
                        title="Start dialer on this lead"
                      >
                        <Play size={13} />
                        <span>1-by-1</span>
                      </button>
                      <button
                        onClick={() => setEditingLead(lead)}
                        className="btn-mob-action edit"
                        title="Edit lead details"
                      >
                        <Pencil size={13} />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>

                  {/* Meta info & Notes */}
                  <div className="mobile-card-meta">
                    {lead.city && (
                      <span
                        className="city-pill clickable-pill"
                        onClick={() => setEditingLead(lead)}
                      >
                        <MapPin size={11} /> {lead.city}
                      </span>
                    )}
                    {lead.followUpDate && (
                      <button
                        type="button"
                        onClick={() => setEditingLead(lead)}
                        className={`followup-pill ${isFollowUpTomorrow ? 'is-tomorrow' : ''} clickable-pill`}
                      >
                        <Clock size={11} />
                        <span>
                          {isFollowUpTomorrow
                            ? `Tomorrow ${lead.followUpTime || ''}`
                            : `${lead.followUpDate} ${lead.followUpTime || ''}`}
                        </span>
                      </button>
                    )}
                  </div>

                  <div
                    className="mobile-card-notes clickable-notes"
                    onClick={() => setEditingLead(lead)}
                    title="Click to edit requirement / notes"
                  >
                    <FileText size={12} className="notes-icon" />
                    <span>{lead.requirement || lead.notes || <span className="empty-hint">+ Click to add client notes...</span>}</span>
                    <Pencil size={11} className="mob-notes-pen" />
                  </div>

                  {/* Card Footer with Rep and Delete */}
                  <div className="mobile-card-footer">
                    <span className="mobile-rep-tag">Rep: {lead.assignedRep || 'Aman'}</span>
                    <button
                      onClick={() => {
                        if (confirm(`Delete lead "${lead.businessName}"?`)) {
                          onDeleteLead(lead.id);
                        }
                      }}
                      className="btn-mob-delete"
                      title="Delete lead"
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="simple-list-toast">
          <span>{toastMsg}</span>
        </div>
      )}

      {/* QUICK EDIT & CALL MODAL */}
      {editingLead && (
        <div className="quick-edit-backdrop" onClick={() => setEditingLead(null)}>
          <div className="quick-edit-card" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="quick-edit-header">
              <div className="header-title-block">
                <div className="edit-badge-icon">
                  <Pencil size={18} />
                </div>
                <div>
                  <h3 className="quick-edit-title">Edit Lead Details</h3>
                  <span className="quick-edit-sub">Modify contact information, notes, or schedule call</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingLead(null)}
                className="quick-edit-close"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="quick-edit-body">
              {/* Row 1: Business Name & Contact Name */}
              <div className="edit-form-grid-2">
                <div className="edit-field">
                  <label>Business / Client Name</label>
                  <input
                    type="text"
                    value={editingLead.businessName}
                    onChange={(e) => setEditingLead({ ...editingLead, businessName: e.target.value })}
                    className="edit-input"
                    placeholder="e.g. Apex Dental Clinic"
                  />
                </div>
                <div className="edit-field">
                  <label>Contact / Owner Name</label>
                  <input
                    type="text"
                    value={editingLead.ownerName || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, ownerName: e.target.value })}
                    className="edit-input"
                    placeholder="e.g. Dr. Rajesh Sharma"
                  />
                </div>
              </div>

              {/* Row 2: Phone Number with 1-tap call & WA actions + City */}
              <div className="edit-form-grid-2">
                <div className="edit-field">
                  <label>Phone Number</label>
                  <div className="phone-input-row">
                    <input
                      type="tel"
                      value={editingLead.phone}
                      onChange={(e) => setEditingLead({ ...editingLead, phone: e.target.value })}
                      className="edit-input phone-inp"
                      placeholder="e.g. +91 98201 44521"
                    />
                    <a
                      href={`tel:${cleanPhoneNumber(editingLead.phone)}`}
                      className="btn-quick-call-tel"
                      title="Direct Call"
                    >
                      <Phone size={15} />
                    </a>
                    <a
                      href={`https://wa.me/${cleanPhoneNumber(editingLead.phone)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-quick-wa-link"
                      title="Open WhatsApp chat"
                    >
                      <MessageCircle size={15} />
                    </a>
                  </div>
                </div>
                <div className="edit-field">
                  <label>City</label>
                  <input
                    type="text"
                    value={editingLead.city || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, city: e.target.value })}
                    className="edit-input"
                    placeholder="e.g. Mumbai, Delhi, Ahmedabad"
                  />
                </div>
              </div>

              {/* Row 3: Requirement / Client Notes */}
              <div className="edit-field">
                <label>Client Requirement / Notes:</label>
                <textarea
                  rows={3}
                  value={editingLead.requirement || editingLead.notes || ''}
                  onChange={(e) => setEditingLead({
                    ...editingLead,
                    requirement: e.target.value,
                    notes: e.target.value,
                  })}
                  className="edit-textarea"
                  placeholder="Type or paste client inquiry, requirements, budget, or call notes..."
                />
              </div>

              {/* Row 4: Last Call Outcome / Status */}
              <div className="edit-field">
                <label>Last Call Outcome / Status:</label>
                <div className="status-selection-pills">
                  {(['New', 'Not Picked Up', 'Call Back Later', 'Interested', 'Deal Won', 'Not Interested'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setEditingLead({
                        ...editingLead,
                        callResult: st as any,
                        status: st === 'Deal Won' ? 'Won' : st === 'Interested' ? 'Interested' : st === 'Not Interested' ? 'Lost' : st === 'New' ? 'New' : 'Called',
                      })}
                      className={`edit-status-pill pill-${st.toLowerCase().replace(/\s+/g, '-')} ${(editingLead.callResult === st || (!editingLead.callResult && st === 'New')) ? 'active' : ''}`}
                    >
                      {st === 'Deal Won' ? '🎉 Deal Won' : st}
                    </button>
                  ))}
                </div>
              </div>

              {editingLead.callResult === 'Deal Won' && (
                <div className="edit-field deal-won-revenue-field">
                  <label>🎉 Deal Won Amount (₹):</label>
                  <input
                    type="number"
                    value={editingLead.dealValue ?? editingLead.expectedValue ?? 15000}
                    onChange={(e) =>
                      setEditingLead({
                        ...editingLead,
                        dealValue: Number(e.target.value) || 0,
                        expectedValue: Number(e.target.value) || 0,
                      })
                    }
                    className="edit-input"
                    placeholder="e.g. 25000"
                  />
                </div>
              )}

              {/* Row 5: Follow-up Date & Time */}
              <div className="edit-form-grid-2">
                <div className="edit-field">
                  <label>Follow-up Date:</label>
                  <div className="date-preset-group">
                    <input
                      type="date"
                      value={editingLead.followUpDate || ''}
                      onChange={(e) => setEditingLead({ ...editingLead, followUpDate: e.target.value })}
                      className="edit-input"
                    />
                    <button
                      type="button"
                      onClick={() => setEditingLead({
                        ...editingLead,
                        followUpDate: tomorrowStr,
                        followUpTime: editingLead.followUpTime || '10:00 AM',
                      })}
                      className="btn-set-tomorrow"
                    >
                      Tomorrow
                    </button>
                  </div>
                </div>
                <div className="edit-field">
                  <label>Follow-up Time:</label>
                  <input
                    type="text"
                    value={editingLead.followUpTime || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, followUpTime: e.target.value })}
                    className="edit-input"
                    placeholder="e.g. 10:00 AM, 2:00 PM"
                  />
                </div>
              </div>

              {/* Row 6: Company Brochure Status */}
              <div className="edit-brochure-row">
                <div className="brochure-toggle-label">
                  <span className="brochure-title">Company Brochure:</span>
                  <span className="brochure-status-sub">
                    {editingLead.brochureSent ? 'Marked as Sent' : 'Not sent yet'}
                  </span>
                </div>
                <div className="brochure-btns-group">
                  <button
                    type="button"
                    onClick={() => setEditingLead({
                      ...editingLead,
                      brochureSent: !editingLead.brochureSent,
                      brochureSentDate: !editingLead.brochureSent ? new Date().toISOString().slice(0, 10) : undefined,
                    })}
                    className={`btn-toggle-brochure-edit ${editingLead.brochureSent ? 'is-sent' : ''}`}
                  >
                    {editingLead.brochureSent ? <CheckCircle2 size={15} /> : null}
                    <span>{editingLead.brochureSent ? 'Brochure Sent' : 'Mark as Sent'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="quick-edit-footer">
              <button
                type="button"
                onClick={() => setEditingLead(null)}
                className="btn-edit-cancel"
              >
                Cancel
              </button>
              <div className="footer-right-actions">
                <button
                  type="button"
                  onClick={() => handleSaveEditLead(false)}
                  className="btn-save-only"
                >
                  <Save size={15} />
                  <span>Save Changes</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveEditLead(true)}
                  className="btn-save-and-call"
                  title="Save changes and start calling immediately"
                >
                  <PhoneCall size={16} />
                  <span>Save &amp; Call Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1-Click WhatsApp Quick Templates Modal */}
      {waModalLead && (
        <QuickWhatsAppModal
          lead={waModalLead}
          onClose={() => setWaModalLead(null)}
          onSent={() => showToast('📲 WhatsApp opened!')}
        />
      )}

      <style jsx>{`
        .simple-list-container {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          width: 100%;
        }

        /* Top Banner */
        .list-top-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #ffffff;
          padding: 1.25rem 1.75rem;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }
        .banner-title {
          font-size: 1.35rem;
          font-weight: 800;
          color: #0b1d33;
        }
        .banner-subtitle {
          font-size: 0.85rem;
          color: #64748b;
          margin-top: 2px;
        }
        .banner-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .btn-banner-export {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          background: #ffffff;
          border: 1.5px solid #cbd5e1;
          color: #1e293b;
          padding: 0.65rem 1.15rem;
          border-radius: 9px;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-banner-export:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #94a3b8;
        }
        .btn-banner-export:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-banner-upload {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          background: #ffffff;
          border: 1.5px solid #cbd5e1;
          color: #1e293b;
          padding: 0.65rem 1.15rem;
          border-radius: 9px;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-banner-upload:hover {
          background: #f8fafc;
          border-color: #94a3b8;
        }
        .btn-banner-start-calling {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #1e50bc, #2563eb);
          color: #ffffff;
          border: none;
          padding: 0.65rem 1.35rem;
          border-radius: 9px;
          font-size: 0.92rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.28);
          transition: all 0.15s;
        }
        .btn-banner-start-calling:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
        }
        .btn-banner-start-calling:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-banner-clear {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          background: #ffffff;
          border: 1.5px solid #fecaca;
          color: #dc2626;
          padding: 0.65rem 0.95rem;
          border-radius: 9px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-banner-clear:hover {
          background: #fef2f2;
          border-color: #ef4444;
        }

        /* Filter Tabs */
        .filter-tabs-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          padding-bottom: 3px;
        }
        .filter-tabs-row::-webkit-scrollbar {
          display: none;
        }
        .filter-tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.55rem 0.95rem;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #475569;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          transition: all 0.15s;
        }
        .filter-tab:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }
        .filter-tab.active {
          background: #0b1d33;
          color: #ffffff;
          border-color: #0b1d33;
          font-weight: 600;
        }
        .filter-tab.tab-alert {
          border-color: #fecaca;
          background: #fff5f5;
          color: #b91c1c;
        }
        .filter-tab.tab-alert.active {
          background: #dc2626;
          color: #ffffff;
          border-color: #dc2626;
        }
        .tab-badge {
          background: #f1f5f9;
          color: #475569;
          padding: 0.1rem 0.45rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .filter-tab.active .tab-badge {
          background: rgba(255, 255, 255, 0.2);
          color: #ffffff;
        }
        .badge-amber {
          background: #fef3c7;
          color: #b45309;
        }
        .badge-green {
          background: #dcfce7;
          color: #15803d;
        }
        .badge-red {
          background: #fee2e2;
          color: #b91c1c;
        }

        /* Search Bar */
        .search-bar-row {
          display: flex;
          gap: 1rem;
        }
        .search-input-wrapper {
          position: relative;
          flex: 1;
        }
        .search-icon {
          position: absolute;
          left: 0.85rem;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }
        .search-input {
          width: 100%;
          padding: 0.65rem 1rem 0.65rem 2.4rem;
          border: 1.5px solid #cbd5e1;
          border-radius: 10px;
          background: #ffffff;
          font-size: 0.9rem;
          outline: none;
        }
        .search-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        .clear-search-btn {
          position: absolute;
          right: 0.85rem;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          font-size: 1.2rem;
          color: #94a3b8;
          cursor: pointer;
        }

        /* Table Card */
        .table-card {
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          overflow: hidden;
        }
        .table-overflow {
          overflow-x: auto;
        }
        .simple-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.86rem;
          text-align: left;
        }
        .simple-table th {
          background: #f8fafc;
          padding: 0.75rem 1rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1px solid #e2e8f0;
          white-space: nowrap;
        }
        .lead-table-row {
          border-bottom: 1px solid #f1f5f9;
          transition: background 0.1s;
        }
        .lead-table-row:hover {
          background: #f8fafc;
        }
        .lead-table-row td {
          padding: 0.8rem 1rem;
          vertical-align: middle;
        }
        .col-idx {
          color: #94a3b8;
          font-size: 0.8rem;
          text-align: center;
        }
        .col-name {
          min-width: 170px;
        }
        .name-primary {
          font-weight: 700;
          color: #0b1d33;
        }
        .name-secondary {
          font-size: 0.78rem;
          color: #64748b;
          margin-top: 1px;
        }
        .clickable-cell {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          cursor: pointer;
          border-radius: 4px;
          padding: 0.1rem 0.25rem;
          margin: -0.1rem -0.25rem;
          transition: background 0.15s, color 0.15s;
        }
        .clickable-cell:hover {
          background: #f1f5f9;
          color: #1e50bc;
        }
        .cell-hover-pen {
          opacity: 0;
          color: #94a3b8;
          transition: opacity 0.15s, color 0.15s;
        }
        .clickable-cell:hover .cell-hover-pen {
          opacity: 1;
          color: #1e50bc;
        }
        .col-phone {
          min-width: 150px;
        }
        .phone-wrapper {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .phone-text {
          font-family: var(--font-mono, monospace);
          font-size: 0.85rem;
          font-weight: 600;
          color: #334155;
        }
        .phone-quick-actions {
          display: flex;
          gap: 0.3rem;
        }
        .phone-quick-icon {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          transition: all 0.15s;
        }
        .phone-quick-icon.call {
          background: #f0fdf4;
          color: #16a34a;
        }
        .phone-quick-icon.call:hover {
          background: #dcfce7;
        }
        .phone-quick-icon.wa {
          background: #f0fdf4;
          color: #25d366;
        }
        .phone-quick-icon.wa:hover {
          background: #dcfce7;
        }
        .col-city {
          min-width: 100px;
        }
        .city-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.78rem;
          color: #475569;
          background: #f1f5f9;
          padding: 0.2rem 0.5rem;
          border-radius: 6px;
        }
        .clickable-pill {
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.15s;
        }
        .clickable-pill:hover {
          background: #e2e8f0;
          border-color: #cbd5e1;
        }
        .btn-add-detail-inline {
          background: transparent;
          border: 1px dashed #cbd5e1;
          color: #94a3b8;
          font-size: 0.75rem;
          font-weight: 500;
          padding: 0.2rem 0.5rem;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-add-detail-inline:hover {
          border-color: #1e50bc;
          color: #1e50bc;
          background: #eff6ff;
        }
        .col-notes {
          min-width: 220px;
          max-width: 300px;
        }
        .notes-display-wrap {
          width: 100%;
          min-height: 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.35rem;
        }
        .notes-clamp {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          font-size: 0.8rem;
          color: #475569;
          line-height: 1.35;
        }
        .empty-notes-hint {
          font-size: 0.78rem;
          color: #94a3b8;
          font-style: italic;
        }
        .inline-notes-edit-box {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          width: 100%;
          min-width: 200px;
        }
        .inline-notes-input {
          width: 100%;
          font-size: 0.8rem;
          line-height: 1.35;
          color: #0b1d33;
          border: 1.5px solid #1e50bc;
          border-radius: 6px;
          padding: 0.35rem 0.5rem;
          outline: none;
          background: #ffffff;
          font-family: inherit;
          resize: vertical;
          box-shadow: 0 0 0 2px rgba(30, 80, 188, 0.12);
        }
        .inline-notes-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.25rem;
        }
        .btn-inline-save {
          background: #16a34a;
          color: #ffffff;
          border: none;
          border-radius: 4px;
          padding: 0.15rem 0.35rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .btn-inline-save:hover {
          background: #15803d;
        }
        .btn-inline-cancel {
          background: #94a3b8;
          color: #ffffff;
          border: none;
          border-radius: 4px;
          padding: 0.15rem 0.35rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .btn-inline-cancel:hover {
          background: #64748b;
        }
        .col-status {
          min-width: 130px;
        }
        .result-tag {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.2rem 0.55rem;
          border-radius: 6px;
        }
        .clickable-tag {
          cursor: pointer;
          border: none;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          transition: all 0.15s;
        }
        .clickable-tag:hover {
          filter: brightness(0.95);
          transform: translateY(-1px);
        }
        .tag-pen-icon {
          opacity: 0.55;
        }
        .result-not-picked-up,
        .result-no-answer {
          background: #fef2f2;
          color: #dc2626;
        }
        .result-call-back-later,
        .result-callback {
          background: #fffbeb;
          color: #b45309;
        }
        .result-interested {
          background: #f0fdf4;
          color: #16a34a;
        }
        .result-not-interested {
          background: #f1f5f9;
          color: #64748b;
        }
        .result-connected {
          background: #eff6ff;
          color: #1e50bc;
        }
        .result-new {
          background: #f8fafc;
          color: #94a3b8;
          border: 1px dashed #cbd5e1;
        }
        .col-followup {
          min-width: 130px;
        }
        .followup-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.78rem;
          font-weight: 500;
          color: #475569;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 0.25rem 0.55rem;
          border-radius: 6px;
        }
        .followup-pill.is-tomorrow {
          background: #fef3c7;
          border-color: #fde68a;
          color: #92400e;
          font-weight: 700;
        }
        .col-brochure {
          min-width: 95px;
        }
        .brochure-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.2rem 0.5rem;
          border-radius: 9999px;
        }
        .clickable-badge {
          cursor: pointer;
          border: none;
          transition: all 0.15s;
        }
        .clickable-badge:hover {
          filter: brightness(0.92);
          transform: scale(1.03);
        }
        .brochure-badge.sent {
          background: #dcfce7;
          color: #15803d;
        }
        .brochure-badge.not-sent {
          background: #f1f5f9;
          color: #94a3b8;
        }
        .empty-dash {
          color: #cbd5e1;
        }
        .col-actions {
          text-align: right;
        }
        .action-buttons-group {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.4rem;
        }
        .btn-row-call {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1e50bc;
          padding: 0.35rem 0.75rem;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-row-call:hover {
          background: #1e50bc;
          color: #ffffff;
        }
        .btn-row-edit {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-row-edit:hover {
          background: #e2e8f0;
          color: #0b1d33;
          border-color: #cbd5e1;
        }
        .btn-row-delete {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 1px solid transparent;
          color: #94a3b8;
          cursor: pointer;
        }
        .btn-row-delete:hover {
          background: #fee2e2;
          color: #dc2626;
        }

        /* Empty table state */
        .empty-table-state {
          padding: 3.5rem 1.5rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.65rem;
        }
        .empty-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #0b1d33;
        }
        .empty-sub {
          font-size: 0.88rem;
          color: #64748b;
          max-width: 400px;
        }
        .btn-empty-upload {
          margin-top: 0.5rem;
          background: #1e50bc;
          color: #ffffff;
          border: none;
          padding: 0.65rem 1.25rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.88rem;
          cursor: pointer;
        }

        /* Mobile Leads Cards View (hidden by default on desktop) */
        .mobile-leads-list {
          display: none;
        }

        .mobile-lead-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
          transition: border-color 0.15s;
        }
        .mobile-lead-card:hover {
          border-color: #cbd5e1;
        }
        .mobile-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.5rem;
        }
        .mobile-card-title-row {
          display: flex;
          align-items: baseline;
          gap: 0.45rem;
          flex: 1;
        }
        .mobile-lead-num {
          font-size: 0.75rem;
          font-weight: 700;
          color: #94a3b8;
          font-family: var(--font-mono, monospace);
        }
        .mobile-lead-name {
          font-size: 1.05rem;
          font-weight: 700;
          color: #0b1d33;
          line-height: 1.25;
          word-break: break-word;
        }
        .mobile-card-badges {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .mobile-lead-owner {
          font-size: 0.8rem;
          color: #475569;
          margin-top: -0.25rem;
        }
        .mobile-card-actions-bar {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 0.65rem 0.75rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .mobile-phone-val {
          font-family: var(--font-mono, monospace);
          font-size: 0.95rem;
          font-weight: 700;
          color: #0b1d33;
        }
        .mobile-btn-actions {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .btn-mob-action {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.45rem 0.7rem;
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          text-decoration: none;
          min-height: 36px;
        }
        .btn-mob-action.call {
          background: #16a34a;
          color: #ffffff;
        }
        .btn-mob-action.call:hover {
          background: #15803d;
        }
        .btn-mob-action.wa {
          background: #25d366;
          color: #ffffff;
        }
        .btn-mob-action.wa:hover {
          background: #128c7e;
        }
        .btn-mob-action.dialer {
          background: #1e50bc;
          color: #ffffff;
        }
        .btn-mob-action.dialer:hover {
          background: #1742a0;
        }
        .btn-mob-action.edit {
          background: #f1f5f9;
          color: #334155;
          border: 1px solid #cbd5e1;
        }
        .btn-mob-action.edit:hover {
          background: #e2e8f0;
          color: #0b1d33;
        }
        .clickable-mob-title {
          cursor: pointer;
        }
        .mob-title-pen {
          color: #94a3b8;
          margin-left: 2px;
          flex-shrink: 0;
        }
        .clickable-mob-phone {
          cursor: pointer;
          transition: color 0.15s;
        }
        .clickable-mob-phone:hover {
          color: #1e50bc;
          text-decoration: underline;
        }
        .mobile-card-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .mobile-card-notes {
          background: #f1f5f9;
          border-radius: 8px;
          padding: 0.45rem 0.65rem;
          font-size: 0.8rem;
          color: #334155;
          display: flex;
          align-items: flex-start;
          gap: 0.35rem;
          line-height: 1.35;
        }
        .clickable-notes {
          cursor: pointer;
          transition: background 0.15s;
        }
        .clickable-notes:hover {
          background: #e2e8f0;
        }
        .notes-icon {
          flex-shrink: 0;
          margin-top: 2px;
          color: #64748b;
        }
        .mob-notes-pen {
          margin-left: auto;
          color: #94a3b8;
          flex-shrink: 0;
        }
        .empty-hint {
          color: #94a3b8;
          font-style: italic;
        }
        .mobile-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 0.45rem;
          border-top: 1px solid #f1f5f9;
        }
        .mobile-rep-tag {
          font-size: 0.72rem;
          color: #64748b;
        }
        .btn-mob-delete {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 0.75rem;
          cursor: pointer;
          padding: 0.25rem 0.45rem;
          border-radius: 4px;
        }
        .btn-mob-delete:hover {
          color: #dc2626;
          background: #fef2f2;
        }

        /* Simple List Floating Toast */
        .simple-list-toast {
          position: fixed;
          bottom: 1.5rem;
          left: 50%;
          transform: translateX(-50%);
          background: #0b1d33;
          color: #ffffff;
          padding: 0.65rem 1.25rem;
          border-radius: 9999px;
          font-size: 0.85rem;
          font-weight: 600;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
          z-index: 99999;
          animation: toastSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border: 1px solid rgba(255, 255, 255, 0.12);
        }
        @keyframes toastSlideUp {
          from {
            opacity: 0;
            transform: translate(-50%, 15px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }

        /* Quick Edit & Dial Modal */
        .quick-edit-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(11, 29, 51, 0.6);
          backdrop-filter: blur(4px);
          z-index: 9999;
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
        .quick-edit-card {
          background: #ffffff;
          border-radius: 16px;
          width: 100%;
          max-width: 620px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.25);
          border: 1px solid #e2e8f0;
          overflow: hidden;
          animation: slideCard 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideCard {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .quick-edit-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.15rem 1.4rem;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
        }
        .header-title-block {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .edit-badge-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: #eff6ff;
          color: #1e50bc;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .quick-edit-title {
          font-size: 1.12rem;
          font-weight: 700;
          color: #0b1d33;
          margin: 0;
        }
        .quick-edit-sub {
          font-size: 0.78rem;
          color: #64748b;
          display: block;
        }
        .quick-edit-close {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: transparent;
          border: none;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
        }
        .quick-edit-close:hover {
          background: #f1f5f9;
          color: #0b1d33;
        }
        .quick-edit-body {
          padding: 1.25rem 1.4rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .edit-form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.85rem;
        }
        .edit-field {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .edit-field label {
          font-size: 0.78rem;
          font-weight: 700;
          color: #334155;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .edit-input {
          width: 100%;
          padding: 0.55rem 0.75rem;
          font-size: 0.88rem;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          color: #0b1d33;
          outline: none;
          background: #ffffff;
          transition: all 0.15s;
        }
        .edit-input:focus {
          border-color: #1e50bc;
          box-shadow: 0 0 0 3px rgba(30, 80, 188, 0.12);
        }
        .edit-textarea {
          width: 100%;
          padding: 0.6rem 0.75rem;
          font-size: 0.88rem;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          color: #0b1d33;
          outline: none;
          background: #ffffff;
          font-family: inherit;
          resize: vertical;
          transition: all 0.15s;
        }
        .edit-textarea:focus {
          border-color: #1e50bc;
          box-shadow: 0 0 0 3px rgba(30, 80, 188, 0.12);
        }
        .phone-input-row {
          display: flex;
          gap: 0.35rem;
          align-items: center;
        }
        .phone-input-row .phone-inp {
          flex: 1;
          font-family: var(--font-mono, monospace);
          font-weight: 600;
        }
        .btn-quick-call-tel,
        .btn-quick-wa-link {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          flex-shrink: 0;
          transition: all 0.15s;
        }
        .btn-quick-call-tel {
          background: #f0fdf4;
          color: #16a34a;
          border: 1px solid #bbf7d0;
        }
        .btn-quick-call-tel:hover {
          background: #16a34a;
          color: #ffffff;
        }
        .btn-quick-wa-link {
          background: #f0fdf4;
          color: #25d366;
          border: 1px solid #bbf7d0;
        }
        .btn-quick-wa-link:hover {
          background: #25d366;
          color: #ffffff;
        }
        .status-selection-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }
        .edit-status-pill {
          padding: 0.35rem 0.75rem;
          font-size: 0.8rem;
          font-weight: 600;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s;
        }
        .edit-status-pill:hover {
          border-color: #cbd5e1;
          background: #f1f5f9;
        }
        .edit-status-pill.active {
          border-color: transparent;
        }
        .edit-status-pill.pill-new.active {
          background: #e2e8f0;
          color: #334155;
        }
        .edit-status-pill.pill-not-picked-up.active {
          background: #dc2626;
          color: #ffffff;
        }
        .edit-status-pill.pill-call-back-later.active {
          background: #d97706;
          color: #ffffff;
        }
        .edit-status-pill.pill-interested.active {
          background: #16a34a;
          color: #ffffff;
        }
        .edit-status-pill.pill-deal-won.active {
          background: #15803d;
          color: #ffffff;
          box-shadow: 0 0 0 2px #86efac;
        }
        .edit-status-pill.pill-not-interested.active {
          background: #64748b;
          color: #ffffff;
        }
        .deal-won-revenue-field {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          padding: 0.75rem 0.85rem;
          border-radius: 8px;
        }
        .date-preset-group {
          display: flex;
          gap: 0.35rem;
        }
        .date-preset-group input {
          flex: 1;
        }
        .btn-set-tomorrow {
          padding: 0.4rem 0.75rem;
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s;
        }
        .btn-set-tomorrow:hover {
          background: #fde68a;
        }
        .edit-brochure-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.85rem 1rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
        }
        .brochure-toggle-label {
          display: flex;
          flex-direction: column;
        }
        .brochure-title {
          font-size: 0.85rem;
          font-weight: 700;
          color: #0b1d33;
        }
        .brochure-status-sub {
          font-size: 0.75rem;
          color: #64748b;
        }
        .btn-toggle-brochure-edit {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.45rem 0.9rem;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #475569;
          transition: all 0.15s;
        }
        .btn-toggle-brochure-edit.is-sent {
          background: #dcfce7;
          color: #15803d;
          border-color: #86efac;
        }
        .btn-toggle-brochure-edit:hover {
          filter: brightness(0.96);
        }
        .quick-edit-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.4rem;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
        }
        .footer-right-actions {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }
        .btn-edit-cancel {
          padding: 0.55rem 1rem;
          background: transparent;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-edit-cancel:hover {
          background: #f1f5f9;
          color: #0b1d33;
        }
        .btn-save-only {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.55rem 1rem;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 700;
          color: #0b1d33;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-save-only:hover {
          background: #f1f5f9;
          border-color: #94a3b8;
        }
        .btn-save-and-call {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.55rem 1.25rem;
          background: #1e50bc;
          border: 1px solid #1e50bc;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 700;
          color: #ffffff;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(30, 80, 188, 0.25);
          transition: all 0.15s;
        }
        .btn-save-and-call:hover {
          background: #1742a0;
          border-color: #1742a0;
        }

        @media (max-width: 768px) {
          .table-overflow {
            display: none;
          }
          .mobile-leads-list {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            padding: 0.75rem;
          }
          .list-top-banner {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.85rem;
            padding: 1rem;
          }
          .banner-actions {
            width: 100%;
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
          }
          .btn-banner-upload,
          .btn-banner-start-calling {
            flex: 1;
            justify-content: center;
            min-height: 42px;
          }
          .btn-banner-clear {
            min-height: 42px;
          }
          .search-input {
            font-size: 16px !important;
          }
          .edit-form-grid-2 {
            grid-template-columns: 1fr;
          }
          .quick-edit-card {
            max-height: 95vh;
            border-radius: 14px;
          }
          .quick-edit-footer {
            flex-direction: column-reverse;
            gap: 0.5rem;
            align-items: stretch;
          }
          .footer-right-actions {
            flex-direction: column;
            width: 100%;
          }
          .btn-edit-cancel,
          .btn-save-only,
          .btn-save-and-call {
            width: 100%;
            justify-content: center;
            min-height: 42px;
          }
          .edit-input,
          .edit-textarea {
            font-size: 16px !important;
          }
        }

        @media (max-width: 480px) {
          .mobile-card-actions-bar {
            flex-direction: column;
            align-items: stretch;
            gap: 0.5rem;
          }
          .mobile-phone-val {
            text-align: center;
            font-size: 1.05rem;
          }
          .mobile-btn-actions {
            width: 100%;
            display: flex;
            gap: 0.35rem;
          }
          .btn-mob-action {
            flex: 1;
            justify-content: center;
            padding: 0.5rem 0.35rem;
          }
          .banner-actions {
            flex-direction: column;
          }
          .btn-banner-clear,
          .btn-banner-upload,
          .btn-banner-start-calling {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
