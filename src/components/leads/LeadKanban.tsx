'use client';

import React from 'react';
import {
  Lead,
  PIPELINE_STAGES,
  PipelineStage,
} from '@/types/crm';
import { cleanPhoneNumber } from '@/lib/whatsapp';
import {
  Phone,
  PhoneCall,
  MessageCircle,
  Flame,
  Clock,
  Calendar,
  ChevronRight,
  ChevronLeft,
  DollarSign,
  AlertCircle,
} from 'lucide-react';

interface LeadKanbanProps {
  leads: Lead[];
  onOpenLead: (lead: Lead) => void;
  onQuickCall: (lead: Lead) => void;
  onUpdateStatus: (leadId: string, newStatus: PipelineStage) => void;
  activeRep: string;
}

export default function LeadKanban({
  leads,
  onOpenLead,
  onQuickCall,
  onUpdateStatus,
  activeRep,
}: LeadKanbanProps) {
  const filteredLeads = leads.filter((l) => {
    if (activeRep === 'All' || activeRep === 'All Reps') return true;
    return l.assignedRep === activeRep;
  });

  const todayStr = new Date().toISOString().slice(0, 10);

  const moveStage = (
    leadId: string,
    currentStatus: PipelineStage,
    direction: 'next' | 'prev'
  ) => {
    const currentIndex = PIPELINE_STAGES.indexOf(currentStatus);
    if (direction === 'next' && currentIndex < PIPELINE_STAGES.length - 1) {
      onUpdateStatus(leadId, PIPELINE_STAGES[currentIndex + 1]);
    } else if (direction === 'prev' && currentIndex > 0) {
      onUpdateStatus(leadId, PIPELINE_STAGES[currentIndex - 1]);
    }
  };

  return (
    <div className="kanban-root">
      <div className="kanban-scroll-track">
        {PIPELINE_STAGES.map((stage) => {
          const stageLeads = filteredLeads.filter((l) => l.status === stage);
          const stageTotalValue = stageLeads.reduce(
            (sum, l) => sum + (l.expectedValue || 0),
            0
          );

          return (
            <div key={stage} className="kanban-column">
              {/* Column Header */}
              <div className="kanban-col-header card">
                <div className="col-header-top">
                  <span className={`stage-dot ${stage.replace(/\s+/g, '')}`} />
                  <span className="col-stage-title">{stage}</span>
                  <span className="col-lead-count">{stageLeads.length}</span>
                </div>
                {stageTotalValue > 0 && (
                  <div className="col-value-summary">
                    ₹{stageTotalValue.toLocaleString('en-IN')}
                  </div>
                )}
              </div>

              {/* Column Body / Cards */}
              <div className="kanban-col-cards">
                {stageLeads.length === 0 ? (
                  <div className="empty-kanban-col">
                    <span>No leads in {stage}</span>
                  </div>
                ) : (
                  stageLeads.map((lead) => {
                    const cleanedPhone = cleanPhoneNumber(lead.phone);
                    const isDueToday = lead.followUpDate === todayStr;

                    return (
                      <div key={lead.id} className="card kanban-card">
                        {/* Priority & Score Header */}
                        <div className="card-top-row">
                          <span
                            className={`badge ${
                              lead.priority === 'HOT'
                                ? 'badge-hot'
                                : lead.priority === 'WARM'
                                ? 'badge-warm'
                                : 'badge-cold'
                            }`}
                          >
                            {lead.priority === 'HOT' && <Flame size={10} />}
                            {lead.priority} ({lead.score} pts)
                          </span>

                          <span className="card-rep-tag">
                            {lead.assignedRep || 'Aman'}
                          </span>
                        </div>

                        {/* Title & Click to open */}
                        <h4
                          onClick={() => onOpenLead(lead)}
                          className="card-business-name"
                        >
                          {lead.businessName}
                        </h4>

                        <div className="card-meta">
                          <span className="meta-industry">{lead.industry}</span>
                          {lead.city && (
                            <span className="meta-city"> • {lead.city}</span>
                          )}
                        </div>

                        {/* Owner & Phone */}
                        <div className="card-contact-row">
                          <span className="card-owner">
                            {lead.ownerName || 'Contact'}
                          </span>
                          <span className="card-phone">{lead.phone}</span>
                        </div>

                        {/* Follow-up reminder */}
                        {lead.followUpDate && (
                          <div
                            className={`card-followup-pill ${
                              isDueToday ? 'due-today' : ''
                            }`}
                          >
                            <Clock size={11} />
                            <span>
                              {isDueToday
                                ? 'Follow-up DUE TODAY'
                                : `Follow-up: ${lead.followUpDate}`}
                            </span>
                          </div>
                        )}

                        {/* Package & Value */}
                        <div className="card-pricing-row">
                          <span className="card-package">
                            {lead.packageRecommended || 'Growth'}
                          </span>
                          <span className="card-value">
                            ₹{(lead.expectedValue || 15000).toLocaleString('en-IN')}
                          </span>
                        </div>

                        {/* Actions & Stage Mover */}
                        <div className="card-bottom-actions">
                          <div className="card-action-icons">
                            <button
                              onClick={() => onQuickCall(lead)}
                              className="btn btn-secondary btn-sm btn-icon"
                              title="Log Call"
                            >
                              <PhoneCall size={12} />
                            </button>
                            <a
                              href={`https://wa.me/${cleanedPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary btn-sm btn-icon wa-icon-btn"
                              title="WhatsApp"
                            >
                              <MessageCircle size={12} />
                            </a>
                          </div>

                          <div className="stage-mover-group">
                            <button
                              disabled={PIPELINE_STAGES.indexOf(stage) === 0}
                              onClick={() => moveStage(lead.id, stage, 'prev')}
                              className="stage-move-btn"
                              title="Move to Previous Stage"
                            >
                              <ChevronLeft size={13} />
                            </button>
                            <button
                              disabled={
                                PIPELINE_STAGES.indexOf(stage) ===
                                PIPELINE_STAGES.length - 1
                              }
                              onClick={() => moveStage(lead.id, stage, 'next')}
                              className="stage-move-btn"
                              title="Move to Next Stage"
                            >
                              <ChevronRight size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .kanban-root {
          width: 100%;
          overflow-x: auto;
          padding-bottom: 1.5rem;
        }
        .kanban-scroll-track {
          display: flex;
          gap: 1rem;
          min-width: 1980px;
          padding: 0.25rem 0.25rem;
        }
        .kanban-column {
          flex: 1;
          min-width: 260px;
          max-width: 290px;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .kanban-col-header {
          padding: 0.75rem 0.85rem;
          background: #ffffff;
        }
        .col-header-top {
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }
        .stage-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #94a3b8;
        }
        .stage-dot.New { background: #64748b; }
        .stage-dot.Called { background: #3b82f6; }
        .stage-dot.Interested { background: #10b981; }
        .stage-dot.DemoSent { background: #8b5cf6; }
        .stage-dot.DiscoveryCall { background: #ec4899; }
        .stage-dot.ProposalSent { background: #f97316; }
        .stage-dot.Follow-up { background: #06b6d4; }
        .stage-dot.Won { background: #059669; }
        .stage-dot.Lost { background: #ef4444; }
        .col-stage-title {
          font-size: 0.84rem;
          font-weight: 700;
          color: var(--brand-navy);
          flex: 1;
        }
        .col-lead-count {
          font-size: 0.72rem;
          font-weight: 700;
          background: #f1f5f9;
          color: var(--text-secondary);
          padding: 0.1rem 0.45rem;
          border-radius: var(--radius-full);
        }
        .col-value-summary {
          font-size: 0.74rem;
          font-weight: 600;
          color: #059669;
          margin-top: 0.25rem;
          padding-left: 1.1rem;
        }
        .kanban-col-cards {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          min-height: 400px;
        }
        .empty-kanban-col {
          border: 1px dashed var(--border);
          border-radius: var(--radius-sm);
          padding: 2.5rem 1rem;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.78rem;
        }
        .kanban-card {
          padding: 0.85rem;
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .kanban-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
        .card-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .card-rep-tag {
          font-size: 0.68rem;
          font-weight: 600;
          color: var(--text-muted);
          background: #f8fafc;
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
        }
        .card-business-name {
          font-size: 0.87rem;
          font-weight: 700;
          color: var(--brand-navy);
          cursor: pointer;
          line-height: 1.3;
        }
        .card-business-name:hover {
          color: var(--brand-blue);
        }
        .card-meta {
          font-size: 0.72rem;
          color: var(--text-muted);
        }
        .card-contact-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.74rem;
          color: var(--text-secondary);
        }
        .card-phone {
          font-family: var(--font-mono);
          font-size: 0.71rem;
        }
        .card-followup-pill {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.71rem;
          padding: 0.2rem 0.45rem;
          background: #f8fafc;
          color: var(--text-secondary);
          border-radius: 4px;
        }
        .card-followup-pill.due-today {
          background: #fef2f2;
          color: #dc2626;
          font-weight: 600;
          border: 1px solid #fecaca;
        }
        .card-pricing-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.75rem;
          border-top: 1px solid var(--border-subtle);
          padding-top: 0.4rem;
          margin-top: 0.2rem;
        }
        .card-package {
          font-weight: 600;
          color: var(--brand-navy);
        }
        .card-value {
          font-weight: 700;
          color: #059669;
        }
        .card-bottom-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 0.3rem;
        }
        .card-action-icons {
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }
        .wa-icon-btn {
          color: #059669;
        }
        .wa-icon-btn:hover {
          background: #ecfdf5;
          border-color: #a7f3d0;
        }
        .stage-mover-group {
          display: flex;
          align-items: center;
          gap: 0.2rem;
        }
        .stage-move-btn {
          width: 22px;
          height: 22px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          border: 1px solid var(--border);
          border-radius: 4px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.12s ease;
        }
        .stage-move-btn:hover:not(:disabled) {
          background: var(--brand-light);
          color: var(--brand-blue);
          border-color: var(--brand-border);
        }
        .stage-move-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
