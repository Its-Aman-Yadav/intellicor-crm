'use client';

import React from 'react';
import InCallAssistantModal from './InCallAssistantModal';
import { Lead, CallResult, CallOpenerScript, CommonObjection } from '@/types/crm';

interface QuickCallModalProps {
  lead: Lead;
  activeRep: string;
  onClose: () => void;
  onSaveCallLog: (
    leadId: string,
    log: {
      repName: string;
      openerScript: CallOpenerScript;
      result: CallResult;
      objection?: CommonObjection;
      objections?: string[];
      askedForWhatsApp: boolean;
      notes: string;
      nextFollowUpDate?: string;
    },
    leadUpdates?: {
      requirement?: string;
      notes?: string;
      followUpDate?: string;
    }
  ) => void;
}

export default function QuickCallModal({
  lead,
  activeRep,
  onClose,
  onSaveCallLog,
}: QuickCallModalProps) {
  return (
    <InCallAssistantModal
      lead={lead}
      activeRep={activeRep}
      onClose={onClose}
      onSaveCallLog={onSaveCallLog}
    />
  );
}
