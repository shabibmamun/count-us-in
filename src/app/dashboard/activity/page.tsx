'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { Activity, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

export default function GroupActivityPage() {
  const { currentWorkspace, auditLogs, members } = useApp();

  const isSolo = currentWorkspace?.type === 'solo';
  const title = isSolo ? 'Household Activity' : 'Group Activity';

  function formatAuditDetails(action: string, metadata: any) {
    if (!metadata) return null;
    
    try {
      switch (action) {
        case 'expense_added':
        case 'expense_recorded':
        case 'expense_updated':
          return `${metadata.merchant || 'Expense'} · BDT ${Number(metadata.amount || 0).toFixed(2)}`;
        case 'income_added':
        case 'income_updated':
          return `${metadata.income_type || 'Income'} · BDT ${Number(metadata.amount || 0).toFixed(2)}`;
        case 'zakat_recorded':
        case 'zakat_updated':
          return `Zakat Payment · BDT ${Number(metadata.amount || 0).toFixed(2)}`;
        case 'settlement_recorded':
          return `Settlement Transfer · BDT ${Number(metadata.amount || 0).toFixed(2)}`;
        case 'profile_updated':
          return `Profile details updated`;
        case 'workspace_created':
          return `Workspace "${metadata.name || 'New space'}" created`;
        default:
          return Object.entries(metadata)
            .filter(([key]) => !['id', 'user_id', 'workspace_id', 'created_at'].includes(key))
            .map(([key, val]) => `${key.replace(/_/g, ' ')}: ${typeof val === 'object' ? JSON.stringify(val) : val}`)
            .join(' · ');
      }
    } catch (e) {
      return null;
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in select-none">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-primary tracking-tight">{title}</h1>
        <p className="text-xs text-muted-foreground mt-1">Audit log of actions completed in this workspace.</p>
      </div>

      {/* Activity Logs card */}
      <div className="bg-white border border-border rounded-[16px] shadow-[0_3px_12px_rgba(7,63,59,0.04)] overflow-hidden">
        <div className="p-4 border-b border-border bg-[#EDF6F3]/10 flex items-center justify-between text-xs font-bold text-primary uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Activity className="h-4.5 w-4.5 text-muted-foreground" />
            Workspace activity logs
          </span>
          <span className="text-[10px] bg-[#EDF6F3] text-[#073F3B] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> Secure Audit Trail
          </span>
        </div>

        {auditLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground leading-relaxed bg-[#F4F6F4]/50">
            No activity records exist for this workspace yet.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {auditLogs.map((log) => {
              const actor = members.find(m => m.profile_id === log.user_id)?.display_name || 'System';
              const actionLabel = log.action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              const details = formatAuditDetails(log.action, log.metadata);
              
              return (
                <div key={log.id} className="p-4 hover:bg-background/20 transition-all text-xs flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <p className="font-bold text-primary">{actionLabel}</p>
                    {details && (
                      <p className="text-xs text-muted-foreground font-semibold">
                        {details}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      Completed by <span className="font-bold text-primary">{actor}</span>
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-semibold shrink-0 pt-0.5">
                    {format(new Date(log.created_at), "d MMMM yyyy 'at' h:mm a")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
