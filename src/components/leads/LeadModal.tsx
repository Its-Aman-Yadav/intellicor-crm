'use client';

import React, { useState, useEffect } from 'react';
import {
  Lead,
  PipelineStage,
  PIPELINE_STAGES,
  CallResult,
  PackageName,
  QuotationStatus,
  ScoringSignals,
  INDUSTRIES,
  WhatsAppTemplate,
  CallOpenerScript,
  CommonObjection,
  CALL_OPENER_SCRIPTS,
  COMMON_OBJECTIONS,
} from '@/types/crm';
import {
  calculateLeadScore,
  determineLeadPriority,
  SCORING_MATRIX_RULES,
  PACKAGES,
  suggestPackage,
} from '@/lib/scoring';
import {
  formatTemplate,
  cleanPhoneNumber,
  createWhatsAppLink,
  getWhatsAppFollowUpCadence,
} from '@/lib/whatsapp';
import {
  X,
  Save,
  Trash2,
  Phone,
  PhoneCall,
  MessageCircle,
  Globe,
  MapPin,
  Flame,
  Clock,
  Sparkles,
  Calendar,
  CheckSquare,
  Square,
  Plus,
  Tag,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

interface LeadModalProps {
  lead?: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (lead: Lead) => void;
  onDelete?: (leadId: string) => void;
  templates: WhatsAppTemplate[];
  activeRep: string;
}

export default function LeadModal({
  lead,
  isOpen,
  onClose,
  onSave,
  onDelete,
  templates,
  activeRep,
}: LeadModalProps) {
  // Modal Tab state: 'details' | 'scoring' | 'cadence' | 'calls' | 'pricing'
  const [activeTab, setActiveTab] = useState<
    'details' | 'scoring' | 'cadence' | 'calls' | 'pricing'
  >('details');

  // Form State
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Mumbai');
  const [industry, setIndustry] = useState<string>(INDUSTRIES[0]);
  const [website, setWebsite] = useState('');
  const [googleProfile, setGoogleProfile] = useState('');
  const [instagram, setInstagram] = useState('');
  const [assignedRep, setAssignedRep] = useState('Aman');

  // Scoring Signals
  const [signals, setSignals] = useState<ScoringSignals>({
    noWebsite: false,
    badWebsite: false,
    poorGoogleProfile: false,
    inactiveInstagram: false,
    goodBusinessReputation: true,
    clearlySpendsOnMarketing: false,
    multipleBranches: false,
  });

  // Funnel & Activity
  const [status, setStatus] = useState<PipelineStage>('New');
  const [call1Date, setCall1Date] = useState('');
  const [callResult, setCallResult] = useState<CallResult | ''>('');
  const [requirement, setRequirement] = useState('');
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [whatsappSentDate, setWhatsappSentDate] = useState('');
  const [demoSent, setDemoSent] = useState(false);
  const [demoSentDate, setDemoSentDate] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [discoveryCallDate, setDiscoveryCallDate] = useState('');
  const [packageRecommended, setPackageRecommended] = useState<PackageName>('Growth');
  const [quotationStatus, setQuotationStatus] = useState<QuotationStatus>('Not Sent');
  const [expectedValue, setExpectedValue] = useState<number>(15000);
  const [notes, setNotes] = useState('');

  // Call Logs state
  const [callLogs, setCallLogs] = useState<Lead['callLogs']>([]);

  // New call log entry in calls tab
  const [newCallRep, setNewCallRep] = useState('Aman');
  const [newCallOpener, setNewCallOpener] = useState<CallOpenerScript>('Direct GBP Audit');
  const [newCallResult, setNewCallResult] = useState<CallResult>('Connected');
  const [newCallObjection, setNewCallObjection] = useState<CommonObjection | ''>('');
  const [newCallAskedWA, setNewCallAskedWA] = useState(false);
  const [newCallNotes, setNewCallNotes] = useState('');
  const [newCallNextFollowUp, setNewCallNextFollowUp] = useState('');

  // Package suggestion state
  const [packageSuggestion, setPackageSuggestion] = useState<ReturnType<typeof suggestPackage> | null>(null);

  useEffect(() => {
    if (lead) {
      setBusinessName(lead.businessName || '');
      setOwnerName(lead.ownerName || '');
      setPhone(lead.phone || '');
      setCity(lead.city || 'Mumbai');
      setIndustry(lead.industry || INDUSTRIES[0]);
      setWebsite(lead.website || '');
      setGoogleProfile(lead.googleProfile || '');
      setInstagram(lead.instagram || '');
      setAssignedRep(lead.assignedRep || activeRep || 'Aman');
      setSignals(lead.signals || {
        noWebsite: false,
        badWebsite: false,
        poorGoogleProfile: false,
        inactiveInstagram: false,
        goodBusinessReputation: true,
        clearlySpendsOnMarketing: false,
        multipleBranches: false,
      });
      setStatus(lead.status || 'New');
      setCall1Date(lead.call1Date || '');
      setCallResult(lead.callResult || '');
      setRequirement(lead.requirement || '');
      setWhatsappSent(lead.whatsappSent || false);
      setWhatsappSentDate(lead.whatsappSentDate || '');
      setDemoSent(lead.demoSent || false);
      setDemoSentDate(lead.demoSentDate || '');
      setFollowUpDate(lead.followUpDate || '');
      setDiscoveryCallDate(lead.discoveryCallDate || '');
      setPackageRecommended(lead.packageRecommended || 'Growth');
      setQuotationStatus(lead.quotationStatus || 'Not Sent');
      setExpectedValue(lead.expectedValue || 15000);
      setNotes(lead.notes || '');
      setCallLogs(lead.callLogs || []);
    } else {
      // New lead defaults
      setBusinessName('');
      setOwnerName('');
      setPhone('');
      setCity('Mumbai');
      setIndustry(INDUSTRIES[0]);
      setWebsite('');
      setGoogleProfile('');
      setInstagram('');
      setAssignedRep(activeRep !== 'All' && activeRep !== 'All Reps' ? activeRep : 'Aman');
      setSignals({
        noWebsite: false,
        badWebsite: false,
        poorGoogleProfile: false,
        inactiveInstagram: false,
        goodBusinessReputation: true,
        clearlySpendsOnMarketing: false,
        multipleBranches: false,
      });
      setStatus('New');
      setCall1Date('');
      setCallResult('');
      setRequirement('');
      setWhatsappSent(false);
      setWhatsappSentDate('');
      setDemoSent(false);
      setDemoSentDate('');
      setFollowUpDate(new Date().toISOString().slice(0, 10));
      setDiscoveryCallDate('');
      setPackageRecommended('Growth');
      setQuotationStatus('Not Sent');
      setExpectedValue(15000);
      setNotes('');
      setCallLogs([]);
    }
    setActiveTab('details');
  }, [lead, activeRep, isOpen]);

  if (!isOpen) return null;

  // Live Score Calculation
  const currentScore = calculateLeadScore(signals);
  const currentPriority = determineLeadPriority(currentScore);

  const toggleSignal = (key: keyof ScoringSignals) => {
    setSignals((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // If "no website" is checked, uncheck "bad website"
      if (key === 'noWebsite' && next.noWebsite) {
        next.badWebsite = false;
      }
      return next;
    });
  };

  const handleRunPackageRecommender = () => {
    const sug = suggestPackage(signals, notes + ' ' + requirement);
    setPackageSuggestion(sug);
    setPackageRecommended(sug.recommendedPackage);
    setExpectedValue(sug.recommendedSetup);
  };

  const handleAddCallLog = (e: React.FormEvent) => {
    e.preventDefault();
    const newLog = {
      id: `call-${Date.now()}`,
      leadId: lead?.id || 'temp',
      date: new Date().toISOString(),
      repName: newCallRep,
      openerScript: newCallOpener,
      result: newCallResult,
      objection: newCallObjection ? (newCallObjection as CommonObjection) : undefined,
      askedForWhatsApp: newCallAskedWA,
      notes: newCallNotes,
      nextFollowUpDate: newCallNextFollowUp || undefined,
    };

    setCallLogs([newLog, ...callLogs]);

    // Auto-update lead state
    if (!call1Date) {
      setCall1Date(new Date().toISOString().slice(0, 10));
    }
    setCallResult(newCallResult);
    if (newCallResult === 'Interested') {
      setStatus('Interested');
    } else if (status === 'New') {
      setStatus('Called');
    }
    if (newCallNextFollowUp) {
      setFollowUpDate(newCallNextFollowUp);
    }
    if (newCallAskedWA) {
      setWhatsappSent(true);
      setWhatsappSentDate(new Date().toISOString().slice(0, 10));
    }

    // Reset sub-form
    setNewCallNotes('');
    setNewCallObjection('');
    alert('Call attempt logged successfully!');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      alert('Business Name is required');
      return;
    }

    const savedLead: Lead = {
      id: lead?.id || `lead-${Date.now()}`,
      businessName: businessName.trim(),
      ownerName: ownerName.trim(),
      phone: phone.trim(),
      city: city.trim(),
      industry,
      website: website.trim(),
      googleProfile: googleProfile.trim(),
      instagram: instagram.trim(),
      signals,
      score: currentScore,
      priority: currentPriority,
      status,
      call1Date: call1Date || undefined,
      callResult: (callResult as CallResult) || undefined,
      requirement: requirement.trim(),
      whatsappSent,
      whatsappSentDate: whatsappSentDate || undefined,
      demoSent,
      demoSentDate: demoSentDate || undefined,
      followUpDate: followUpDate || undefined,
      discoveryCallDate: discoveryCallDate || undefined,
      packageRecommended,
      quotationStatus,
      expectedValue: Number(expectedValue) || 15000,
      notes: notes.trim(),
      callLogs,
      assignedRep,
      createdAt: lead?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(savedLead);
    onClose();
  };

  const cleanedPhone = cleanPhoneNumber(phone);
  const cadenceSteps = lead
    ? getWhatsAppFollowUpCadence(lead, templates)
    : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content lead-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="lead-modal-header">
          <div className="header-title-block">
            <div className="header-badge-row">
              <span
                className={`badge ${
                  currentPriority === 'HOT'
                    ? 'badge-hot'
                    : currentPriority === 'WARM'
                    ? 'badge-warm'
                    : 'badge-cold'
                }`}
              >
                {currentPriority === 'HOT' && <Flame size={12} />}
                {currentPriority} PRIORITY ({currentScore} PTS)
              </span>
              <span className={`stage-pill ${status.replace(/\s+/g, '')}`}>
                {status}
              </span>
            </div>
            <h2 className="lead-modal-title">
              {businessName || 'New Business Lead'}
            </h2>
            <p className="lead-modal-subtitle">
              {city} • {industry}
            </p>
          </div>

          <div className="header-actions">
            {phone && (
              <div className="quick-contact-actions">
                <a
                  href={`tel:${cleanedPhone}`}
                  className="btn btn-secondary btn-sm"
                  title="Call Phone"
                >
                  <Phone size={13} /> Dial
                </a>
                <a
                  href={`https://wa.me/${cleanedPhone}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm wa-btn-header"
                >
                  <MessageCircle size={13} /> WhatsApp
                </a>
              </div>
            )}
            <button onClick={onClose} className="btn-icon btn-secondary">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Tabs Bar */}
        <div className="modal-tabs-nav">
          <button
            onClick={() => setActiveTab('details')}
            className={`modal-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
          >
            Lead Record
          </button>
          <button
            onClick={() => setActiveTab('scoring')}
            className={`modal-tab-btn ${activeTab === 'scoring' ? 'active' : ''}`}
          >
            Scoring Matrix ({currentScore} pts)
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`modal-tab-btn ${activeTab === 'pricing' ? 'active' : ''}`}
          >
            Packages &amp; Offers
          </button>
          <button
            onClick={() => setActiveTab('cadence')}
            className={`modal-tab-btn ${activeTab === 'cadence' ? 'active' : ''}`}
          >
            WhatsApp Cadence {demoSent && '⚡'}
          </button>
          <button
            onClick={() => setActiveTab('calls')}
            className={`modal-tab-btn ${activeTab === 'calls' ? 'active' : ''}`}
          >
            Call History ({callLogs.length})
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="modal-form-body">
          {/* TAB 1: Core Details */}
          {activeTab === 'details' && (
            <div className="tab-content-grid">
              <div className="form-section-header">
                <h3>Business &amp; Contact Information</h3>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Business Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Dental Clinic"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Owner / Key Contact Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Sameer Joshi"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label className="form-label">Phone (WhatsApp enabled)</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai, Delhi NCR"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Industry Vertical</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="form-select"
                  >
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label className="form-label">Website URL</label>
                  <input
                    type="text"
                    placeholder="https://example.com (blank if none)"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Google Profile (GBP)</label>
                  <input
                    type="text"
                    placeholder="Google Maps / GBP link"
                    value={googleProfile}
                    onChange={(e) => setGoogleProfile(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Instagram Profile</label>
                  <input
                    type="text"
                    placeholder="https://instagram.com/handle"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-section-header" style={{ marginTop: '1rem' }}>
                <h3>Pipeline Stage &amp; Follow-up Cadence</h3>
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label className="form-label">Pipeline Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as PipelineStage)}
                    className="form-select"
                  >
                    {PIPELINE_STAGES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Follow-up Date (Task List)</label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Discovery Call Date / Time</label>
                  <input
                    type="datetime-local"
                    value={discoveryCallDate}
                    onChange={(e) => setDiscoveryCallDate(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group checkbox-block card">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={whatsappSent}
                      onChange={(e) => {
                        setWhatsappSent(e.target.checked);
                        if (e.target.checked && !whatsappSentDate) {
                          setWhatsappSentDate(new Date().toISOString().slice(0, 10));
                        }
                      }}
                    />
                    <span>WhatsApp Sent</span>
                  </label>
                  {whatsappSent && (
                    <input
                      type="date"
                      value={whatsappSentDate}
                      onChange={(e) => setWhatsappSentDate(e.target.value)}
                      className="form-input date-small"
                    />
                  )}
                </div>

                <div className="form-group checkbox-block card">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={demoSent}
                      onChange={(e) => {
                        setDemoSent(e.target.checked);
                        if (e.target.checked && !demoSentDate) {
                          setDemoSentDate(new Date().toISOString().slice(0, 10));
                        }
                        if (e.target.checked && status === 'Called') {
                          setStatus('Demo Sent');
                        }
                      }}
                    />
                    <span>Demo / Audit Sent (Starts Follow-up Cadence)</span>
                  </label>
                  {demoSent && (
                    <input
                      type="date"
                      value={demoSentDate}
                      onChange={(e) => setDemoSentDate(e.target.value)}
                      className="form-input date-small"
                    />
                  )}
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label className="form-label">Package Recommended</label>
                  <select
                    value={packageRecommended}
                    onChange={(e) => setPackageRecommended(e.target.value as PackageName)}
                    className="form-select"
                  >
                    <option value="Starter">Starter (₹8k–₹12k / ₹1.5k mo)</option>
                    <option value="Growth">Growth (₹15k–₹20k / ₹5k mo)</option>
                    <option value="Complete">Complete (₹25k–₹30k / ₹9k mo)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Quotation Status</label>
                  <select
                    value={quotationStatus}
                    onChange={(e) => setQuotationStatus(e.target.value as QuotationStatus)}
                    className="form-select"
                  >
                    <option value="Not Sent">Not Sent</option>
                    <option value="Sent">Sent</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Expected Deal Value (₹)</label>
                  <input
                    type="number"
                    value={expectedValue}
                    onChange={(e) => setExpectedValue(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Client Requirement Notes</label>
                <textarea
                  rows={2}
                  placeholder="Specific requirements from discovery questions..."
                  value={requirement}
                  onChange={(e) => setRequirement(e.target.value)}
                  className="form-textarea"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Internal Sales Notes</label>
                <textarea
                  rows={2}
                  placeholder="Free-form activity log, competitor comments, objections..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="form-textarea"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Scoring Matrix */}
          {activeTab === 'scoring' && (
            <div className="tab-scoring-wrapper">
              <div className="scoring-header-card card">
                <div className="scoring-score-display">
                  <span className="scoring-score-num">{currentScore}</span>
                  <span className="scoring-score-label">Total Points</span>
                </div>
                <div className="scoring-badge-display">
                  <span
                    className={`badge ${
                      currentPriority === 'HOT'
                        ? 'badge-hot'
                        : currentPriority === 'WARM'
                        ? 'badge-warm'
                        : 'badge-cold'
                    }`}
                    style={{ fontSize: '1rem', padding: '0.4rem 1rem' }}
                  >
                    {currentPriority === 'HOT' && <Flame size={16} />}
                    {currentPriority} PROSPECT
                  </span>
                  <p className="priority-explanation">
                    {currentPriority === 'HOT' &&
                      '8+ Points: High propensity to buy. Prioritize for immediate video audit & same-day follow-up.'}
                    {currentPriority === 'WARM' &&
                      '5–7 Points: Qualified potential. Pitch Growth package targeting their primary bottleneck.'}
                    {currentPriority === 'COLD' &&
                      '0–4 Points: Lower urgency or low immediate budget. Keep on nurturing list.'}
                  </p>
                </div>
              </div>

              <div className="signals-checklist-grid">
                {SCORING_MATRIX_RULES.map((rule) => {
                  const isChecked = signals[rule.key as keyof ScoringSignals];
                  return (
                    <div
                      key={rule.key}
                      onClick={() => toggleSignal(rule.key as keyof ScoringSignals)}
                      className={`signal-item-card card ${isChecked ? 'selected' : ''}`}
                    >
                      <div className="signal-checkbox">
                        {isChecked ? (
                          <CheckSquare size={20} className="check-icon" />
                        ) : (
                          <Square size={20} className="uncheck-icon" />
                        )}
                      </div>
                      <div className="signal-details">
                        <div className="signal-label-row">
                          <span className="signal-label">{rule.label}</span>
                          <span className="signal-points-tag">+{rule.points} pts</span>
                        </div>
                        <p className="signal-desc">{rule.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Packages & Smart Recommender */}
          {activeTab === 'pricing' && (
            <div className="tab-pricing-wrapper">
              <div className="recommender-banner card">
                <div className="recommender-text">
                  <div className="recommender-title-row">
                    <Sparkles size={18} className="sparkles-icon" />
                    <h4>Smart Package Recommender</h4>
                  </div>
                  <p className="recommender-sub">
                    Applies personalized-offer rules based on audit signals (e.g. no website → Starter, poor Google visibility → Growth, scaling branches → Complete).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRunPackageRecommender}
                  className="btn btn-primary"
                >
                  <Sparkles size={14} /> Suggest Package
                </button>
              </div>

              {packageSuggestion && (
                <div className="recommendation-result-box card">
                  <div className="rec-header">
                    <span className="rec-tag">Recommended:</span>
                    <span className="rec-name">{packageSuggestion.recommendedPackage}</span>
                    <span className="rec-price">
                      ₹{packageSuggestion.recommendedSetup.toLocaleString('en-IN')} setup + ₹
                      {packageSuggestion.recommendedMonthly.toLocaleString('en-IN')}/mo
                    </span>
                  </div>
                  <p className="rec-rationale">{packageSuggestion.rationale}</p>
                </div>
              )}

              <div className="packages-grid">
                {(['Starter', 'Growth', 'Complete'] as PackageName[]).map((pkgKey) => {
                  const pkg = PACKAGES[pkgKey];
                  const isSelected = packageRecommended === pkgKey;

                  return (
                    <div
                      key={pkgKey}
                      className={`card package-card ${isSelected ? 'selected' : ''}`}
                    >
                      <div className="package-card-header">
                        <h4 className="pkg-name">{pkg.name}</h4>
                        {isSelected && <span className="current-badge">Selected</span>}
                      </div>

                      <div className="pkg-price-row">
                        <span className="pkg-setup">
                          ₹{pkg.setupMin.toLocaleString('en-IN')}–₹{pkg.setupMax.toLocaleString('en-IN')}
                        </span>
                        <span className="pkg-setup-label">Setup Fee</span>
                      </div>

                      <div className="pkg-retainer-row">
                        <span className="pkg-monthly">
                          + ₹{pkg.monthly.toLocaleString('en-IN')}/mo
                        </span>
                        <span className="pkg-monthly-label">Monthly Retainer</span>
                      </div>

                      <div className="pkg-positioning-box">
                        <strong>Positioning:</strong> {pkg.positioning}
                      </div>

                      <p className="pkg-description">{pkg.description}</p>

                      <button
                        type="button"
                        onClick={() => {
                          setPackageRecommended(pkgKey);
                          setExpectedValue(pkg.setupMin);
                        }}
                        className={`btn btn-sm ${
                          isSelected ? 'btn-primary' : 'btn-secondary'
                        }`}
                        style={{ marginTop: 'auto' }}
                      >
                        {isSelected ? 'Selected' : `Choose ${pkgKey}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: WhatsApp Follow-Up Cadence */}
          {activeTab === 'cadence' && (
            <div className="tab-cadence-wrapper">
              <div className="cadence-info-card card">
                <div className="cadence-info-header">
                  <div className="cadence-title-row">
                    <MessageCircle size={18} className="wa-brand-icon" />
                    <h4>4-Stage WhatsApp Cadence Automation</h4>
                  </div>
                  <label className="checkbox-label" style={{ margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={demoSent}
                      onChange={(e) => {
                        setDemoSent(e.target.checked);
                        if (e.target.checked && !demoSentDate) {
                          setDemoSentDate(new Date().toISOString().slice(0, 10));
                        }
                      }}
                    />
                    <span>Demo Sent Active</span>
                  </label>
                </div>
                <p className="cadence-desc">
                  Auto-generates follow-ups on Day 1, 3, 7, and 15 after Demo Sent. Stops automatically if prospect moves to Discovery Call or Won/Lost.
                </p>
              </div>

              {!demoSent ? (
                <div className="cadence-inactive-state card">
                  <AlertCircle size={24} className="alert-icon" />
                  <p className="inactive-title">Cadence is not active yet</p>
                  <p className="inactive-sub">
                    Check &quot;Demo Sent&quot; when you deliver a video audit or website mockup to initiate the automated Day 1, 3, 7, 15 follow-up sequence.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setDemoSent(true);
                      setDemoSentDate(new Date().toISOString().slice(0, 10));
                    }}
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: '0.5rem' }}
                  >
                    Mark Demo Sent Today
                  </button>
                </div>
              ) : (
                <div className="cadence-timeline">
                  {templates.map((tmpl) => {
                    const demoDate = demoSentDate ? new Date(demoSentDate) : new Date();
                    const dueDate = new Date(demoDate);
                    dueDate.setDate(dueDate.getDate() + tmpl.day);
                    const dueDateFormatted = dueDate.toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });

                    // Interpolate message for this lead
                    const dummyLead: Lead = {
                      id: lead?.id || 'temp',
                      businessName: businessName || 'Your Business',
                      ownerName: ownerName || 'Business Owner',
                      phone,
                      city,
                      industry,
                      website,
                      googleProfile,
                      instagram,
                      signals,
                      score: currentScore,
                      priority: currentPriority,
                      status,
                      whatsappSent,
                      demoSent,
                      quotationStatus,
                      expectedValue,
                      notes,
                      callLogs,
                      assignedRep,
                      createdAt: '',
                      updatedAt: '',
                      packageRecommended,
                    };

                    const formattedMsg = formatTemplate(tmpl.template, dummyLead, assignedRep);
                    const waLink = createWhatsAppLink(phone, formattedMsg);

                    return (
                      <div key={tmpl.id} className="cadence-step-card card">
                        <div className="step-header">
                          <div className="step-badge-group">
                            <span className="step-day-pill">Day {tmpl.day}</span>
                            <span className="step-due-date">Due: {dueDateFormatted}</span>
                          </div>
                          <span className="step-purpose-text">{tmpl.purpose}</span>
                        </div>

                        <div className="step-message-box">
                          <p className="step-msg-content">{formattedMsg}</p>
                        </div>

                        <div className="step-actions-row">
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-primary btn-sm wa-send-action"
                          >
                            <MessageCircle size={13} /> Send on WhatsApp
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(formattedMsg);
                              alert('Message template copied to clipboard!');
                            }}
                            className="btn btn-secondary btn-sm"
                          >
                            Copy Message
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Call History Log */}
          {activeTab === 'calls' && (
            <div className="tab-calls-wrapper">
              {/* Add Call Log Sub-form */}
              <div className="new-call-card card">
                <div className="new-call-header">
                  <PhoneCall size={16} className="call-blue-icon" />
                  <h4>Log New Call Attempt</h4>
                </div>

                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Sales Rep</label>
                    <input
                      type="text"
                      value={newCallRep}
                      onChange={(e) => setNewCallRep(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Opener / Script Variant</label>
                    <select
                      value={newCallOpener}
                      onChange={(e) => setNewCallOpener(e.target.value as CallOpenerScript)}
                      className="form-select"
                    >
                      {CALL_OPENER_SCRIPTS.map((script) => (
                        <option key={script} value={script}>
                          {script}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Call Result</label>
                    <select
                      value={newCallResult}
                      onChange={(e) => setNewCallResult(e.target.value as CallResult)}
                      className="form-select"
                    >
                      <option value="Connected">Connected</option>
                      <option value="Interested">Interested</option>
                      <option value="Callback">Callback</option>
                      <option value="No Answer">No Answer</option>
                      <option value="Not Interested">Not Interested</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Objection (If Any)</label>
                    <select
                      value={newCallObjection}
                      onChange={(e) => setNewCallObjection(e.target.value as CommonObjection | '')}
                      className="form-select"
                    >
                      <option value="">No Objection</option>
                      {COMMON_OBJECTIONS.map((obj) => (
                        <option key={obj} value={obj}>
                          {obj}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Next Callback Date</label>
                    <input
                      type="date"
                      value={newCallNextFollowUp}
                      onChange={(e) => setNewCallNextFollowUp(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={newCallAskedWA}
                      onChange={(e) => setNewCallAskedWA(e.target.checked)}
                    />
                    <span>Prospect asked to send video audit / details over WhatsApp</span>
                  </label>
                </div>

                <div className="form-group">
                  <label className="form-label">Call Notes</label>
                  <input
                    type="text"
                    placeholder="Short summary of discussion..."
                    value={newCallNotes}
                    onChange={(e) => setNewCallNotes(e.target.value)}
                    className="form-input"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddCallLog}
                  className="btn btn-primary btn-sm"
                  style={{ alignSelf: 'flex-start' }}
                >
                  <Plus size={14} /> Add Attempt to History
                </button>
              </div>

              {/* History List */}
              <div className="calls-history-list">
                <h4 className="history-title">Call Attempts Log ({callLogs.length})</h4>
                {callLogs.length === 0 ? (
                  <p className="no-calls-text">No previous call attempts logged for this lead.</p>
                ) : (
                  callLogs.map((log) => {
                    const dateFormatted = new Date(log.date).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div key={log.id} className="call-history-item card">
                        <div className="call-log-header">
                          <div className="call-log-left">
                            <span className="call-result-pill">{log.result}</span>
                            <span className="call-rep-name">by {log.repName}</span>
                            <span className="call-script-tag">{log.openerScript}</span>
                          </div>
                          <span className="call-date-text">{dateFormatted}</span>
                        </div>

                        {log.objection && (
                          <div className="call-objection-tag">
                            <Tag size={11} /> Objection: {log.objection}
                          </div>
                        )}

                        {log.askedForWhatsApp && (
                          <div className="call-wa-tag">
                            <MessageCircle size={11} /> Asked for WhatsApp
                          </div>
                        )}

                        {log.notes && <p className="call-notes-text">&quot;{log.notes}&quot;</p>}

                        {log.nextFollowUpDate && (
                          <div className="call-next-date">
                            <Clock size={11} /> Callback Scheduled: {log.nextFollowUpDate}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Modal Bottom Bar */}
          <div className="lead-modal-footer">
            {lead && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Delete lead ${businessName}?`)) {
                    onDelete(lead.id);
                    onClose();
                  }
                }}
                className="btn btn-secondary delete-lead-btn"
              >
                <Trash2 size={14} /> Delete Lead
              </button>
            )}

            <div className="footer-right-buttons">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary save-lead-btn">
                <Save size={15} /> Save Lead Record
              </button>
            </div>
          </div>
        </form>
      </div>

      <style jsx>{`
        .lead-modal-container {
          max-width: 860px;
          display: flex;
          flex-direction: column;
        }
        .lead-modal-header {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          background: #fafbfc;
        }
        .header-title-block {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .header-badge-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .lead-modal-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--brand-navy);
        }
        .lead-modal-subtitle {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .quick-contact-actions {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .wa-btn-header {
          color: #059669;
        }
        .wa-btn-header:hover {
          background: #ecfdf5;
          border-color: #a7f3d0;
        }
        .modal-tabs-nav {
          display: flex;
          border-bottom: 1px solid var(--border);
          background: #ffffff;
          padding: 0 1rem;
          overflow-x: auto;
        }
        .modal-tab-btn {
          padding: 0.75rem 1rem;
          font-size: 0.84rem;
          font-weight: 500;
          color: var(--text-secondary);
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
        }
        .modal-tab-btn:hover {
          color: var(--brand-blue);
        }
        .modal-tab-btn.active {
          color: var(--brand-blue);
          border-bottom-color: var(--brand-blue);
          font-weight: 600;
        }
        .modal-form-body {
          padding: 1.25rem 1.5rem;
          overflow-y: auto;
          max-height: calc(88vh - 150px);
        }
        .form-section-header {
          margin-bottom: 0.85rem;
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: 0.35rem;
        }
        .form-section-header h3 {
          font-size: 0.92rem;
          font-weight: 700;
          color: var(--brand-navy);
        }
        .form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.85rem;
        }
        .form-grid-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 0.85rem;
        }
        .checkbox-block {
          padding: 0.75rem 0.95rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-primary);
          cursor: pointer;
        }
        .date-small {
          padding: 0.35rem 0.5rem;
          font-size: 0.78rem;
        }
        /* TAB 2: Scoring Styles */
        .tab-scoring-wrapper {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .scoring-header-card {
          padding: 1.25rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 1.5rem;
          background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);
          border-left: 4px solid var(--brand-blue);
        }
        .scoring-score-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 90px;
          border-right: 1px solid var(--border);
          padding-right: 1.25rem;
        }
        .scoring-score-num {
          font-size: 2.4rem;
          font-weight: 800;
          color: var(--brand-navy);
          line-height: 1;
        }
        .scoring-score-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .scoring-badge-display {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .priority-explanation {
          font-size: 0.82rem;
          color: var(--text-secondary);
        }
        .signals-checklist-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }
        .signal-item-card {
          padding: 0.85rem;
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .signal-item-card:hover {
          border-color: #cbd5e1;
        }
        .signal-item-card.selected {
          border-color: var(--brand-border);
          background: #f8fbff;
        }
        .check-icon {
          color: var(--brand-blue);
        }
        .uncheck-icon {
          color: var(--text-muted);
        }
        .signal-details {
          flex: 1;
        }
        .signal-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.2rem;
        }
        .signal-label {
          font-weight: 700;
          font-size: 0.85rem;
          color: var(--brand-navy);
        }
        .signal-points-tag {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--brand-blue);
          background: var(--brand-light);
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
        }
        .signal-desc {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        /* TAB 3: Pricing Styles */
        .tab-pricing-wrapper {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .recommender-banner {
          padding: 1rem 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #eff6ff;
          border: 1px solid var(--brand-border);
          gap: 1rem;
        }
        .recommender-title-row {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          color: var(--brand-blue);
          font-weight: 700;
        }
        .recommender-sub {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .recommendation-result-box {
          padding: 1rem;
          background: #f0fdf4;
          border: 1px solid #a7f3d0;
        }
        .rec-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.35rem;
        }
        .rec-tag {
          font-size: 0.75rem;
          font-weight: 700;
          color: #065f46;
          text-transform: uppercase;
        }
        .rec-name {
          font-size: 1rem;
          font-weight: 800;
          color: #047857;
        }
        .rec-price {
          font-size: 0.85rem;
          font-weight: 600;
          color: #065f46;
        }
        .rec-rationale {
          font-size: 0.8rem;
          color: #065f46;
        }
        .packages-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.85rem;
        }
        .package-card {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
          border: 1px solid var(--border);
        }
        .package-card.selected {
          border: 2px solid var(--brand-blue);
          background: #fafcff;
        }
        .package-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .pkg-name {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--brand-navy);
        }
        .current-badge {
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--brand-blue);
          background: #eff6ff;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
        }
        .pkg-price-row {
          display: flex;
          align-items: baseline;
          gap: 0.4rem;
        }
        .pkg-setup {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text-primary);
        }
        .pkg-setup-label {
          font-size: 0.72rem;
          color: var(--text-muted);
        }
        .pkg-retainer-row {
          display: flex;
          align-items: baseline;
          gap: 0.4rem;
        }
        .pkg-monthly {
          font-size: 0.95rem;
          font-weight: 700;
          color: #059669;
        }
        .pkg-monthly-label {
          font-size: 0.72rem;
          color: var(--text-muted);
        }
        .pkg-positioning-box {
          font-size: 0.75rem;
          color: var(--text-secondary);
          background: #f8fafc;
          padding: 0.35rem 0.5rem;
          border-radius: 4px;
        }
        .pkg-description {
          font-size: 0.76rem;
          color: var(--text-muted);
          line-height: 1.35;
        }
        /* TAB 4: Cadence Styles */
        .tab-cadence-wrapper {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .cadence-info-card {
          padding: 1rem 1.25rem;
        }
        .cadence-info-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.35rem;
        }
        .cadence-title-row {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          color: var(--brand-navy);
          font-weight: 700;
        }
        .wa-brand-icon {
          color: #10b981;
        }
        .cadence-desc {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .cadence-inactive-state {
          padding: 3rem 1.5rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
        .alert-icon {
          color: var(--text-muted);
        }
        .inactive-title {
          font-weight: 700;
          color: var(--brand-navy);
        }
        .inactive-sub {
          font-size: 0.82rem;
          color: var(--text-muted);
          max-width: 460px;
        }
        .cadence-timeline {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .cadence-step-card {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }
        .step-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .step-badge-group {
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }
        .step-day-pill {
          font-size: 0.72rem;
          font-weight: 700;
          background: #ecfdf5;
          color: #059669;
          border: 1px solid #a7f3d0;
          padding: 0.15rem 0.5rem;
          border-radius: var(--radius-full);
        }
        .step-due-date {
          font-size: 0.78rem;
          color: var(--text-muted);
        }
        .step-purpose-text {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .step-message-box {
          background: #f8fafc;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 0.75rem 0.85rem;
        }
        .step-msg-content {
          font-size: 0.82rem;
          color: var(--text-primary);
          line-height: 1.45;
        }
        .step-actions-row {
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }
        .wa-send-action {
          background: #10b981;
          border-color: #10b981;
          color: #ffffff;
        }
        .wa-send-action:hover {
          background: #059669;
          border-color: #059669;
        }
        /* TAB 5: Calls Styles */
        .tab-calls-wrapper {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .new-call-card {
          padding: 1.15rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          background: #fcfdfe;
          border: 1px solid #cbd5e1;
        }
        .new-call-header {
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }
        .new-call-header h4 {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--brand-navy);
        }
        .call-blue-icon {
          color: var(--brand-blue);
        }
        .calls-history-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .history-title {
          font-size: 0.92rem;
          font-weight: 700;
          color: var(--brand-navy);
        }
        .no-calls-text {
          font-size: 0.82rem;
          color: var(--text-muted);
          font-style: italic;
        }
        .call-history-item {
          padding: 0.85rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .call-log-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .call-log-left {
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }
        .call-result-pill {
          font-size: 0.72rem;
          font-weight: 700;
          color: #1e50bc;
          background: #eff6ff;
          padding: 0.1rem 0.45rem;
          border-radius: 4px;
        }
        .call-rep-name {
          font-size: 0.76rem;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .call-script-tag {
          font-size: 0.72rem;
          color: var(--text-muted);
          background: #f1f5f9;
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
        }
        .call-date-text {
          font-size: 0.74rem;
          color: var(--text-muted);
        }
        .call-objection-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.73rem;
          color: #b91c1c;
          background: #fef2f2;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          width: fit-content;
        }
        .call-wa-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.73rem;
          color: #047857;
          background: #ecfdf5;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          width: fit-content;
        }
        .call-notes-text {
          font-size: 0.8rem;
          color: var(--text-primary);
          font-style: italic;
        }
        .call-next-date {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.74rem;
          color: #d97706;
          font-weight: 600;
        }
        /* Footer */
        .lead-modal-footer {
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #fafbfc;
        }
        .footer-right-buttons {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-left: auto;
        }
        .delete-lead-btn {
          color: #dc2626;
        }
        .delete-lead-btn:hover {
          background: #fef2f2;
          border-color: #fecaca;
        }
        @media (max-width: 768px) {
          .form-grid-2,
          .form-grid-3,
          .signals-checklist-grid,
          .packages-grid {
            grid-template-columns: 1fr;
          }
          .scoring-header-card {
            flex-direction: column;
            align-items: flex-start;
          }
          .scoring-score-display {
            border-right: none;
            border-bottom: 1px solid var(--border);
            padding-bottom: 0.75rem;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
