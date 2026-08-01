'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { compressImage } from '@/lib/image-compressor';
import { performOCR, OCRResult } from '@/lib/ocr';
import { SplitMethod, ParticipantInput } from '@/lib/calculations';
import { 
  ArrowLeft, 
  Camera, 
  Upload, 
  Trash2, 
  Check, 
  Loader2, 
  AlertTriangle,
  Receipt
} from 'lucide-react';

function AddExpenseForm() {
  const { 
    user, 
    currentWorkspace, 
    members, 
    categories, 
    expenses,
    addExpense,
    merchantRules,
    addMerchantRule,
    addRecurringTemplate
  } = useApp();
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSolo = currentWorkspace?.type === 'solo';
  const currency = currentWorkspace?.currency || 'BDT';

  // Standard Form States
  const [amount, setAmount] = useState<string>('');
  const [merchant, setMerchant] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paidBy, setPaidBy] = useState<string>(user?.id || '');
  const [visibility, setVisibility] = useState<'private' | 'shared_selected' | 'shared_all'>('shared_all');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [notes, setNotes] = useState<string>('');
  const [receiptUrl, setReceiptUrl] = useState<string>('');

  // Split States
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [participants, setParticipants] = useState<string[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, number>>({}); // Percentages, shares, fixed amounts

  // OCR Upload States
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState('');
  const [ocrError, setOcrError] = useState('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [ocrCompleted, setOcrCompleted] = useState(false);
  const [suggestedAmounts, setSuggestedAmounts] = useState<number[]>([]);

  // Category save query
  const [showCategoryRemember, setShowCategoryRemember] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState('monthly');
  const [showCategoryPopup, setShowCategoryPopup] = useState(false);

  const autoPredictCategory = (merchantName: string) => {
    if (!merchantName.trim()) return;
    
    // 1. Check custom user rules first
    const ruleMatch = merchantRules?.find(
      r => r.merchant_name.toLowerCase() === merchantName.trim().toLowerCase()
    );
    if (ruleMatch) {
      setCategoryId(ruleMatch.category_id);
      return;
    }

    // 2. Check previous workspace expenses for matching merchant
    const historicalMatch = expenses?.find(
      e => !e.is_deleted && e.merchant.toLowerCase() === merchantName.trim().toLowerCase()
    );
    if (historicalMatch) {
      setCategoryId(historicalMatch.category_id);
      return;
    }

    // 3. Regex NLP Keywords matching
    const lower = merchantName.toLowerCase();
    let matchedCat = null;
    
    if (/agora|supershop|shwapno|grocery|groceries|market|bazar|kitchen/i.test(lower)) {
      matchedCat = categories.find(c => /groceries/i.test(c.name));
    } else if (/restaurant|cafe|food|delivery|pizza|kfc|burger|dining|cook/i.test(lower)) {
      matchedCat = categories.find(c => /dining/i.test(c.name));
    } else if (/ride|uber|bus|train|fuel|petrol|pathao|ticket|travel|flight/i.test(lower)) {
      matchedCat = categories.find(c => /transport/i.test(c.name)) || categories.find(c => /travel/i.test(c.name));
    } else if (/electric|water|gas|internet|mobile|recharge|bill|wifi|desco|wasa/i.test(lower)) {
      matchedCat = categories.find(c => /utilities/i.test(c.name));
    } else if (/rent|flat|house|apartment|hostel/i.test(lower)) {
      matchedCat = categories.find(c => /housing/i.test(c.name));
    } else if (/hospital|clinic|doctor|pharmacy|medicine|dental/i.test(lower)) {
      matchedCat = categories.find(c => /healthcare/i.test(c.name));
    } else if (/school|college|university|book|tuition|course/i.test(lower)) {
      matchedCat = categories.find(c => /education/i.test(c.name));
    } else if (/movie|netflix|spotify|game|entertainment|theater/i.test(lower)) {
      matchedCat = categories.find(c => /entertainment/i.test(c.name));
    } else if (/zakat|sadaqah|donation|charity|mosque/i.test(lower)) {
      matchedCat = categories.find(c => /zakat/i.test(c.name)) || categories.find(c => /charity/i.test(c.name));
    }

    if (matchedCat) {
      setCategoryId(matchedCat.id);
    } else {
      // AI could not decipher, open popup select modal
      setShowCategoryPopup(true);
    }
  };

  // Initialize
  useEffect(() => {
    if (user) {
      setPaidBy(user.id);
      setVisibility(isSolo ? 'private' : 'shared_all');
      setParticipants(members.map(m => m.profile_id));
    }
  }, [user, isSolo, members]);

  // Handle OCR auto-trigger from URL query
  useEffect(() => {
    if (searchParams.get('ocr') === 'true' && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [searchParams]);

  // Handle Image Upload
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setOcrError('');
    setOcrCompleted(false);

    try {
      // 1. Client-side Image compression
      setOcrProgress('Preparing your image...');
      const compressionResult = await compressImage(file);
      setImagePreview(compressionResult.previewUrl);

      // Save mockup compressed file url (in a real app, this uploads to Supabase Storage bucket first,
      // but here we can keep a local preview object URL representing the receipt file path)
      setReceiptUrl(compressionResult.previewUrl);

      // 2. Perform OCR inside browser web worker
      const ocrResult = await performOCR(compressionResult.file, (msg) => {
        setOcrProgress(msg);
      });

      // 3. Fill values based on OCR
      if (ocrResult.amount > 0) {
        setAmount(ocrResult.amount.toString());
      }
      if (ocrResult.merchant) {
        setMerchant(ocrResult.merchant);
      }
      if (ocrResult.date) {
        setExpenseDate(ocrResult.date);
      }
      if (ocrResult.paymentMethod) {
        setPaymentMethod(ocrResult.paymentMethod);
      }
      if (ocrResult.possibleAmounts) {
        setSuggestedAmounts(ocrResult.possibleAmounts);
      }

      // 4. Match merchant categorization rules
      const rule = merchantRules.find(r => 
        new RegExp(r.merchant_name, 'i').test(ocrResult.merchant)
      );
      if (rule) {
        setCategoryId(rule.category_id);
      } else {
        // Fallback simple categorization based on keywords
        const lowerMerch = ocrResult.merchant.toLowerCase();
        let matchedCat = categories.find(c => /other/i.test(c.name));
        
        if (/shop|supermarket|grocery|bazar/i.test(lowerMerch)) {
          matchedCat = categories.find(c => /groceries/i.test(c.name));
        } else if (/restaurant|cafe|food|delivery/i.test(lowerMerch)) {
          matchedCat = categories.find(c => /dining/i.test(c.name));
        } else if (/ride|uber|bus|train|fuel|petrol/i.test(lowerMerch)) {
          matchedCat = categories.find(c => /transport/i.test(c.name));
        } else if (/electric|water|gas|internet|mobile/i.test(lowerMerch)) {
          matchedCat = categories.find(c => /utilities/i.test(c.name));
        }
        
        if (matchedCat) {
          setCategoryId(matchedCat.id);
        }
      }

      setOcrCompleted(true);
    } catch (err: any) {
      setOcrError(err.message || 'We could not read this image clearly. You can still enter details manually.');
    } finally {
      setOcrLoading(false);
    }
  };

  // Split calculations validations
  const validateForm = (): string | null => {
    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      return 'Amount must be a positive number.';
    }
    if (!merchant.trim()) {
      return 'Merchant/Payee is required.';
    }
    if (!categoryId) {
      return 'Category is required.';
    }
    if (visibility !== 'private' && participants.length === 0) {
      return 'At least one participant is required for shared expenses.';
    }

    // Split validations
    if (visibility !== 'private') {
      if (splitMethod === 'percentage') {
        const sum = participants.reduce((acc, pid) => acc + (customValues[pid] || 0), 0);
        if (Math.abs(sum - 100) > 0.01) {
          return `Percentage split must sum to 100%. Current sum: ${sum}%`;
        }
      } else if (splitMethod === 'fixed') {
        const sum = participants.reduce((acc, pid) => acc + (customValues[pid] || 0), 0);
        if (Math.abs(sum - amtNum) > 0.01) {
          return `Fixed split amounts must equal total expense. Sum: ${currency} ${sum.toFixed(2)} (Needed: ${currency} ${amtNum.toFixed(2)})`;
        }
      } else if (splitMethod === 'shares' || splitMethod === 'income_weighted') {
        for (const pid of participants) {
          const val = customValues[pid];
          if (val === undefined || val <= 0) {
            return 'Every participating member must have a positive share weight.';
          }
        }
      }
    }

    return null;
  };

  const handleSave = async (addAnother = false) => {
    const errorMsg = validateForm();
    if (errorMsg) {
      alert(errorMsg);
      return;
    }

    try {
      const amtNum = parseFloat(amount);
      const participantInputs: ParticipantInput[] = visibility === 'private'
        ? [{ profileId: user!.id }]
        : participants.map(pid => ({
            profileId: pid,
            value: splitMethod === 'equal' ? undefined : customValues[pid] || 0,
          }));

      await addExpense(
        amtNum,
        merchant,
        categoryId,
        paidBy,
        visibility,
        participantInputs,
        visibility === 'private' ? 'equal' : splitMethod,
        {
          expense_date: expenseDate + 'T12:00:00Z', // Prevent local day shifts
          payment_method: paymentMethod,
          notes: notes,
          receipt_url: receiptUrl,
        }
      );

      if (isRecurring) {
        const d = new Date(expenseDate + 'T12:00:00Z');
        d.setMonth(d.getMonth() + 1);
        const nextOcc = d.toISOString().split('T')[0];

        await addRecurringTemplate(
          'expense',
          amtNum,
          merchant,
          categoryId,
          visibility,
          nextOcc,
          { frequency: recurringFrequency, notes }
        );
      }

      // Check category remember
      const existingRule = merchantRules.find(r => r.merchant_name.toLowerCase() === merchant.toLowerCase());
      if (!existingRule && showCategoryRemember) {
        await addMerchantRule(merchant, categoryId);
      }

      if (addAnother) {
        // Reset form
        setAmount('');
        setMerchant('');
        setCategoryId('');
        setNotes('');
        setReceiptUrl('');
        setImagePreview('');
        setOcrCompleted(false);
        setShowCategoryRemember(false);
      } else {
        router.push('/dashboard/expenses');
      }
    } catch (e: any) {
      alert('We could not save this expense: ' + e.message);
    }
  };

  const toggleParticipant = (pid: string) => {
    if (participants.includes(pid)) {
      setParticipants(participants.filter(id => id !== pid));
    } else {
      setParticipants([...participants, pid]);
    }
  };

  // Auto fill values on visibility toggle
  const handleVisibilityChange = (val: typeof visibility) => {
    setVisibility(val);
    if (val === 'private') {
      setParticipants([user!.id]);
      setPaidBy(user!.id);
    } else {
      setParticipants(members.map(m => m.profile_id));
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Back Header */}
      <div className="flex items-center gap-3">
        <Link 
          href="/dashboard/expenses"
          className="p-2 hover:bg-white border border-transparent hover:border-border rounded-md transition-all text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-extrabold text-primary tracking-tight">Add Expense</h1>
      </div>

      {/* Hidden File Picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleImageFileChange}
        className="hidden"
      />

      {/* OCR PROGRESS PANEL */}
      {ocrLoading && (
        <div className="bg-white border border-border rounded-lg p-6 text-center space-y-4 shadow-xs">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <div>
            <h3 className="font-bold text-primary text-sm">{ocrProgress}</h3>
            <p className="text-xs text-muted-foreground mt-1">Converting receipt details to transactional values...</p>
          </div>
        </div>
      )}

      {/* OCR review header banner */}
      {ocrCompleted && (
        <div className="bg-secondary/40 border border-primary/20 p-4 rounded-lg flex items-start gap-3 text-xs">
          <AlertTriangle className="h-5 w-5 text-primary shrink-0" />
          <div>
            <h4 className="font-bold text-primary">Check before counting it in</h4>
            <p className="text-muted-foreground mt-0.5 leading-relaxed">
              Receipt reading may not always be exact. Confirm the details below before saving.
            </p>
          </div>
        </div>
      )}

      {/* OCR error banner */}
      {ocrError && (
        <div className="bg-red-50 border border-destructive/20 p-4 rounded-lg text-xs space-y-1">
          <h4 className="font-bold text-destructive">We could not read this image clearly</h4>
          <p className="text-muted-foreground leading-relaxed">
            {ocrError} You can still enter details manually below.
          </p>
        </div>
      )}

      {/* Main Expense Form Container */}
      <div className="bg-white border border-border rounded-lg p-6 shadow-xs space-y-6">
        
        {/* Receipt Image Preview panel */}
        {imagePreview && (
          <div className="border border-border rounded-lg p-3 bg-background flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-md border border-border overflow-hidden shrink-0 flex items-center justify-center">
                <img src={imagePreview} alt="Receipt Preview" className="object-cover w-full h-full" />
              </div>
              <div>
                <span className="block text-xs font-bold text-primary">Receipt image attached</span>
                <span className="block text-[10px] text-muted-foreground">Ready to store securely</span>
              </div>
            </div>
            <button
              onClick={() => {
                setImagePreview('');
                setReceiptUrl('');
                setOcrCompleted(false);
              }}
              className="p-2 text-muted-foreground hover:text-destructive rounded-md transition-colors"
              title="Remove Receipt"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Upload receipt button if empty */}
        {!imagePreview && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-4 border border-dashed border-border rounded-lg bg-background hover:bg-secondary/20 transition-all flex flex-col items-center justify-center gap-1.5 text-xs text-muted-foreground"
          >
            <Camera className="h-5 w-5 text-primary" />
            <span className="font-semibold text-primary">Attach receipt image</span>
            <span>Camera, Photo library, or Drag and Drop (Max 5MB)</span>
          </button>
        )}

        {/* Amount Input */}
        <div>
          <label htmlFor="amount" className="block text-sm font-semibold text-primary mb-1">
            Amount ({currency})
          </label>
          <input
            id="amount"
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md shadow-xs bg-input focus:ring-primary focus:border-primary text-sm font-bold text-primary"
          />
          {suggestedAmounts.length > 1 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">OCR Candidates:</span>
              {suggestedAmounts.slice(0, 4).map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmount(amt.toString())}
                  className="text-xs px-2 py-0.5 bg-secondary hover:bg-secondary/80 text-primary font-medium rounded-full"
                >
                  {currency} {amt}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Merchant / Payee */}
        <div>
          <label htmlFor="merchant" className="block text-sm font-semibold text-primary mb-1">
            Merchant / Payee
          </label>
          <input
            id="merchant"
            type="text"
            required
            placeholder="e.g. Agora Supermarket"
            value={merchant}
            onChange={(e) => {
              setMerchant(e.target.value);
              if (!showCategoryRemember) setShowCategoryRemember(true);
            }}
            onBlur={(e) => autoPredictCategory(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md shadow-xs bg-input focus:ring-primary focus:border-primary text-sm"
          />
        </div>

        {/* Category Setup */}
        <div>
          <label htmlFor="category" className="block text-sm font-semibold text-primary mb-1">
            Category
          </label>
          <select
            id="category"
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md shadow-xs bg-input focus:ring-primary focus:border-primary text-sm text-primary font-medium"
          >
            <option value="">Select Category</option>
            {categories.filter(c => !c.is_archived).map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          {showCategoryRemember && merchant.trim() && categoryId && (
            <div className="flex items-center gap-2 mt-2">
              <input
                id="rememberRule"
                type="checkbox"
                checked={showCategoryRemember}
                onChange={(e) => setShowCategoryRemember(e.target.checked)}
                className="rounded border-border focus:ring-primary h-3.5 w-3.5"
              />
              <label htmlFor="rememberRule" className="text-xs text-muted-foreground leading-none">
                Remember category for next time?
              </label>
            </div>
          )}
        </div>

        {/* Recurring Option */}
        <div className="p-3 bg-background border border-border rounded-md space-y-3">
          <div className="flex items-center gap-2">
            <input
              id="isRec"
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="rounded border-border focus:ring-primary h-4 w-4"
            />
            <label htmlFor="isRec" className="text-xs font-semibold text-primary">
              Make this a recurring monthly expense
            </label>
          </div>

          {isRecurring && (
            <div className="flex gap-2 items-center text-xs animate-fade-in">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Frequency</span>
              <select
                value={recurringFrequency}
                onChange={(e) => setRecurringFrequency(e.target.value)}
                className="p-1 border border-border rounded bg-white text-xs text-primary"
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          )}
        </div>

        {/* Details Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs font-bold text-primary hover:underline block text-left"
        >
          {showAdvanced ? '─ Hide details' : '┼ Show details (Date, Payer, Split weights, Notes, Payment)'}
        </button>

        {showAdvanced && (
          <div className="space-y-6 pt-4 border-t border-border/60 animate-fade-in">
            {/* Expense Date */}
            <div>
              <label htmlFor="date" className="block text-sm font-semibold text-primary mb-1">
                Expense date
              </label>
              <input
                id="date"
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md shadow-xs bg-input focus:ring-primary focus:border-primary text-sm"
              />
            </div>

            {/* Paid By & Visibility */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="paidBy" className="block text-sm font-semibold text-primary mb-1">
                  Paid by
                </label>
                <select
                  id="paidBy"
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md shadow-xs bg-input focus:ring-primary focus:border-primary text-sm"
                >
                  {members.map(m => (
                    <option key={m.profile_id} value={m.profile_id}>{m.display_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="visibility" className="block text-sm font-semibold text-primary mb-1">
                  Visibility
                </label>
                <select
                  id="visibility"
                  value={visibility}
                  onChange={(e) => handleVisibilityChange(e.target.value as any)}
                  className="w-full px-3 py-2 border border-border rounded-md shadow-xs bg-input focus:ring-primary focus:border-primary text-sm"
                >
                  <option value="private">Private to me</option>
                  {!isSolo && (
                    <>
                      <option value="shared_all">Shared with the whole group</option>
                      <option value="shared_selected">Shared with selected members</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* SHARED split options panel */}
            {visibility !== 'private' && (
              <div className="p-4 bg-background border border-border rounded-md space-y-4">
                <div>
                  <span className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">Split responsibility</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="splitMethod" className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Split Method</label>
                      <select
                        id="splitMethod"
                        value={splitMethod}
                        onChange={(e) => setSplitMethod(e.target.value as any)}
                        className="w-full px-2 py-1.5 border border-border rounded-md bg-white text-xs font-semibold text-primary"
                      >
                        <option value="equal">Equal split</option>
                        <option value="percentage">Percentage splits</option>
                        <option value="fixed">Fixed amounts</option>
                        <option value="shares">Shares/Units</option>
                        <option value="income_weighted">Income weighted</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* List of participants checkboxes and custom input values */}
                <div className="space-y-2.5">
                  <span className="block text-[10px] font-bold text-muted-foreground uppercase">Select Participants</span>
                  <div className="space-y-2">
                    {members.map((m) => {
                      const isChecked = participants.includes(m.profile_id);
                      return (
                        <div key={m.profile_id} className="flex items-center justify-between text-xs p-1.5 rounded-md hover:bg-white/50">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`p-${m.profile_id}`}
                              checked={isChecked}
                              onChange={() => toggleParticipant(m.profile_id)}
                              className="rounded border-border focus:ring-primary h-4 w-4"
                            />
                            <label htmlFor={`p-${m.profile_id}`} className="font-semibold text-primary">
                              {m.display_name}
                            </label>
                          </div>

                          {/* Custom value inputs if not equal split */}
                          {isChecked && splitMethod !== 'equal' && (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={0}
                                placeholder={splitMethod === 'percentage' ? '0' : '0.00'}
                                value={customValues[m.profile_id] !== undefined ? customValues[m.profile_id] : ''}
                                onChange={(e) => setCustomValues({
                                  ...customValues,
                                  [m.profile_id]: parseFloat(e.target.value) || 0
                                })}
                                className="w-20 px-2 py-1 border border-border rounded-md bg-white text-right font-bold text-xs"
                              />
                              <span className="text-[10px] text-muted-foreground font-bold">
                                {splitMethod === 'percentage' ? '%' : splitMethod === 'fixed' ? currency : splitMethod === 'shares' ? 'shares' : 'BDT'}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Payment details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="paymentMethod" className="block text-sm font-semibold text-primary mb-1">
                  Payment method
                </label>
                <select
                  id="paymentMethod"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md shadow-xs bg-input focus:ring-primary focus:border-primary text-sm"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card / Debit / Credit</option>
                  <option value="bKash">bKash</option>
                  <option value="Nagad">Nagad</option>
                  <option value="Bank">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-semibold text-primary mb-1">
                  Notes (optional)
                </label>
                <input
                  id="notes"
                  type="text"
                  placeholder="e.g. Weekly grocery shopping"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md shadow-xs bg-input focus:ring-primary focus:border-primary text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={() => handleSave(false)}
            className="w-full sm:w-auto px-6 py-2.5 bg-primary text-primary-foreground font-bold text-sm rounded-md shadow-xs hover:opacity-90 transition-all text-center"
          >
            Save expense
          </button>
          
          <button
            type="button"
            onClick={() => handleSave(true)}
            className="w-full sm:w-auto px-6 py-2.5 border border-primary text-primary bg-white font-bold text-sm rounded-md hover:bg-secondary transition-all text-center"
          >
            Save and add another
          </button>

          <button
            type="button"
            onClick={() => router.push('/dashboard/expenses')}
            className="w-full sm:w-auto sm:ml-auto px-6 py-2.5 border border-border text-muted-foreground hover:text-primary rounded-md text-sm transition-colors text-center"
          >
            Cancel
          </button>
        </div>

      </div>
      {/* AI CATEGORY SELECT POPUP */}
      {showCategoryPopup && (
        <div className="fixed inset-0 bg-primary/20 backdrop-blur-xs flex items-center justify-center p-6 z-50 animate-fade-in">
          <div className="bg-white border border-border rounded-lg p-6 max-w-md w-full space-y-4 shadow-xl text-xs">
            <h3 className="font-extrabold text-sm text-primary uppercase tracking-wider flex items-center gap-1.5">
              🤖 AI Categorizer
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              We couldn't decipher a category matching **"{merchant}"** automatically. Please select one:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto pt-2">
              {categories.filter(c => !c.is_archived).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategoryId(cat.id);
                    setShowCategoryPopup(false);
                  }}
                  className="p-2 border border-border rounded-md hover:bg-secondary text-primary font-semibold text-center truncate hover:border-primary transition-all"
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setShowCategoryPopup(false)}
                className="w-full py-2 border border-border text-muted-foreground hover:text-primary font-bold rounded-md hover:bg-secondary text-center"
              >
                Skip / Choose later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AddExpensePage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <AddExpenseForm />
    </Suspense>
  );
}
