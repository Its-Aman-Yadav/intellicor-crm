'use client';

import React, { useState, useEffect } from 'react';
import {
  getStoredFirebaseConfig,
  saveStoredFirebaseConfig,
  clearStoredFirebaseConfig,
  isFirestoreConfigured,
  syncAllLeadsToFirestore,
  FirebaseConfig,
} from '@/lib/firebase';
import { Lead } from '@/types/crm';
import {
  X,
  Database,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';

interface FirebaseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  onSyncComplete?: () => void;
}

export default function FirebaseSettingsModal({
  isOpen,
  onClose,
  leads,
  onSyncComplete,
}: FirebaseSettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [projectId, setProjectId] = useState('');
  const [authDomain, setAuthDomain] = useState('');
  const [storageBucket, setStorageBucket] = useState('');
  const [messagingSenderId, setMessagingSenderId] = useState('');
  const [appId, setAppId] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    const config = getStoredFirebaseConfig();
    if (config) {
      setApiKey(config.apiKey || '');
      setProjectId(config.projectId || '');
      setAuthDomain(config.authDomain || '');
      setStorageBucket(config.storageBucket || '');
      setMessagingSenderId(config.messagingSenderId || '');
      setAppId(config.appId || '');
      setIsConfigured(true);
    } else {
      setIsConfigured(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveConfig = () => {
    if (!apiKey.trim() || !projectId.trim()) {
      alert('API Key and Project ID are required to connect Cloud Firestore.');
      return;
    }

    const config: FirebaseConfig = {
      apiKey: apiKey.trim(),
      projectId: projectId.trim(),
      authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
      storageBucket: storageBucket.trim() || `${projectId.trim()}.appspot.com`,
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim(),
    };

    saveStoredFirebaseConfig(config);
    setIsConfigured(true);
    alert('Firebase configuration saved! Testing live connection...');
    window.location.reload();
  };

  const handleDisconnect = () => {
    if (confirm('Disconnect Firebase and revert back to browser Local Storage?')) {
      clearStoredFirebaseConfig();
      setApiKey('');
      setProjectId('');
      setAuthDomain('');
      setStorageBucket('');
      setMessagingSenderId('');
      setAppId('');
      setIsConfigured(false);
      alert('Disconnected Firebase. Reverted to Local Storage.');
      window.location.reload();
    }
  };

  const handleSyncToFirestore = async () => {
    setIsSyncing(true);
    setSyncStatusMsg(null);
    try {
      const count = await syncAllLeadsToFirestore(leads);
      setSyncStatusMsg(`Successfully pushed all ${count} leads to Cloud Firestore!`);
      if (onSyncComplete) onSyncComplete();
    } catch (err) {
      console.error(err);
      setSyncStatusMsg(
        'Sync failed. Please verify your Firestore rules allow write access, or check console.'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content firebase-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-left">
            <div className={`db-icon-badge ${isConfigured ? 'connected' : ''}`}>
              <Database size={20} />
            </div>
            <div>
              <h2 className="modal-title">Cloud Firestore Database</h2>
              <p className="modal-sub">
                Real-time multi-device cloud persistence for Intellicor sales reps
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon btn-secondary">
            <X size={16} />
          </button>
        </div>

        {/* Current Connection Status Banner */}
        <div className={`status-banner card ${isConfigured ? 'status-connected' : 'status-local'}`}>
          <div className="status-icon-row">
            {isConfigured ? (
              <CheckCircle2 size={18} className="text-success" />
            ) : (
              <AlertCircle size={18} className="text-warning" />
            )}
            <span className="status-title">
              {isConfigured
                ? `Connected to Firestore (Project: ${projectId})`
                : 'Running on Browser Local Storage'}
            </span>
          </div>
          <p className="status-desc">
            {isConfigured
              ? 'Your CRM is synchronized with Google Cloud Firestore. Any lead added or updated from phone or laptop syncs in real time.'
              : 'Data is currently stored locally in your browser. Enter your Firebase project keys below to enable Cloud Firestore synchronization across all team devices.'}
          </p>
        </div>

        {/* Sync Action (if configured) */}
        {isConfigured && (
          <div className="sync-card card">
            <div className="sync-left">
              <Cloud size={18} className="text-brand-blue" />
              <div>
                <span className="sync-title">Push Local Leads to Firestore</span>
                <p className="sync-sub">
                  Upload all current {leads.length} leads into your Cloud Firestore collection.
                </p>
              </div>
            </div>
            <button
              onClick={handleSyncToFirestore}
              disabled={isSyncing}
              className="btn btn-primary btn-sm sync-btn"
            >
              <RefreshCw size={13} className={isSyncing ? 'spin-anim' : ''} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>
        )}

        {syncStatusMsg && (
          <div
            className={`sync-result-box ${
              syncStatusMsg.includes('Successfully') ? 'success' : 'error'
            }`}
          >
            {syncStatusMsg}
          </div>
        )}

        {/* Credentials Form */}
        <div className="credentials-section">
          <div className="section-title-row">
            <h3 className="section-title">Firebase Web App Credentials</h3>
            <a
              href="https://console.firebase.google.com"
              target="_blank"
              rel="noreferrer"
              className="firebase-link"
            >
              <span>Firebase Console</span>
              <ExternalLink size={12} />
            </a>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Project ID *</label>
              <input
                type="text"
                placeholder="e.g. intellicor-crm"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">API Key (apiKey) *</label>
              <input
                type="text"
                placeholder="e.g. AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Auth Domain</label>
              <input
                type="text"
                placeholder="project-id.firebaseapp.com"
                value={authDomain}
                onChange={(e) => setAuthDomain(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">App ID (appId)</label>
              <input
                type="text"
                placeholder="1:123456789:web:abcdef"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div className="security-note">
            <ShieldCheck size={14} />
            <span>
              Credentials are saved securely in your browser session or can be configured via{' '}
              <code>.env.local</code>. Ensure your Firestore Security Rules permit read/write on the <code>leads</code> collection.
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          {isConfigured ? (
            <button
              type="button"
              onClick={handleDisconnect}
              className="btn btn-secondary text-danger-btn"
            >
              <RotateCcw size={14} /> Disconnect Firebase
            </button>
          ) : (
            <div />
          )}

          <div className="footer-right-buttons">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Close
            </button>
            <button
              type="button"
              onClick={handleSaveConfig}
              className="btn btn-primary"
            >
              <Save size={14} /> Save &amp; Connect Firestore
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .firebase-modal-dialog {
          max-width: 680px;
          padding: 1.5rem;
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border);
          padding-bottom: 0.85rem;
          margin-bottom: 1rem;
        }
        .modal-header-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .db-icon-badge {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background: #eff6ff;
          color: var(--brand-blue);
          border: 1px solid var(--brand-border);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .db-icon-badge.connected {
          background: #ecfdf5;
          color: #059669;
          border-color: #a7f3d0;
        }
        .modal-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--brand-navy);
        }
        .modal-sub {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .status-banner {
          padding: 0.95rem 1.15rem;
          margin-bottom: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .status-banner.status-connected {
          background: #f0fdf4;
          border-color: #a7f3d0;
        }
        .status-banner.status-local {
          background: #fffbeb;
          border-color: #fde68a;
        }
        .status-icon-row {
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }
        .status-title {
          font-weight: 700;
          font-size: 0.88rem;
          color: var(--brand-navy);
        }
        .status-desc {
          font-size: 0.78rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }
        .sync-card {
          padding: 0.85rem 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f8fafc;
          margin-bottom: 1rem;
        }
        .sync-left {
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }
        .sync-title {
          font-weight: 700;
          font-size: 0.84rem;
          color: var(--brand-navy);
          display: block;
        }
        .sync-sub {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .sync-btn {
          white-space: nowrap;
        }
        .spin-anim {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .sync-result-box {
          padding: 0.65rem 0.85rem;
          border-radius: var(--radius-sm);
          font-size: 0.78rem;
          margin-bottom: 1rem;
        }
        .sync-result-box.success {
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }
        .sync-result-box.error {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }
        .credentials-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .section-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .section-title {
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--brand-navy);
        }
        .firebase-link {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.75rem;
          color: var(--brand-blue);
          text-decoration: underline;
        }
        .security-note {
          display: flex;
          align-items: flex-start;
          gap: 0.45rem;
          font-size: 0.72rem;
          color: var(--text-muted);
          background: #f8fafc;
          padding: 0.55rem 0.75rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
        }
        .modal-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid var(--border);
          padding-top: 1rem;
          margin-top: 1rem;
        }
        .footer-right-buttons {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .text-danger-btn {
          color: #dc2626;
        }
        .text-danger-btn:hover {
          background: #fef2f2;
          border-color: #fecaca;
        }
        .text-success { color: #059669; }
        .text-warning { color: #d97706; }
        .text-brand-blue { color: #1e50bc; }
        @media (max-width: 600px) {
          .form-grid-2 {
            grid-template-columns: 1fr;
          }
          .sync-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
