'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { calculateSettlements, MemberBalance } from '@/lib/calculations';
import { FolderSync, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

export default function BalanceUpPage() {
  const { 
    currentWorkspace, 
    expenses, 
    settlements, 
    members, 
    addSettlement, 
    deleteSettlement, 
    user 
  } = useApp();

  const isSolo = currentWorkspace?.type === 'solo';
  const currency = currentWorkspace?.currency || 'BDT';

  // Settle entry states
  const [payerId, setPayerId] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  if (isSolo) {
    return (
      <div className="bg-white border border-border rounded-lg p-12 text-center max-w-xl mx-auto shadow-xs mt-8">
        <h2 className="text-xl font-bold text-primary mb-2">Balance Up is for groups</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You are currently in a private solo space. Balance Up calculations operate inside shared group workspaces.
        </p>
      </div>
    );
  }

  // Calculate positions
  const memberBalances: MemberBalance[] = members.map(m => {
    // Shared expenses paid by this member
    const paid = expenses
      .filter(e => !e.is_deleted && e.visibility !== 'private' && e.paid_by === m.profile_id)
      .reduce((sum, e) => sum + e.amount, 0);

    // Shared responsibility assigned to this member
    const responsibility = expenses
      .filter(e => !e.is_deleted && e.visibility !== 'private')
      .reduce((sum, e) => {
        const share = e.participants?.find(p => p.profileId === m.profile_id);
        return sum + (share ? share.amount : 0);
      }, 0);

    // Settlements paid by this member
    const settledPaid = settlements
      .filter(s => !s.is_deleted && s.payer_id === m.profile_id)
      .reduce((sum, s) => sum + s.amount, 0);

    // Settlements received by this member
    const settledReceived = settlements
      .filter(s => !s.is_deleted && s.recipient_id === m.profile_id)
      .reduce((sum, s) => sum + s.amount, 0);

    return {
      profileId: m.profile_id,
      displayName: m.display_name || 'Group Member',
      paid,
      responsibility,
      settledPaid,
      settledReceived,
    };
  });

  const { positions, transfers } = calculateSettlements(memberBalances);

  // Group status
  const totalOutstanding = transfers.reduce((sum, t) => sum + t.amount, 0);
  const isBalanced = totalOutstanding <= 0.05;
  const hasSharedExpenses = expenses.some(e => !e.is_deleted && e.visibility !== 'private');

  const handleSaveSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      alert('Settlement amount must be greater than zero.');
      return;
    }
    if (!payerId || !recipientId) {
      alert('Payer and Recipient are required.');
      return;
    }
    if (payerId === recipientId) {
      alert('Payer and Recipient cannot be the same member.');
      return;
    }

    try {
      await addSettlement(payerId, recipientId, amt, notes);
      setAmount('');
      setNotes('');
      setIsAdding(false);
    } catch (err: any) {
      alert('Could not record settlement: ' + err.message);
    }
  };

  const handleAutoFillTransfer = (t: typeof transfers[0]) => {
    setPayerId(t.fromId);
    setRecipientId(t.toId);
    setAmount(t.amount.toString());
    setNotes(`Settlement balance transfer`);
    setIsAdding(true);
  };

  const activeSettlements = settlements.filter(s => !s.is_deleted);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-primary tracking-tight">Balance Up</h1>
          <p className="text-xs text-muted-foreground mt-1">
            See how shared expenses are divided and what would bring everyone back into balance.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-md hover:opacity-90 transition-all text-xs"
        >
          <Plus className="h-4 w-4" />
          Record Settlement
        </button>
      </div>

      {/* Settlement payment entry form */}
      {isAdding && (
        <form 
          onSubmit={handleSaveSettlement}
          className="bg-white border border-border rounded-lg p-6 shadow-xs space-y-4"
        >
          <h3 className="font-bold text-xs text-primary uppercase tracking-wider">Record Settlement Balance Transfer</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="payer" className="block text-xs font-semibold text-primary mb-1">Who paid?</label>
              <select
                id="payer"
                required
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="w-full p-2 border border-border rounded-md bg-input text-xs"
              >
                <option value="">Select sender</option>
                {members.map(m => (
                  <option key={m.profile_id} value={m.profile_id}>{m.display_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="recipient" className="block text-xs font-semibold text-primary mb-1">Who received?</label>
              <select
                id="recipient"
                required
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                className="w-full p-2 border border-border rounded-md bg-input text-xs"
              >
                <option value="">Select recipient</option>
                {members.map(m => (
                  <option key={m.profile_id} value={m.profile_id}>{m.display_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="amt" className="block text-xs font-semibold text-primary mb-1">Amount ({currency})</label>
              <input
                id="amt"
                type="number"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-2 border border-border rounded-md bg-input text-xs font-bold text-primary"
              />
            </div>
          </div>

          <div>
            <label htmlFor="setNotes" className="block text-xs font-semibold text-primary mb-1">Notes (optional)</label>
            <input
              id="setNotes"
              type="text"
              placeholder="e.g. Settle up cash transfer"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 border border-border rounded-md bg-input text-xs"
            />
          </div>

          <div className="flex gap-2">
            <button type="submit" className="px-5 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-md">Save Transfer</button>
            <button type="button" onClick={() => setIsAdding(false)} className="px-5 py-2 border border-border text-muted-foreground text-xs rounded-md">Cancel</button>
          </div>
        </form>
      )}

      {/* Suggested transfers list */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left column: transfers */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border border-border rounded-lg p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
              <FolderSync className="h-5 w-5 text-muted-foreground" />
              Suggested balance transfers
            </h2>

            {!hasSharedExpenses ? (
              <div className="py-8 text-center text-xs text-[#506A64] font-semibold flex flex-col items-center gap-2">
                <FolderSync className="h-8 w-8 text-[#0AA99D]/40" />
                <span className="text-sm font-bold text-primary">No shared balances yet</span>
                <p className="font-medium text-muted-foreground max-w-sm">Shared balances and settlement suggestions will appear after members record shared expenses.</p>
              </div>
            ) : isBalanced ? (
              <div className="py-8 text-center text-xs text-accent font-semibold flex flex-col items-center gap-2">
                <CheckCircle2 className="h-8 w-8" />
                <span>The workspace is completely balanced! No transfers are required.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {transfers.map((t, idx) => (
                  <div 
                    key={idx}
                    className="p-4 border border-border rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-background/50 hover:border-primary/20 transition-all text-xs"
                  >
                    <div>
                      <p className="font-semibold text-primary leading-relaxed">
                        <strong>{t.fromName}</strong> has contributed less than their calculated share.
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        A transfer of <strong className="text-primary">{currency} {t.amount.toFixed(2)}</strong> from {t.fromName} to {t.toName} would reduce remaining balance.
                      </p>
                    </div>

                    <button
                      onClick={() => handleAutoFillTransfer(t)}
                      className="px-3.5 py-1.5 bg-primary text-primary-foreground font-bold text-[11px] rounded-md hover:opacity-90 transition-all self-start sm:self-center"
                    >
                      Record Transfer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: position status */}
        <div className="space-y-6">
          {/* Member positions card */}
          <div className="bg-white border border-border rounded-lg p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-xs text-primary uppercase tracking-wider">Member positions</h3>
            <div className="space-y-2">
              {positions.map((pos) => {
                const isOwed = pos.netPosition > 0.01;
                const isOwes = pos.netPosition < -0.01;
                
                return (
                  <div key={pos.profileId} className="flex justify-between items-center text-xs border-b border-border/40 pb-2">
                    <span className="font-semibold text-primary">{pos.displayName}</span>
                    <span className={`font-bold ${isOwed ? 'text-accent' : isOwes ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {isOwed ? `+${pos.netPosition.toFixed(2)}` : pos.netPosition.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* History Ledger list */}
      <div className="bg-white border border-border rounded-lg shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border bg-background/30 flex justify-between items-center text-xs font-bold text-primary uppercase tracking-wider">
          <span>Settlement Payments History</span>
          <span className="text-muted-foreground normal-case font-normal">History of recorded transfers</span>
        </div>

        {activeSettlements.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground leading-relaxed">
            No settlement transfers have been recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {activeSettlements.map((set) => {
              const payerName = members.find(m => m.profile_id === set.payer_id)?.display_name || 'Member';
              const recName = members.find(m => m.profile_id === set.recipient_id)?.display_name || 'Member';
              return (
                <div key={set.id} className="p-4 flex justify-between items-center gap-4 text-xs hover:bg-background/20 transition-all">
                  <div>
                    <span className="font-semibold text-primary">{payerName}</span>
                    <span className="text-muted-foreground mx-1">paid</span>
                    <span className="font-semibold text-primary">{recName}</span>
                    {set.notes && <p className="text-[10px] text-muted-foreground mt-0.5 italic">"{set.notes}"</p>}
                    <p className="text-[9px] text-muted-foreground mt-1">Recorded on {format(new Date(set.settlement_date), 'MMM dd, yyyy')}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-sm text-primary">{currency} {set.amount.toFixed(2)}</span>
                    <button
                      onClick={() => deleteSettlement(set.id)}
                      className="p-1 text-muted-foreground hover:text-destructive rounded-md hover:bg-red-50"
                      title="Delete settlement entry"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
