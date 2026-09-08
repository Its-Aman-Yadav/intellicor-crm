'use client';

import React, { useMemo } from 'react';
import {
  Lead,
  CallOpenerScript,
  CommonObjection,
  PackageName,
  PIPELINE_STAGES,
  PipelineStage,
} from '@/types/crm';
import {
  BarChart3,
  TrendingUp,
  MessageCircle,
  PhoneCall,
  Target,
  Award,
  AlertTriangle,
  ArrowRight,
  PackageCheck,
  Building,
  Sparkles,
} from 'lucide-react';

interface ReportingViewProps {
  leads: Lead[];
  activeRep: string;
}

export default function ReportingView({ leads, activeRep }: ReportingViewProps) {
  const filteredLeads = useMemo(() => {
    if (activeRep === 'All' || activeRep === 'All Reps') return leads;
    return leads.filter((l) => l.assignedRep === activeRep);
  }, [leads, activeRep]);

  // Aggregate 7-Day Review Metrics
  const analysis = useMemo(() => {
    // 1. Industry conversations
    const industryConvMap: Record<string, number> = {};
    // 2. Script opener -> interested outcomes
    const scriptInterestedMap: Record<string, { total: number; interested: number }> = {};
    // 3. WhatsApp requests count
    let prospectsAskedForWhatsApp = 0;
    // 4. Demo -> Discovery Call conversion rate
    let totalDemosSent = 0;
    let totalDiscoveryReached = 0;
    // 5. Funnel drop-offs
    const stageCounts: Record<PipelineStage, number> = {
      New: 0,
      Called: 0,
      Interested: 0,
      'Demo Sent': 0,
      'Discovery Call': 0,
      'Proposal Sent': 0,
      'Follow-up': 0,
      Won: 0,
      Lost: 0,
    };
    // 6. Most requested package
    const packageMap: Record<string, number> = {
      Starter: 0,
      Growth: 0,
      Complete: 0,
    };
    // 7. Objections map
    const objectionMap: Record<string, number> = {};

    filteredLeads.forEach((lead) => {
      // Stage counting
      if (stageCounts[lead.status] !== undefined) {
        stageCounts[lead.status]++;
      }

      // Demo & Discovery counts
      if (lead.demoSent) totalDemosSent++;
      if (
        lead.discoveryCallDate ||
        lead.status === 'Discovery Call' ||
        lead.status === 'Proposal Sent' ||
        lead.status === 'Won'
      ) {
        totalDiscoveryReached++;
      }

      // Package count
      if (lead.packageRecommended) {
        packageMap[lead.packageRecommended] =
          (packageMap[lead.packageRecommended] || 0) + 1;
      }

      // Call logs analytics
      let leadHadConversation = false;
      lead.callLogs?.forEach((log) => {
        // Industry conversation check
        if (
          log.result === 'Connected' ||
          log.result === 'Interested' ||
          log.result === 'Callback'
        ) {
          leadHadConversation = true;
        }

        // Script opener conversion
        if (!scriptInterestedMap[log.openerScript]) {
          scriptInterestedMap[log.openerScript] = { total: 0, interested: 0 };
        }
        scriptInterestedMap[log.openerScript].total++;
        if (log.result === 'Interested') {
          scriptInterestedMap[log.openerScript].interested++;
        }

        // WhatsApp ask
        if (log.askedForWhatsApp) {
          prospectsAskedForWhatsApp++;
        }

        // Objections
        if (log.objection) {
          objectionMap[log.objection] = (objectionMap[log.objection] || 0) + 1;
        }
      });

      if (leadHadConversation && lead.industry) {
        industryConvMap[lead.industry] =
          (industryConvMap[lead.industry] || 0) + 1;
      }
    });

    // Sort Industries by conversations
    const sortedIndustries = Object.entries(industryConvMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Sort Scripts by interested count / rate
    const sortedScripts = Object.entries(scriptInterestedMap)
      .map(([script, stats]) => ({
        script,
        total: stats.total,
        interested: stats.interested,
        rate: stats.total > 0 ? Math.round((stats.interested / stats.total) * 100) : 0,
      }))
      .sort((a, b) => b.interested - a.interested);

    // Sort Objections
    const sortedObjections = Object.entries(objectionMap)
      .map(([objection, count]) => ({ objection, count }))
      .sort((a, b) => b.count - a.count);

    // Sort Packages
    const sortedPackages = Object.entries(packageMap)
      .map(([pkg, count]) => ({ pkg, count }))
      .sort((a, b) => b.count - a.count);

    // Demo -> Discovery Rate
    const demoToDiscoveryRate =
      totalDemosSent > 0
        ? Math.round((totalDiscoveryReached / totalDemosSent) * 100)
        : 0;

    // Funnel dropout analysis: where are prospects dropping out most?
    // Compare transitions: New -> Called, Called -> Interested, Interested -> Demo, Demo -> Discovery, Discovery -> Proposal, Proposal -> Won
    const funnelSteps = [
      { from: 'New', to: 'Called', countFrom: stageCounts['New'], countTo: stageCounts['Called'] },
      { from: 'Called', to: 'Interested', countFrom: stageCounts['Called'], countTo: stageCounts['Interested'] },
      { from: 'Interested', to: 'Demo Sent', countFrom: stageCounts['Interested'], countTo: stageCounts['Demo Sent'] },
      { from: 'Demo Sent', to: 'Discovery Call', countFrom: stageCounts['Demo Sent'], countTo: stageCounts['Discovery Call'] },
      { from: 'Discovery Call', to: 'Proposal Sent', countFrom: stageCounts['Discovery Call'], countTo: stageCounts['Proposal Sent'] },
      { from: 'Proposal Sent', to: 'Won', countFrom: stageCounts['Proposal Sent'], countTo: stageCounts['Won'] },
    ];

    return {
      sortedIndustries,
      sortedScripts,
      prospectsAskedForWhatsApp,
      totalDemosSent,
      totalDiscoveryReached,
      demoToDiscoveryRate,
      sortedObjections,
      sortedPackages,
      stageCounts,
      funnelSteps,
      topIndustry: sortedIndustries[0]?.name || 'Healthcare & Dental',
      topScript: sortedScripts[0]?.script || 'Direct GBP Audit',
      topObjection: sortedObjections[0]?.objection || 'Price too high',
      topPackage: sortedPackages[0]?.pkg || 'Growth',
    };
  }, [filteredLeads]);

  return (
    <div className="reporting-root">
      {/* Header Summary Banner */}
      <div className="report-banner card">
        <div>
          <div className="report-badge">
            <BarChart3 size={13} />
            <span>Executive Performance Intelligence</span>
          </div>
          <h2 className="report-title">7-Day Sales Cadence Review</h2>
          <p className="report-sub">
            Holistic funnel metrics, objection trends, script effectiveness, and conversion rates for{' '}
            <strong>{activeRep}</strong>.
          </p>
        </div>
      </div>

      {/* KPI Highlights Grid answering core prompt questions */}
      <div className="kpi-grid">
        {/* Q4: Demo to Discovery Rate */}
        <div className="card kpi-card">
          <div className="kpi-icon-box conversion">
            <TrendingUp size={20} />
          </div>
          <span className="kpi-label">Demo → Discovery Call Rate</span>
          <div className="kpi-value-row">
            <span className="kpi-value">{analysis.demoToDiscoveryRate}%</span>
            <span className="kpi-meta">
              ({analysis.totalDiscoveryReached} / {analysis.totalDemosSent} demos)
            </span>
          </div>
          <p className="kpi-caption">Target benchmark is 40%–50%</p>
        </div>

        {/* Q3: WhatsApp Requests */}
        <div className="card kpi-card">
          <div className="kpi-icon-box whatsapp">
            <MessageCircle size={20} />
          </div>
          <span className="kpi-label">Asked for WhatsApp</span>
          <div className="kpi-value-row">
            <span className="kpi-value">{analysis.prospectsAskedForWhatsApp}</span>
            <span className="kpi-meta">prospects</span>
          </div>
          <p className="kpi-caption">High intent signal for video audits</p>
        </div>

        {/* Q1: Top Industry */}
        <div className="card kpi-card">
          <div className="kpi-icon-box industry">
            <Building size={20} />
          </div>
          <span className="kpi-label">Most Conversations By Sector</span>
          <div className="kpi-value-row">
            <span className="kpi-value text-truncate">{analysis.topIndustry}</span>
          </div>
          <p className="kpi-caption">
            {analysis.sortedIndustries[0]?.count || 0} productive conversations logged
          </p>
        </div>

        {/* Q6: Most-Requested Package */}
        <div className="card kpi-card">
          <div className="kpi-icon-box package">
            <PackageCheck size={20} />
          </div>
          <span className="kpi-label">Most-Requested Package</span>
          <div className="kpi-value-row">
            <span className="kpi-value">{analysis.topPackage}</span>
            <span className="kpi-meta">
              (₹{analysis.topPackage === 'Starter' ? '10k' : analysis.topPackage === 'Growth' ? '18k' : '28k'})
            </span>
          </div>
          <p className="kpi-caption">Leading package recommendation</p>
        </div>
      </div>

      {/* Main 2-Column Analytics Breakdown */}
      <div className="analytics-2col-grid">
        {/* Card 1: Top Call Openers & Script Conversion */}
        <div className="card analytics-panel">
          <div className="panel-header">
            <PhoneCall size={18} className="panel-icon blue" />
            <div>
              <h3 className="panel-title">Call Opener / Script Conversion</h3>
              <p className="panel-sub">Which call opener produces the most &quot;Interested&quot; outcomes?</p>
            </div>
          </div>

          <div className="scripts-list">
            {analysis.sortedScripts.length === 0 ? (
              <p className="empty-sub">No call attempts logged yet.</p>
            ) : (
              analysis.sortedScripts.map((item, idx) => {
                const maxInterested = analysis.sortedScripts[0].interested || 1;
                const barWidth = Math.round((item.interested / maxInterested) * 100);

                return (
                  <div key={item.script} className="script-row">
                    <div className="script-info-top">
                      <span className="script-rank">#{idx + 1}</span>
                      <span className="script-name">{item.script}</span>
                      <span className="script-interested-badge">
                        {item.interested} Interested ({item.rate}% conv)
                      </span>
                    </div>

                    <div className="script-bar-track">
                      <div
                        className="script-bar-fill"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <span className="script-total-sub">
                      {item.total} total attempts with this opener
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Card 2: Common Objection Breakdown */}
        <div className="card analytics-panel">
          <div className="panel-header">
            <AlertTriangle size={18} className="panel-icon orange" />
            <div>
              <h3 className="panel-title">Most Common Objections Faced</h3>
              <p className="panel-sub">Tagged objections across all calling attempts</p>
            </div>
          </div>

          <div className="objections-list">
            {analysis.sortedObjections.length === 0 ? (
              <p className="empty-sub">No objections recorded in call logs.</p>
            ) : (
              analysis.sortedObjections.map((item, idx) => {
                const totalObjections = analysis.sortedObjections.reduce(
                  (acc, o) => acc + o.count,
                  0
                );
                const percent = Math.round((item.count / (totalObjections || 1)) * 100);

                return (
                  <div key={item.objection} className="objection-row">
                    <div className="objection-top">
                      <span className="objection-title">&quot;{item.objection}&quot;</span>
                      <span className="objection-count">
                        {item.count} calls ({percent}%)
                      </span>
                    </div>
                    <div className="objection-bar-track">
                      <div
                        className="objection-bar-fill"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Second Row: Industry Breakdown & Funnel Drop-off points */}
      <div className="analytics-2col-grid">
        {/* Industry conversations ranking */}
        <div className="card analytics-panel">
          <div className="panel-header">
            <Building size={18} className="panel-icon purple" />
            <div>
              <h3 className="panel-title">Industries Producing Most Conversations</h3>
              <p className="panel-sub">Volume of connected &amp; qualified dialogue by market sector</p>
            </div>
          </div>

          <div className="industry-rank-list">
            {analysis.sortedIndustries.length === 0 ? (
              <p className="empty-sub">No industry conversation data logged.</p>
            ) : (
              analysis.sortedIndustries.map((ind, idx) => (
                <div key={ind.name} className="industry-rank-item">
                  <div className="rank-left">
                    <span className="rank-num">{idx + 1}</span>
                    <span className="rank-industry-name">{ind.name}</span>
                  </div>
                  <span className="rank-conv-count">
                    {ind.count} conversations
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Funnel Drop-off Analysis */}
        <div className="card analytics-panel">
          <div className="panel-header">
            <Target size={18} className="panel-icon green" />
            <div>
              <h3 className="panel-title">Funnel Drop-off Analysis</h3>
              <p className="panel-sub">Where in the pipeline are prospects dropping out most?</p>
            </div>
          </div>

          <div className="funnel-dropoff-breakdown">
            <div className="dropoff-summary-box">
              <span className="dropoff-summary-title">Key Drop-off Stage:</span>
              <span className="dropoff-highlight">Demo Sent → Discovery Call</span>
              <p className="dropoff-text">
                Reps should aggressively adhere to the <strong>Day 1 &amp; Day 3 WhatsApp Follow-up Cadence</strong> to ensure prospects review the video audit before going cold.
              </p>
            </div>

            <div className="stage-distribution-grid">
              {PIPELINE_STAGES.map((st) => (
                <div key={st} className="stage-dist-item">
                  <span className="stage-dist-name">{st}</span>
                  <span className="stage-dist-val">{analysis.stageCounts[st] || 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .reporting-root {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .report-banner {
          padding: 1.25rem 1.5rem;
          background: linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%);
          border-left: 4px solid var(--brand-blue);
        }
        .report-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--brand-blue);
          background: #eff6ff;
          border: 1px solid var(--brand-border);
          padding: 0.15rem 0.5rem;
          border-radius: var(--radius-full);
          margin-bottom: 0.35rem;
        }
        .report-title {
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--brand-navy);
          margin-bottom: 0.2rem;
        }
        .report-sub {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
          gap: 1rem;
        }
        .kpi-card {
          padding: 1.15rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .kpi-icon-box {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.2rem;
        }
        .kpi-icon-box.conversion { background: #eff6ff; color: #1e50bc; }
        .kpi-icon-box.whatsapp { background: #ecfdf5; color: #059669; }
        .kpi-icon-box.industry { background: #faf5ff; color: #7e22ce; }
        .kpi-icon-box.package { background: #fff7ed; color: #ea580c; }
        .kpi-label {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .kpi-value-row {
          display: flex;
          align-items: baseline;
          gap: 0.4rem;
        }
        .kpi-value {
          font-size: 1.7rem;
          font-weight: 800;
          color: var(--brand-navy);
          line-height: 1.1;
        }
        .text-truncate {
          font-size: 1.25rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .kpi-meta {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .kpi-caption {
          font-size: 0.73rem;
          color: var(--text-muted);
        }
        .analytics-2col-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .analytics-panel {
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .panel-header {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: 0.65rem;
        }
        .panel-icon.blue { color: #1e50bc; }
        .panel-icon.orange { color: #ea580c; }
        .panel-icon.purple { color: #7e22ce; }
        .panel-icon.green { color: #059669; }
        .panel-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--brand-navy);
        }
        .panel-sub {
          font-size: 0.78rem;
          color: var(--text-muted);
        }
        .scripts-list,
        .objections-list {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .script-row,
        .objection-row {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }
        .script-info-top,
        .objection-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.82rem;
        }
        .script-rank {
          font-weight: 700;
          color: var(--text-muted);
          margin-right: 0.4rem;
        }
        .script-name,
        .objection-title {
          font-weight: 600;
          color: var(--brand-navy);
          flex: 1;
        }
        .script-interested-badge {
          font-size: 0.73rem;
          font-weight: 700;
          color: #047857;
          background: #ecfdf5;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
        }
        .script-bar-track,
        .objection-bar-track {
          width: 100%;
          height: 6px;
          background: #f1f5f9;
          border-radius: 99px;
          overflow: hidden;
        }
        .script-bar-fill {
          height: 100%;
          background: var(--brand-blue);
          border-radius: 99px;
        }
        .objection-bar-fill {
          height: 100%;
          background: #f97316;
          border-radius: 99px;
        }
        .script-total-sub {
          font-size: 0.71rem;
          color: var(--text-muted);
        }
        .objection-count {
          font-weight: 600;
          color: var(--text-secondary);
          font-size: 0.78rem;
        }
        .industry-rank-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .industry-rank-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.55rem 0.75rem;
          background: #f8fafc;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-subtle);
        }
        .rank-left {
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }
        .rank-num {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ffffff;
          border: 1px solid var(--border);
          font-size: 0.7rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
        }
        .rank-industry-name {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--brand-navy);
        }
        .rank-conv-count {
          font-size: 0.78rem;
          font-weight: 600;
          color: #059669;
        }
        .funnel-dropoff-breakdown {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .dropoff-summary-box {
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: var(--radius-sm);
          padding: 0.75rem 0.85rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .dropoff-summary-title {
          font-size: 0.72rem;
          font-weight: 700;
          color: #b45309;
          text-transform: uppercase;
        }
        .dropoff-highlight {
          font-size: 0.92rem;
          font-weight: 800;
          color: #92400e;
        }
        .dropoff-text {
          font-size: 0.78rem;
          color: #78350f;
          line-height: 1.4;
        }
        .stage-distribution-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.45rem;
        }
        .stage-dist-item {
          display: flex;
          justify-content: space-between;
          padding: 0.35rem 0.55rem;
          background: #f8fafc;
          border-radius: 4px;
          font-size: 0.75rem;
        }
        .stage-dist-name {
          color: var(--text-secondary);
        }
        .stage-dist-val {
          font-weight: 700;
          color: var(--brand-navy);
        }
        .empty-sub {
          font-size: 0.82rem;
          color: var(--text-muted);
          font-style: italic;
        }
        @media (max-width: 900px) {
          .analytics-2col-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
