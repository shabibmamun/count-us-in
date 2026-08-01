'use client';

import React, { useState } from 'react';
import { useApp, ZakatPayment } from '@/context/AppContext';
import { Coins, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';

export default function ZakatTrackerPage() {
  const { 
    currentWorkspace, 
    zakatPayments, 
    addZakat, 
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
  const [visibility, setVisibility] = useState<ZakatPayment['visibility']>('private');
  const [isAdding, setIsAdding] = useState(false);

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

  return (
    <div className="space-y-8 w-full select-none">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-border pb-5">
        <div>
          <h1 className="text-[32px] font-extrabold text-primary leading-tight tracking-tight">Zakat tracker</h1>
          <p className="text-sm text-muted-foreground mt-1.5 font-medium">Record, track, and manage Zakat payments privately.</p>
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
          className="bg-white border border-border rounded-lg p-6 shadow-xs space-y-4"
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
                className="w-full p-2 border border-border rounded-md bg-input text-xs font-bold text-primary"
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
                className="w-full p-2 border border-border rounded-md bg-input text-xs"
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
                className="w-full p-2 border border-border rounded-md bg-input text-xs"
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
                className="w-full p-2 border border-border rounded-md bg-input text-xs"
              />
            </div>

            <div>
              <label htmlFor="paymentMethod" className="block text-xs font-semibold text-primary mb-1">Payment Method</label>
              <select
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full p-2 border border-border rounded-md bg-input text-xs"
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
                className="w-full p-2 border border-border rounded-md bg-input text-xs"
              >
                <option value="private">Private (Only me)</option>
                {!isSolo && (
                  <>
                    <option value="shared_all">Visible to group</option>
                  </>
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
              className="w-full p-2 border border-border rounded-md bg-input text-xs"
            />
          </div>

          <div className="flex gap-2">
            <button type="submit" className="px-5 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-md">Save Zakat payment</button>
            <button type="button" onClick={() => setIsAdding(false)} className="px-5 py-2 border border-border text-muted-foreground text-xs rounded-md">Cancel</button>
          </div>
        </form>
      )}

      {/* Zakat history ledger list */}
      <div className="bg-white border border-border rounded-[16px] shadow-[0_3px_12px_rgba(7,63,59,0.04)] overflow-hidden">
        <div className="p-4 border-b border-border bg-background/30 flex justify-between items-center text-xs font-bold text-primary uppercase tracking-wider">
          <span>Zakat payment ledger</span>
          <span className="text-muted-foreground normal-case font-semibold">History of recorded Zakat payments</span>
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
                    <div className="w-8 h-8 rounded-full bg-secondary text-primary flex items-center justify-center font-bold">
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
                      <button
                        onClick={() => deleteZakat(z.id)}
                        className="p-1 text-muted-foreground hover:text-destructive rounded-md hover:bg-red-50"
                        title="Delete Zakat entry"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
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
