'use client';

import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/common/Sidebar';
import DailyDashboard from '@/components/dashboard/DailyDashboard';
import LeadTable from '@/components/leads/LeadTable';
import LeadKanban from '@/components/leads/LeadKanban';
import LeadModal from '@/components/leads/LeadModal';
import QuickCallModal from '@/components/leads/QuickCallModal';
import ReportingView from '@/components/analytics/ReportingView';
import TemplatesModal from '@/components/templates/TemplatesModal';
import BulkPasteModal from '@/components/leads/BulkPasteModal';
import FirebaseSettingsModal from '@/components/common/FirebaseSettingsModal';
import {
  isFirestoreConfigured,
  saveLeadToFirestore,
  deleteLeadFromFirestore,
  subscribeToFirestoreLeads,
  syncAllLeadsToFirestore,
} from '@/lib/firebase';
import {
  Lead,
  PipelineStage,
  WhatsAppTemplate,
  CallOpenerScript,
  CallResult,
  CommonObjection,
} from '@/types/crm';
import {
  getStoredLeads,
  saveStoredLeads,
  getStoredTemplates,
  saveStoredTemplates,
  getStoredActiveRep,
  setStoredActiveRep,
  resetToSeedData,
  exportLeadsToCSV,
  parseCSVToLeads,
} from '@/lib/storage';
import {
  LayoutList,
  Columns,
  Upload,
  RotateCcw,
  Sparkles,
  PhoneCall,
  CheckCircle2,
} from 'lucide-react';

export default function CRMApp() {
  const [isClient, setIsClient] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pipeline' | 'analytics'>('dashboard');
  const [pipelineViewMode, setPipelineViewMode] = useState<'table' | 'kanban'>('table');
  const [activeRep, setActiveRep] = useState<string>('All Reps');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);

  // Cloud Firestore database connection state
  const [isFirestoreConnected, setIsFirestoreConnected] = useState(false);
  const [isFirebaseSettingsOpen, setIsFirebaseSettingsOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Modal states
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [callingLead, setCallingLead] = useState<Lead | null>(null);
  const [isQuickCallOpen, setIsQuickCallOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isBulkPasteOpen, setIsBulkPasteOpen] = useState(false);

  // Hidden file input for CSV import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize client-side state & Firestore sync
  useEffect(() => {
    setIsClient(true);
    const loadedLeads = getStoredLeads();
    setLeads(loadedLeads);
    const loadedTemplates = getStoredTemplates();
    setTemplates(loadedTemplates);
    const rep = getStoredActiveRep();
    setActiveRep(rep || 'All Reps');

    // Check Cloud Firestore connection
    const firestoreActive = isFirestoreConfigured();
    setIsFirestoreConnected(firestoreActive);

    if (firestoreActive) {
      const unsubscribe = subscribeToFirestoreLeads(
        (remoteLeads) => {
          if (remoteLeads && remoteLeads.length > 0) {
            setLeads(remoteLeads);
            saveStoredLeads(remoteLeads);
          }
        },
        (err) => {
          console.error('Firestore sync error:', err);
        }
      );
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, []);

  // Save changes to storage & Cloud Firestore
  const updateAndSaveLeads = (newLeads: Lead[]) => {
    setLeads(newLeads);
    saveStoredLeads(newLeads);
  };

  const handleRepChange = (rep: string) => {
    setActiveRep(rep);
    setStoredActiveRep(rep);
  };

  const handleOpenNewLead = () => {
    setEditingLead(null);
    setIsLeadModalOpen(true);
  };

  const handleOpenLead = (lead: Lead) => {
    setEditingLead(lead);
    setIsLeadModalOpen(true);
  };

  const handleQuickCall = (lead: Lead) => {
    setCallingLead(lead);
    setIsQuickCallOpen(true);
  };

  const handleSaveLead = (savedLead: Lead) => {
    const exists = leads.some((l) => l.id === savedLead.id);
    let updated: Lead[];
    if (exists) {
      updated = leads.map((l) => (l.id === savedLead.id ? savedLead : l));
    } else {
      updated = [savedLead, ...leads];
    }
    updateAndSaveLeads(updated);
    if (isFirestoreConnected) {
      saveLeadToFirestore(savedLead).catch(console.error);
    }
  };

  const handleDeleteLead = (leadId: string) => {
    const updated = leads.filter((l) => l.id !== leadId);
    updateAndSaveLeads(updated);
    if (isFirestoreConnected) {
      deleteLeadFromFirestore(leadId).catch(console.error);
    }
  };

  const handleUpdateStatus = (leadId: string, newStatus: PipelineStage) => {
    const updated = leads.map((lead) => {
      if (lead.id !== leadId) return lead;
      return {
        ...lead,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };
    });
    updateAndSaveLeads(updated);
    if (isFirestoreConnected) {
      const updatedLead = updated.find((l) => l.id === leadId);
      if (updatedLead) saveLeadToFirestore(updatedLead).catch(console.error);
    }
  };

  const handleSaveCallLog = (
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
  ) => {
    const newCallEntry = {
      id: `call-${Date.now()}`,
      leadId,
      date: new Date().toISOString(),
      ...log,
    };

    const updated = leads.map((lead) => {
      if (lead.id !== leadId) return lead;

      const updatedLogs = [newCallEntry, ...(lead.callLogs || [])];
      let newStatus = lead.status;

      if (log.result === 'Interested') {
        newStatus = 'Interested';
      } else if (lead.status === 'New') {
        newStatus = 'Called';
      }

      return {
        ...lead,
        callLogs: updatedLogs,
        call1Date: lead.call1Date || new Date().toISOString().slice(0, 10),
        callResult: log.result,
        status: newStatus,
        followUpDate: log.nextFollowUpDate || lead.followUpDate,
        whatsappSent: log.askedForWhatsApp ? true : lead.whatsappSent,
        whatsappSentDate: log.askedForWhatsApp
          ? new Date().toISOString().slice(0, 10)
          : lead.whatsappSentDate,
        updatedAt: new Date().toISOString(),
      };
    });

    updateAndSaveLeads(updated);
    if (isFirestoreConnected) {
      const updatedLead = updated.find((l) => l.id === leadId);
      if (updatedLead) saveLeadToFirestore(updatedLead).catch(console.error);
    }
  };

  const handleSaveTemplates = (newTemplates: WhatsAppTemplate[]) => {
    setTemplates(newTemplates);
    saveStoredTemplates(newTemplates);
  };

  const handleExportCSV = () => {
    exportLeadsToCSV(leads);
  };

  const handleResetData = () => {
    if (
      confirm(
        'Reset all leads and cadence templates to Intellicor default sample data?'
      )
    ) {
      const fresh = resetToSeedData();
      setLeads(fresh);
      setTemplates(getStoredTemplates());
    }
  };

  const handleImportCSVClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const parsed = parseCSVToLeads(text);
      if (parsed.length > 0) {
        const merged = [...parsed, ...leads];
        updateAndSaveLeads(merged);
        if (isFirestoreConnected) {
          syncAllLeadsToFirestore(parsed).catch(console.error);
        }
        alert(`Successfully imported ${parsed.length} leads from CSV!`);
      } else {
        alert('Could not parse valid leads from this CSV file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleBulkImportLeads = (newLeads: Lead[]) => {
    const merged = [...newLeads, ...leads];
    updateAndSaveLeads(merged);
    if (isFirestoreConnected) {
      syncAllLeadsToFirestore(newLeads).catch(console.error);
    }
    alert(`⚡ Successfully imported ${newLeads.length} leads into your calling queue!`);
  };

  if (!isClient) {
    return (
      <div className="crm-loading-screen">
        <div className="crm-spinner" />
        <p>Loading Intellicor CRM...</p>
        <style jsx>{`
          .crm-loading-screen {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: #ffffff;
            color: #0b1d33;
            font-family: var(--font-sans);
            gap: 1rem;
          }
          .crm-spinner {
            width: 36px;
            height: 36px;
            border: 3px solid #e2e8f0;
            border-top-color: #1e50bc;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="crm-app-shell">
      {/* PROFESSIONAL LEFT-HAND SIDEBAR (FIXED & ALWAYS SHOWN) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeRep={activeRep}
        setActiveRep={handleRepChange}
        onOpenNewLead={handleOpenNewLead}
        onOpenBulkPaste={() => setIsBulkPasteOpen(true)}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        onExportCSV={handleExportCSV}
        onResetData={handleResetData}
        totalLeadsCount={leads.length}
        isFirestoreConnected={isFirestoreConnected}
        onOpenFirebaseSettings={() => setIsFirebaseSettingsOpen(true)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* MAIN VIEWPORT (PINNED TO OFFSET FIXED SIDEBAR) */}
      <div className={`crm-main-viewport ${isSidebarCollapsed ? 'is-collapsed' : ''}`}>
        <main className="crm-main-content-area">
          {/* Hidden file input for CSV import */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            style={{ display: 'none' }}
          />

          {/* SUB-BAR for Pipeline view mode and quick actions */}
          {activeTab === 'pipeline' && (
            <div className="pipeline-top-bar">
              <div className="pipeline-mode-toggle">
                <button
                  onClick={() => setPipelineViewMode('table')}
                  className={`mode-btn ${
                    pipelineViewMode === 'table' ? 'active' : ''
                  }`}
                >
                  <LayoutList size={15} />
                  <span>Table View</span>
                </button>
                <button
                  onClick={() => setPipelineViewMode('kanban')}
                  className={`mode-btn ${
                    pipelineViewMode === 'kanban' ? 'active' : ''
                  }`}
                >
                  <Columns size={15} />
                  <span>Kanban Board</span>
                </button>
              </div>

              <div className="pipeline-quick-actions">
                <button
                  onClick={handleImportCSVClick}
                  className="btn btn-secondary btn-sm"
                  title="Import Leads from CSV"
                >
                  <Upload size={13} />
                  <span>Import CSV</span>
                </button>
                <button
                  onClick={handleResetData}
                  className="btn btn-secondary btn-sm"
                  title="Reset sample leads"
                >
                  <RotateCcw size={13} />
                  <span>Reset Demo Data</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab View 1: Today's Daily Dashboard */}
          {activeTab === 'dashboard' && (
            <DailyDashboard
              leads={leads}
              activeRep={activeRep}
              onOpenLead={handleOpenLead}
              onQuickCall={handleQuickCall}
              onOpenNewLead={handleOpenNewLead}
              templates={templates}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
            />
          )}

          {/* Tab View 2: Leads & Pipeline View */}
          {activeTab === 'pipeline' && (
            <>
              {pipelineViewMode === 'table' ? (
                <LeadTable
                  leads={leads}
                  onOpenLead={handleOpenLead}
                  onQuickCall={handleQuickCall}
                  onDeleteLead={handleDeleteLead}
                  onUpdateStatus={handleUpdateStatus}
                  activeRep={activeRep}
                />
              ) : (
                <LeadKanban
                  leads={leads}
                  onOpenLead={handleOpenLead}
                  onQuickCall={handleQuickCall}
                  onUpdateStatus={handleUpdateStatus}
                  activeRep={activeRep}
                />
              )}
            </>
          )}

          {/* Tab View 3: 7-Day Performance Analytics */}
          {activeTab === 'analytics' && (
            <ReportingView leads={leads} activeRep={activeRep} />
          )}
        </main>
      </div>

      {/* MODAL 1: Full Lead View & Edit Modal */}
      <LeadModal
        lead={editingLead}
        isOpen={isLeadModalOpen}
        onClose={() => {
          setIsLeadModalOpen(false);
          setEditingLead(null);
        }}
        onSave={handleSaveLead}
        onDelete={handleDeleteLead}
        templates={templates}
        activeRep={activeRep}
      />

      {/* MODAL 2: Quick Call Log Dialog */}
      {callingLead && (
        <QuickCallModal
          lead={callingLead}
          activeRep={activeRep}
          onClose={() => {
            setIsQuickCallOpen(false);
            setCallingLead(null);
          }}
          onSaveCallLog={handleSaveCallLog}
        />
      )}

      {/* MODAL 3: WhatsApp Templates Customizer */}
      <TemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        templates={templates}
        onSaveTemplates={handleSaveTemplates}
      />

      {/* MODAL 4: Bulk Paste Raw Leads Modal */}
      <BulkPasteModal
        isOpen={isBulkPasteOpen}
        onClose={() => setIsBulkPasteOpen(false)}
        onImportLeads={handleBulkImportLeads}
        activeRep={activeRep}
      />

      {/* MODAL 5: Firebase / Firestore Settings Modal */}
      <FirebaseSettingsModal
        isOpen={isFirebaseSettingsOpen}
        onClose={() => setIsFirebaseSettingsOpen(false)}
        leads={leads}
        onSyncComplete={() => {
          setIsFirestoreConnected(true);
        }}
      />

      <style jsx>{`
        .crm-app-shell {
          display: flex;
          min-height: 100vh;
          width: 100%;
          background: var(--bg-main);
          position: relative;
        }
        .crm-main-viewport {
          flex: 1;
          min-width: 0;
          margin-left: 260px;
          width: calc(100% - 260px);
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          overflow-x: hidden;
          background: var(--bg-main);
          transition: margin-left 0.22s cubic-bezier(0.4, 0, 0.2, 1),
            width 0.22s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .crm-main-viewport.is-collapsed {
          margin-left: 72px;
          width: calc(100% - 72px);
        }
        .crm-main-content-area {
          max-width: 1440px;
          width: 100%;
          margin: 0 auto;
          padding: 1.5rem 2rem 3rem;
          flex: 1;
        }
        .pipeline-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.25rem;
          flex-wrap: wrap;
          gap: 0.75rem;
        }
        .pipeline-mode-toggle {
          display: flex;
          background: #ffffff;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 0.2rem;
          gap: 0.2rem;
          box-shadow: var(--shadow-xs);
        }
        .mode-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.75rem;
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--text-secondary);
          background: transparent;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .mode-btn:hover {
          color: var(--brand-blue);
        }
        .mode-btn.active {
          background: var(--brand-light);
          color: var(--brand-blue);
          font-weight: 600;
        }
        .pipeline-quick-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        @media (max-width: 640px) {
          .crm-main-viewport {
            margin-left: 68px;
            width: calc(100% - 68px);
          }
          .crm-main-content-area {
            padding: 1rem 0.75rem 4rem;
          }
        }
      `}</style>
    </div>
  );
}
