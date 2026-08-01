'use client';

import React, { useState, useEffect } from 'react';
import { useApp, ZakatPayment } from '@/context/AppContext';
import { Coins, Plus, Trash2, ShieldAlert, Edit3 } from 'lucide-react';
import { format } from 'date-fns';

export default function ZakatTrackerPage() {
  const { 
    currentWorkspace, 
    zakatPayments, 
    addZakat, 
    editZakat,
    deleteZakat, 
    members,
    user 
  } = useApp();

  const isSolo = currentWorkspace?.type === 'solo';
  const currency = currentWorkspace?.currency || 'BDT';
  const today = new Date();

  // Form states
  const [amount, setAmount] = useState('');
  const [zakatYear, setZakatYear] = useState(today.getFullYear());
  const [paymentDate, setPaymentDate] = useState(today.toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [recipient, setRecipient] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [visibility, setVisibility] = useState<ZakatPayment['visibility']>('shared_all');
  const [isAdding, setIsAdding] = useState(false);

  // Edit Modal States
  const [editZakatItem, setEditZakatItem] = useState<ZakatPayment | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editZakatYear, setEditZakatYear] = useState(today.getFullYear());
  const [editPaymentDate, setEditPaymentDate] = useState('');
  const [editRecipient, setEditRecipient] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('Cash');
  const [editVisibility, setEditVisibility] = useState<ZakatPayment['visibility']>('private');
  const [editNotes, setEditNotes] = useState('');

  // Default visibility to shared_all (public) in group workspaces
  useEffect(() => {
    if (currentWorkspace) {
      setVisibility(currentWorkspace.type === 'solo' ? 'private' : 'shared_all');
    }
  }, [currentWorkspace]);

  const activeZakat = zakatPayments.filter(z => !z.is_deleted);

  // Totals calculations
  const totalPaidThisMonth = activeZakat
    .filter(z => {
      const d = new Date(z.payment_date);
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    })
    .reduce((sum, z) => sum + z.amount, 0);

  const totalPaidThisYear = activeZakat
    .filter(z => new Date(z.payment_date).getFullYear() === today.getFullYear())
    .reduce((sum, z) => sum + z.amount, 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      alert('Zakat amount must be a positive number.');
      return;
    }

    try {
      await addZakat(amt, zakatYear, {
        payment_date: paymentDate + 'T12:00:00Z',
        notes,
        recipient,
        payment_method: paymentMethod,
        visibility,
      });

      // Reset
      setAmount('');
      setNotes('');
      setRecipient('');
      setIsAdding(false);
    } catch (err: any) {
      alert('Could not record Zakat payment: ' + err.message);
    }
  };

  const handleStartEdit = (z: ZakatPayment) => {
    setEditZakatItem(z);
    setEditAmount(z.amount.toString());
    setEditZakatYear(z.zakat_year);
    setEditPaymentDate(z.payment_date.substring(0, 10));
    setEditRecipient(z.recipient || '');
    setEditPaymentMethod(z.payment_method);
    setEditVisibility(z.visibility);
    setEditNotes(z.notes || '');
  };

  const handleSaveEdit = async () => {
    if (!editZakatItem) return;
    const amt = parseFloat(editAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Zakat amount must be a positive number.');
      return;
    }

    try {
      await editZakat(editZakatItem.id, {
        amount: amt,
        zakat_year: editZakatYear,
        payment_date: editPaymentDate + 'T12:00:00Z',
        recipient: editRecipient,
        payment_method: editPaymentMethod,
        visibility: editVisibility,
        notes: editNotes,
      });
      setEditZakatItem(null);
    } catch (e: any) {
      alert('Could not update Zakat: ' + e.message);
    }
  };

  return (
    <div className="space-y-8 w-full select-none animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-border pb-5">
        <div>
          <h1 className="text-[32px] font-extrabold text-primary leading-tight tracking-tight">Zakat tracker</h1>
          <p className="text-sm text-muted-foreground mt-1.5 font-medium">Record, track, and manage Zakat payments.</p>
        </div>
 
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="h-11 px-5 bg-[#073F3B] hover:bg-[#087F78] text-white font-semibold rounded-[10px] flex items-center justify-center gap-2 text-sm shadow-xs transition-all"
        >
          <Plus className="h-4 w-4" />
          {isAdding ? 'Close form' : 'Record Zakat'}
        </button>
      </div>
 
      {/* Notice Banner */}
      <div className="bg-[#EDF6F3] border border-[#BFD1CA] p-4 rounded-[12px] flex items-start gap-3 text-xs leading-relaxed text-[#073F3B]">
        <ShieldAlert className="h-5 w-5 text-[#073F3B] shrink-0 mt-0.5" />
        <p className="font-semibold">
          Notice: This section records Zakat payments. It does not provide a religious ruling or determine your final obligation. Please consult qualified resources to calculate your Zakat obligation.
        </p>
      </div>

      {/* Totals Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-white border border-border rounded-[16px] p-6 shadow-[0_3px_12px_rgba(7,63,59,0.04)] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-brand-teal uppercase tracking-wider">Zakat paid this month</span>
            <h3 className="text-2xl font-extrabold text-primary mt-2">
              {currency} {totalPaidThisMonth.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <Coins className="h-8 w-8 text-[#0AA99D]/40" />
        </div>
 
        <div className="bg-white border border-border rounded-[16px] p-6 shadow-[0_3px_12px_rgba(7,63,59,0.04)] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-brand-teal uppercase tracking-wider font-bold">Zakat paid this year ({today.getFullYear()})</span>
            <h3 className="text-2xl font-extrabold text-primary mt-2">
              {currency} {totalPaidThisYear.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <Coins className="h-8 w-8 text-[#E5A823]/40" />
        </div>
      </div>

      {/* Add Zakat form */}
      {isAdding && (
        <form 
          onSubmit={handleSave}
          className="bg-white border border-border rounded-[16px] p-6 shadow-[0_3px_12px_rgba(7,63,59,0.04)] space-y-4"
        >
          <h3 className="font-bold text-xs text-primary uppercase tracking-wider">Record Zakat payment</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="amount" className="block text-xs font-semibold text-primary mb-1">Amount ({currency})</label>
              <input
                id="amount"
                type="number"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-3 border border-border rounded-md bg-[#F4F6F4]/50 text-xs font-bold text-primary"
              />
            </div>

            <div>
              <label htmlFor="zakatYear" className="block text-xs font-semibold text-primary mb-1">Zakat Year</label>
              <input
                id="zakatYear"
                type="number"
                required
                value={zakatYear}
                onChange={(e) => setZakatYear(parseInt(e.target.value, 10))}
                className="w-full p-3 border border-border rounded-md bg-[#F4F6F4]/50 text-xs font-semibold text-primary"
              />
            </div>

            <div>
              <label htmlFor="paymentDate" className="block text-xs font-semibold text-primary mb-1">Payment Date</label>
              <input
                id="paymentDate"
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full p-3 border border-border rounded-md bg-[#F4F6F4]/50 text-xs font-semibold text-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="recipient" className="block text-xs font-semibold text-primary mb-1">Recipient / Organization</label>
              <input
                id="recipient"
                type="text"
                placeholder="e.g. Local Foundation"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full p-3 border border-border rounded-md bg-[#F4F6F4]/50 text-xs font-semibold text-primary"
              />
            </div>

            <div>
              <label htmlFor="paymentMethod" className="block text-xs font-semibold text-primary mb-1">Payment Method</label>
              <select
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full p-3 border border-border rounded-md bg-white text-xs font-semibold text-primary"
              >
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="bKash">bKash</option>
                <option value="Nagad">Nagad</option>
                <option value="Bank">Bank Transfer</option>
              </select>
            </div>

            <div>
              <label htmlFor="visibility" className="block text-xs font-semibold text-primary mb-1">Visibility</label>
              <select
                id="visibility"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as any)}
                className="w-full p-3 border border-border rounded-md bg-white text-xs font-semibold text-primary"
              >
                <option value="private">Private (Only me)</option>
                {!isSolo && (
                  <option value="shared_all">Visible to group (Public)</option>
                )}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-xs font-semibold text-primary mb-1">Notes (optional)</label>
            <input
              id="notes"
              type="text"
              placeholder="Zakat payment notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 border border-border rounded-md bg-[#F4F6F4]/50 text-xs font-semibold text-primary"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="h-11 px-5 bg-[#073F3B] hover:bg-[#087F78] text-white font-bold text-xs rounded-[10px] transition-all">Save Zakat payment</button>
            <button type="button" onClick={() => setIsAdding(false)} className="h-11 px-5 border border-border text-muted-foreground text-xs rounded-[10px] hover:bg-slate-50 transition-all">Cancel</button>
          </div>
        </form>
      )}

      {/* Zakat history ledger list */}
      <div className="bg-white border border-border rounded-[16px] shadow-[0_3px_12px_rgba(7,63,59,0.04)] overflow-hidden">
        <div className="p-4 border-b border-border bg-[#EDF6F3]/10 flex justify-between items-center text-xs font-bold text-primary uppercase tracking-wider">
          <span>Zakat payment ledger</span>
          <span className="text-muted-foreground normal-case font-semibold text-[10px]">History of recorded Zakat payments</span>
        </div>
 
        {activeZakat.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground leading-relaxed bg-[#F4F6F4]/50">
            No Zakat payments recorded yet. Record a payment whenever you are ready.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {activeZakat.map((z) => {
              const name = members.find(m => m.profile_id === z.profile_id)?.display_name || 'Member';
              return (
                <div key={z.id} className="p-4 flex justify-between items-center gap-4 text-xs hover:bg-background/20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#EDF6F3] text-[#073F3B] flex items-center justify-center font-bold">
                      <Coins className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-primary">
                        {z.recipient ? `Zakat to ${z.recipient}` : 'Zakat Payment'}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Paid by {name} on {format(new Date(z.payment_date), 'MMM dd, yyyy')} • Zakat Year {z.zakat_year}
                        {z.visibility === 'private' ? (
                          <span className="ml-2 bg-[#E7F3EF] text-[#506A64] px-1.5 py-0.5 rounded-md font-bold text-[9px]">Private</span>
                        ) : (
                          <span className="ml-2 bg-[#EDF6F3] text-[#0AA99D] px-1.5 py-0.5 rounded-md font-bold text-[9px]">Shared</span>
                        )}
                      </p>
                      {z.notes && <p className="text-[10px] text-muted-foreground mt-1 italic">"{z.notes}"</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-sm text-primary">{currency} {z.amount.toFixed(2)}</span>
                    {z.profile_id === user?.id && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleStartEdit(z)}
                          className="p-1.5 text-muted-foreground hover:text-[#0AA99D] hover:bg-[#EDF6F3]/50 rounded-md transition-all"
                          title="Edit Zakat entry"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteZakat(z.id)}
                          className="p-1.5 text-muted-foreground hover:text-[#C85450] hover:bg-red-50 rounded-md transition-all"
                          title="Delete Zakat entry"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Zakat Modal */}
      {editZakatItem && (
        <div className="fixed inset-0 bg-[#073F3B]/40 flex items-center justify-center p-4 z-50 backdrop-blur-xs select-none">
          <div className="bg-white border border-border rounded-[16px] max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-sm text-primary flex items-center gap-1.5 border-b border-border pb-3">
              Edit Zakat payment
            </h3>

            <div className="space-y-4 text-xs font-semibold text-primary">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit_amt" className="block text-[11px] text-muted-text uppercase font-bold mb-1">Amount ({currency})</label>
                  <input
                    id="edit_amt"
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full p-3 border border-[#BFD1CA] rounded-[10px] bg-white text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="edit_year" className="block text-[11px] text-muted-text uppercase font-bold mb-1">Zakat Year</label>
                  <input
                    id="edit_year"
                    type="number"
                    value={editZakatYear}
                    onChange={(e) => setEditZakatYear(parseInt(e.target.value, 10))}
                    className="w-full p-3 border border-[#BFD1CA] rounded-[10px] bg-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit_date" className="block text-[11px] text-muted-text uppercase font-bold mb-1">Payment Date</label>
                  <input
                    id="edit_date"
                    type="date"
                    value={editPaymentDate}
                    onChange={(e) => setEditPaymentDate(e.target.value)}
                    className="w-full p-3 border border-[#BFD1CA] rounded-[10px] bg-white text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="edit_rec" className="block text-[11px] text-muted-text uppercase font-bold mb-1">Recipient / Organization</label>
                  <input
                    id="edit_rec"
                    type="text"
                    value={editRecipient}
                    onChange={(e) => setEditRecipient(e.target.value)}
                    className="w-full p-3 border border-[#BFD1CA] rounded-[10px] bg-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit_method" className="block text-[11px] text-muted-text uppercase font-bold mb-1">Payment Method</label>
                  <select
                    id="edit_method"
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value)}
                    className="w-full p-3 border border-[#BFD1CA] rounded-[10px] bg-white text-sm font-bold"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Bank">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="edit_vis" className="block text-[11px] text-muted-text uppercase font-bold mb-1">Visibility</label>
                  <select
                    id="edit_vis"
                    value={editVisibility}
                    onChange={(e) => setEditVisibility(e.target.value as any)}
                    className="w-full p-3 border border-[#BFD1CA] rounded-[10px] bg-white text-sm font-bold"
                  >
                    <option value="private">Private (Only me)</option>
                    {!isSolo && (
                      <option value="shared_all">Visible to group (Public)</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="edit_notes" className="block text-[11px] text-muted-text uppercase font-bold mb-1">Notes</label>
                <input
                  id="edit_notes"
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-3 border border-[#BFD1CA] rounded-[10px] bg-white text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="flex-1 h-11 bg-[#073F3B] hover:bg-[#087F78] text-white font-bold rounded-[10px] transition-all animate-scale-up"
                >
                  Save changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditZakatItem(null)}
                  className="flex-1 h-11 border border-border text-muted-foreground font-bold rounded-[10px] hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
