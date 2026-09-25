'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import Sidebar from '@/components/common/Sidebar';
import DailyDashboard from '@/components/dashboard/DailyDashboard';
import LeadTable from '@/components/leads/LeadTable';
import LeadKanban from '@/components/leads/LeadKanban';
import LeadModal from '@/components/leads/LeadModal';
import InCallAssistantModal from '@/components/leads/InCallAssistantModal';
import ReportingView from '@/components/analytics/ReportingView';
import TemplatesModal from '@/components/templates/TemplatesModal';
import BulkPasteModal from '@/components/leads/BulkPasteModal';
import FirebaseSettingsModal from '@/components/common/FirebaseSettingsModal';
import SimplePowerDialer from '@/components/leads/SimplePowerDialer';
import SimpleLeadList from '@/components/leads/SimpleLeadList';
import SimpleBulkUploadModal from '@/components/leads/SimpleBulkUploadModal';
import {
  isFirestoreConfigured,
  saveLeadToFirestore,
  deleteLeadFromFirestore,
  subscribeToFirestoreLeads,
  syncAllLeadsToFirestore,
} from '@/lib/firebase';
import {
  Lead,
  CallLog,
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
  isMockLead,
} from '@/lib/storage';
import {
  LayoutList,
  Columns,
  Upload,
  RotateCcw,
  Sparkles,
  PhoneCall,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  SlidersHorizontal,
  ChevronDown,
  User,
  Clock,
  Send,
  Zap,
} from 'lucide-react';

export default function CRMApp() {
  const [isClient, setIsClient] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);

  // Mode: 'simple' (Streamlined 1-by-1 caller) or 'advanced' (Full CRM with analytics & kanban)
  const [appMode, setAppMode] = useState<'simple' | 'advanced'>('simple');
  const [simpleTab, setSimpleTab] = useState<'call_queue' | 'leads'>('call_queue');
  const [activeCallingLeadId, setActiveCallingLeadId] = useState<string | undefined>();
  const [isSimpleUploadOpen, setIsSimpleUploadOpen] = useState(false);

  // Advanced mode state
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

  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  // Initialize client-side state & Firestore sync
  useEffect(() => {
    setIsClient(true);
    // Purge legacy mock storage keys
    localStorage.removeItem('intellicor_crm_leads_v1');
    localStorage.removeItem('intellicor_crm_leads_v2');

    const loadedLeads = getStoredLeads();
    const cleanLeads = loadedLeads.filter((l) => !isMockLead(l));
    setLeads(cleanLeads);
    saveStoredLeads(cleanLeads);

    const loadedTemplates = getStoredTemplates();
    setTemplates(loadedTemplates);
    const rep = getStoredActiveRep();
    setActiveRep(rep || 'All Reps');

    // Load saved app mode preference if any
    const savedMode = localStorage.getItem('intellicor_crm_mode');
    if (savedMode === 'advanced') {
      setAppMode('advanced');
    }

    // Check Cloud Firestore connection
    const firestoreActive = isFirestoreConfigured();
    setIsFirestoreConnected(firestoreActive);

    if (firestoreActive) {
      const unsubscribe = subscribeToFirestoreLeads(
        (remoteLeads) => {
          if (remoteLeads) {
            const clean = remoteLeads.filter((l) => !isMockLead(l));
            setLeads(clean);
            saveStoredLeads(clean);
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

  const handleToggleAppMode = (mode: 'simple' | 'advanced') => {
    setAppMode(mode);
    localStorage.setItem('intellicor_crm_mode', mode);
  };

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
    // If in simple mode, start calling queue on this lead
    if (appMode === 'simple') {
      setActiveCallingLeadId(lead.id);
      setSimpleTab('call_queue');
    } else {
      setCallingLead(lead);
      setIsQuickCallOpen(true);
    }
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

  const handleClearAllLeads = () => {
    updateAndSaveLeads([]);
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
      result: CallResult;
      openerScript?: CallOpenerScript | string;
      objection?: CommonObjection | string;
      objections?: string[];
      askedForWhatsApp: boolean;
      notes: string;
      nextFollowUpDate?: string;
      nextFollowUpTime?: string;
      brochureSent?: boolean;
    },
    leadUpdates?: {
      requirement?: string;
      notes?: string;
      followUpDate?: string;
      followUpTime?: string;
      brochureSent?: boolean;
      brochureSentDate?: string;
    }
  ) => {
    const newCallEntry: CallLog = {
      id: `call-${Date.now()}`,
      leadId,
      date: new Date().toISOString(),
      repName: log.repName,
      openerScript: (log.openerScript as CallOpenerScript) || 'Direct GBP Audit',
      result: log.result,
      objection: log.objection as CommonObjection,
      objections: log.objections,
      askedForWhatsApp: log.askedForWhatsApp,
      notes: log.notes,
      nextFollowUpDate: log.nextFollowUpDate,
      nextFollowUpTime: log.nextFollowUpTime,
      brochureSent: log.brochureSent,
    };

    const updated = leads.map((lead) => {
      if (lead.id !== leadId) return lead;

      const updatedLogs = [newCallEntry, ...(lead.callLogs || [])];
      let newStatus = lead.status;

      if (log.result === 'Interested') {
        newStatus = 'Interested';
      } else if (log.result === 'Not Interested') {
        newStatus = 'Lost';
      } else if (lead.status === 'New') {
        newStatus = 'Called';
      }

      const isBrochureSent =
        leadUpdates?.brochureSent !== undefined
          ? leadUpdates.brochureSent
          : log.brochureSent !== undefined
          ? log.brochureSent
          : lead.brochureSent;

      const brochureSentDate =
        leadUpdates?.brochureSentDate ||
        (isBrochureSent && !lead.brochureSentDate
          ? new Date().toISOString().slice(0, 10)
          : lead.brochureSentDate);

      return {
        ...lead,
        callLogs: updatedLogs,
        call1Date: lead.call1Date || new Date().toISOString().slice(0, 10),
        callResult: log.result,
        status: newStatus,
        requirement:
          leadUpdates?.requirement !== undefined
            ? leadUpdates.requirement
            : lead.requirement,
        notes:
          leadUpdates?.notes !== undefined
            ? leadUpdates.notes
            : log.notes || lead.notes,
        followUpDate:
          leadUpdates?.followUpDate !== undefined
            ? leadUpdates.followUpDate
            : log.nextFollowUpDate || lead.followUpDate,
        followUpTime:
          leadUpdates?.followUpTime !== undefined
            ? leadUpdates.followUpTime
            : log.nextFollowUpTime || lead.followUpTime,
        brochureSent: isBrochureSent,
        brochureSentDate,
        whatsappSent: log.askedForWhatsApp || isBrochureSent ? true : lead.whatsappSent,
        whatsappSentDate:
          log.askedForWhatsApp || isBrochureSent
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
        'Reset all leads and cadence templates to default sample data?'
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
        alert(`Successfully imported ${parsed.length} leads!`);
      } else {
        alert('Could not parse valid leads from this file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleBulkImportLeads = (
    newLeads: Lead[],
    startCallingImmediately = false
  ) => {
    const merged = [...newLeads, ...leads];
    updateAndSaveLeads(merged);
    if (isFirestoreConnected) {
      syncAllLeadsToFirestore(newLeads).catch(console.error);
    }
    if (startCallingImmediately && newLeads.length > 0) {
      setActiveCallingLeadId(newLeads[0].id);
      setSimpleTab('call_queue');
      setAppMode('simple');
    }
  };

  // Quick stats computed for top bar
  const stats = useMemo(() => {
    let repLeads = leads;
    if (activeRep !== 'All' && activeRep !== 'All Reps') {
      repLeads = leads.filter((l) => l.assignedRep === activeRep);
    }
    const inQueue = repLeads.filter(
      (l) =>
        l.status === 'New' ||
        l.callResult === 'Not Picked Up' ||
        l.callResult === 'No Answer' ||
        l.callResult === 'Call Back Later' ||
        l.callResult === 'Callback'
    ).length;
    const dueTomorrow = repLeads.filter((l) => l.followUpDate === tomorrowStr).length;
    const brochuresSent = repLeads.filter((l) => !!l.brochureSent).length;
    const interested = repLeads.filter(
      (l) => l.status === 'Interested' || l.callResult === 'Interested'
    ).length;

    return { inQueue, dueTomorrow, brochuresSent, interested };
  }, [leads, activeRep, tomorrowStr]);

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

  // ==========================================
  // RENDER: STREAMLINED SIMPLE TELECALLER MODE
  // ==========================================
  if (appMode === 'simple') {
    return (
      <div className="simple-app-shell">
        {/* TOP BAR: Clean, distraction-free header */}
        <header className="simple-header">
          <div className="simple-header-inner">
            {/* Left: Brand & Main Navigation Tabs */}
            <div className="header-brand-and-tabs">
              <div className="simple-brand-block">
                <Image
                  src="/logo.png"
                  alt="Intellicor Logo"
                  width={30}
                  height={30}
                  priority
                  className="brand-logo"
                />
                <div className="brand-text">
                  <span className="brand-title">Intellicor</span>
                  <span className="brand-badge-telecaller">Telecaller</span>
                </div>
              </div>

              {/* Main Tabs */}
              <nav className="simple-nav-tabs">
                <button
                  type="button"
                  onClick={() => setSimpleTab('call_queue')}
                  className={`simple-nav-tab ${simpleTab === 'call_queue' ? 'active' : ''}`}
                >
                  <PhoneCall size={16} />
                  <span>Call One-by-One</span>
                  <span className="nav-badge-count">{stats.inQueue}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSimpleTab('leads')}
                  className={`simple-nav-tab ${simpleTab === 'leads' ? 'active' : ''}`}
                >
                  <Layers size={16} />
                  <span>All Leads</span>
                  <span className="nav-badge-count">{leads.length}</span>
                </button>
              </nav>
            </div>

            {/* Right: Quick Stats, Rep Selector & Action Buttons */}
            <div className="header-right-actions">
              {/* Quick Metrics */}
              <div className="header-stats-pills">
                <div className="header-stat-pill" title="Due for follow-up tomorrow">
                  <Clock size={13} className="text-amber" />
                  <span>Tomorrow: <strong>{stats.dueTomorrow}</strong></span>
                </div>
                <div className="header-stat-pill" title="Brochures sent via WhatsApp">
                  <Send size={13} className="text-green" />
                  <span>Brochures: <strong>{stats.brochuresSent}</strong></span>
                </div>
              </div>



              {/* Upload Excel Button */}
              <button
                type="button"
                onClick={() => setIsSimpleUploadOpen(true)}
                className="btn-upload-excel-header"
              >
                <FileSpreadsheet size={16} />
                <span>Upload Excel</span>
              </button>

              {/* Switch to Advanced CRM Mode */}
              <button
                type="button"
                onClick={() => handleToggleAppMode('advanced')}
                className="btn-switch-mode"
                title="Switch to Full CRM with Kanban & Analytics"
              >
                <SlidersHorizontal size={14} />
                <span>Advanced View</span>
              </button>
            </div>
          </div>
        </header>

        {/* MAIN BODY CONTENT */}
        <main className="simple-main-container">
          {simpleTab === 'call_queue' ? (
            <SimplePowerDialer
              leads={leads}
              activeRep={activeRep}
              onSaveCallLog={handleSaveCallLog}
              onOpenLeadModal={handleOpenLead}
              onOpenUploadModal={() => setIsSimpleUploadOpen(true)}
              initialLeadId={activeCallingLeadId}
              onExit={() => setSimpleTab('leads')}
            />
          ) : (
            <SimpleLeadList
              leads={leads}
              activeRep={activeRep}
              onStartCallingQueue={(leadId) => {
                setActiveCallingLeadId(leadId);
                setSimpleTab('call_queue');
              }}
              onOpenUploadModal={() => setIsSimpleUploadOpen(true)}
              onDeleteLead={handleDeleteLead}
              onClearAllLeads={handleClearAllLeads}
              onOpenNewLead={handleOpenNewLead}
              onUpdateLead={handleSaveLead}
              onOpenLead={handleOpenLead}
            />
          )}
        </main>

        {/* SIMPLE BULK UPLOAD MODAL */}
        <SimpleBulkUploadModal
          isOpen={isSimpleUploadOpen}
          onClose={() => setIsSimpleUploadOpen(false)}
          onImportLeads={handleBulkImportLeads}
          activeRep={activeRep}
        />

        {/* Lead View/Edit Modal if opened */}
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

        <style jsx>{`
          .simple-app-shell {
            min-height: 100vh;
            background: #f8fafc;
            display: flex;
            flex-direction: column;
            color: #0b1d33;
          }
          .simple-header {
            background: #ffffff;
            border-bottom: 1px solid #e2e8f0;
            position: sticky;
            top: 0;
            z-index: 1000;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          }
          .simple-header-inner {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0.75rem 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
          }
          .header-brand-and-tabs {
            display: flex;
            align-items: center;
            gap: 1.75rem;
          }
          .simple-brand-block {
            display: flex;
            align-items: center;
            gap: 0.65rem;
          }
          .brand-text {
            display: flex;
            align-items: center;
            gap: 0.4rem;
          }
          .brand-title {
            font-size: 1.15rem;
            font-weight: 800;
            color: #0b1d33;
            letter-spacing: -0.02em;
          }
          .brand-badge-telecaller {
            font-size: 0.7rem;
            font-weight: 700;
            text-transform: uppercase;
            background: #eff6ff;
            color: #1e50bc;
            padding: 0.15rem 0.45rem;
            border-radius: 4px;
            letter-spacing: 0.04em;
          }
          .simple-nav-tabs {
            display: flex;
            align-items: center;
            gap: 0.35rem;
            background: #f1f5f9;
            padding: 3px;
            border-radius: 10px;
          }
          .simple-nav-tab {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.45rem 0.95rem;
            border-radius: 8px;
            border: none;
            background: transparent;
            font-size: 0.85rem;
            font-weight: 500;
            color: #475569;
            cursor: pointer;
            transition: all 0.15s;
          }
          .simple-nav-tab:hover {
            color: #0b1d33;
          }
          .simple-nav-tab.active {
            background: #ffffff;
            color: #1e50bc;
            font-weight: 700;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
          }
          .nav-badge-count {
            background: #e2e8f0;
            color: #475569;
            font-size: 0.72rem;
            padding: 0.1rem 0.4rem;
            border-radius: 9999px;
            font-weight: 700;
          }
          .simple-nav-tab.active .nav-badge-count {
            background: #eff6ff;
            color: #1e50bc;
          }
          .header-right-actions {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }
          .header-stats-pills {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          .header-stat-pill {
            display: flex;
            align-items: center;
            gap: 0.35rem;
            font-size: 0.8rem;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 0.35rem 0.65rem;
            border-radius: 8px;
            color: #475569;
          }
          .text-amber {
            color: #d97706;
          }
          .text-green {
            color: #16a34a;
          }
          .text-slate {
            color: #64748b;
          }

          .btn-upload-excel-header {
            display: flex;
            align-items: center;
            gap: 0.45rem;
            background: #1e50bc;
            color: #ffffff;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 8px;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(30, 80, 188, 0.25);
            transition: all 0.15s;
          }
          .btn-upload-excel-header:hover {
            background: #1742a0;
            transform: translateY(-1px);
          }
          .btn-switch-mode {
            display: flex;
            align-items: center;
            gap: 0.35rem;
            background: transparent;
            border: 1px solid #cbd5e1;
            color: #64748b;
            padding: 0.45rem 0.75rem;
            border-radius: 8px;
            font-size: 0.78rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s;
          }
          .btn-switch-mode:hover {
            background: #f1f5f9;
            color: #0b1d33;
          }
          .simple-main-container {
            max-width: 1400px;
            width: 100%;
            margin: 0 auto;
            padding: 1.5rem 1.5rem 3rem;
            flex: 1;
          }

          @media (max-width: 1024px) {
            .simple-header-inner {
              padding: 0.75rem 1rem;
              gap: 0.75rem;
            }
            .header-brand-and-tabs {
              gap: 1rem;
            }
            .simple-main-container {
              padding: 1.25rem 1rem 3rem;
            }
          }

          @media (max-width: 900px) {
            .simple-header-inner {
              flex-direction: column;
              align-items: stretch;
              gap: 0.65rem;
            }
            .header-brand-and-tabs {
              justify-content: space-between;
              flex-wrap: wrap;
            }
            .header-right-actions {
              justify-content: space-between;
              flex-wrap: wrap;
              gap: 0.5rem;
            }
          }

          @media (max-width: 640px) {
            .simple-header-inner {
              padding: 0.5rem 0.75rem;
              gap: 0.5rem;
            }
            .header-brand-and-tabs {
              flex-direction: column;
              align-items: stretch;
              gap: 0.5rem;
            }
            .simple-brand-block {
              justify-content: space-between;
            }
            .simple-nav-tabs {
              width: 100%;
            }
            .simple-nav-tab {
              flex: 1;
              justify-content: center;
              padding: 0.5rem 0.4rem;
              font-size: 0.8rem;
              gap: 0.35rem;
            }
            .header-right-actions {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 0.4rem;
            }
            .header-stats-pills {
              gap: 0.35rem;
            }
            .header-stat-pill {
              padding: 0.3rem 0.5rem;
              font-size: 0.74rem;
            }
            .btn-upload-excel-header {
              padding: 0.45rem 0.75rem;
              font-size: 0.78rem;
              gap: 0.35rem;
            }
            .btn-switch-mode {
              padding: 0.45rem 0.6rem;
              font-size: 0.72rem;
            }
            .simple-main-container {
              padding: 0.75rem 0.6rem 3rem;
            }
          }
        `}</style>
      </div>
    );
  }

  // ==========================================
  // RENDER: ADVANCED CRM VIEW (With Kanban, Analytics, Full Pipeline)
  // ==========================================
  return (
    <div className="crm-app-shell">
      {/* SIDEBAR */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeRep={activeRep}
        setActiveRep={handleRepChange}
        onOpenNewLead={handleOpenNewLead}
        onOpenBulkPaste={() => setIsSimpleUploadOpen(true)}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        onExportCSV={handleExportCSV}
        onResetData={handleResetData}
        totalLeadsCount={leads.length}
        isFirestoreConnected={isFirestoreConnected}
        onOpenFirebaseSettings={() => setIsFirebaseSettingsOpen(true)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* MAIN VIEWPORT */}
      <div className={`crm-main-viewport ${isSidebarCollapsed ? 'is-collapsed' : ''}`}>
        <main className="crm-main-content-area">
          {/* BANNER TO SWITCH BACK TO SIMPLE TELECALLER MODE */}
          <div className="mode-switch-banner">
            <div className="banner-text-left">
              <Zap size={16} className="text-amber" />
              <span>Looking for the simple 1-by-1 calling screen?</span>
            </div>
            <button
              onClick={() => handleToggleAppMode('simple')}
              className="btn-switch-simple"
            >
              <span>⚡ Switch to Simple Telecaller Mode</span>
              <ArrowRight size={14} />
            </button>
          </div>

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
                  onClick={() => setIsSimpleUploadOpen(true)}
                  className="btn btn-secondary btn-sm"
                  title="Import Leads from Excel or CSV"
                >
                  <Upload size={13} />
                  <span>Upload Excel / CSV</span>
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

      {/* MODAL 2: In-Call Script Assistant */}
      {callingLead && (
        <InCallAssistantModal
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

      {/* MODAL 4: Simple Bulk Upload Modal */}
      <SimpleBulkUploadModal
        isOpen={isSimpleUploadOpen}
        onClose={() => setIsSimpleUploadOpen(false)}
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
        .mode-switch-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 12px;
          padding: 0.75rem 1.25rem;
          margin-bottom: 1.25rem;
        }
        .banner-text-left {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.88rem;
          font-weight: 500;
          color: #1e40af;
        }
        .text-amber {
          color: #d97706;
        }
        .btn-switch-simple {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: #1e50bc;
          color: #ffffff;
          border: none;
          padding: 0.45rem 0.95rem;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-switch-simple:hover {
          background: #1742a0;
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
        @media (max-width: 1024px) {
          .crm-app-shell {
            display: flex;
            flex-direction: column;
          }
          .crm-main-viewport,
          .crm-main-viewport.is-collapsed {
            margin-left: 0;
            width: 100%;
            min-height: calc(100vh - 56px);
          }
          .crm-main-content-area {
            padding: 1.25rem 1rem 3.5rem;
          }
        }
        @media (max-width: 640px) {
          .crm-main-content-area {
            padding: 1rem 0.75rem 4rem;
          }
          .mode-switch-banner {
            flex-direction: column;
            gap: 0.5rem;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
