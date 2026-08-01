'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { History, Activity, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

export default function GroupActivityPage() {
  const { currentWorkspace, auditLogs, members } = useApp();

  const isSolo = currentWorkspace?.type === 'solo';
  const title = isSolo ? 'Household Activity' : 'Group Activity';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-primary tracking-tight">{title}</h1>
        <p className="text-xs text-muted-foreground mt-1">Audit log of actions completed in this workspace.</p>
      </div>

      {/* Activity Logs card */}
      <div className="bg-white border border-border rounded-lg shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border bg-background/30 flex items-center justify-between text-xs font-bold text-primary uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Activity className="h-4.5 w-4.5 text-muted-foreground" />
            Workspace activity logs
          </span>
          <span className="text-[10px] bg-secondary text-primary font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> Secure Audit Trail
          </span>
        </div>

        {auditLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground leading-relaxed">
            No activity records exist for this workspace yet.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {auditLogs.map((log) => {
              const actor = members.find(m => m.profile_id === log.user_id)?.display_name || 'System';
              const actionLabel = log.action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              
              return (
                <div key={log.id} className="p-4 hover:bg-background/20 transition-all text-xs flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <p className="font-bold text-primary">{actionLabel}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Completed by <span className="font-semibold text-foreground">{actor}</span>
                    </p>
                    {log.metadata && (
                      <pre className="text-[9px] bg-background border border-border/80 p-2 rounded-md font-mono overflow-x-auto max-w-lg mt-1 text-muted-foreground">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0 pt-0.5">
                    {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}
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
