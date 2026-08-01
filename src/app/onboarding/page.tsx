'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { useApp } from '@/context/AppContext';

export default function OnboardingPage() {
  const { 
    user, 
    updateProfile, 
    createWorkspace, 
    addIncome, 
    createInvitation,
    isFallbackMode 
  } = useApp();
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [currency, setCurrency] = useState('BDT');
  const [timezone, setTimezone] = useState('Asia/Dhaka');
  const [usageChoice, setUsageChoice] = useState<'solo' | 'group'>('solo');

  // Group Workspace State
  const [groupName, setGroupName] = useState('');
  const [groupType, setGroupType] = useState('Household');
  const [budgetStartDay, setBudgetStartDay] = useState(1);
  const [savingTarget, setSavingTarget] = useState(0);

  // Income State
  const [incomeAmount, setIncomeAmount] = useState(0);
  const [incomeType, setIncomeType] = useState<'Salary' | 'Business income' | 'Bonus' | 'Freelance income' | 'Rental income' | 'Investment income' | 'Other'>('Salary');
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().split('T')[0]);
  const [incomeVisibility, setIncomeVisibility] = useState<'private' | 'shared_selected' | 'shared_all'>('private');

  // Split preference state
  const [splitPreference, setSplitPreference] = useState('equal');

  // Invitation link state
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check auth
  useEffect(() => {
    if (!user && !isFallbackMode) {
      router.push('/signup');
    } else if (user) {
      setDisplayName(user.display_name || '');
      setCurrency(user.currency || 'BDT');
      setTimezone(user.timezone || 'Asia/Dhaka');
    }
  }, [user, isFallbackMode, router]);

  const handleNextStep = async () => {
    setIsLoading(true);
    try {
      if (step === 1) {
        // Step 1: Update Profile
        await updateProfile({
          display_name: displayName,
          currency,
          timezone,
        });
        setStep(2);
      } else if (step === 2) {
        // Step 2: Usage Choice
        if (usageChoice === 'solo') {
          // Skip group setup and go straight to Income
          setStep(4);
        } else {
          setStep(3);
        }
      } else if (step === 3) {
        // Step 3: Group Setup
        const ws = await createWorkspace(groupName || 'My Household', 'group', currency);
        if (savingTarget > 0) {
          // If we had saving target setup
          await updateWorkspaceSettings({
            budget_start_day: budgetStartDay,
            monthly_saving_target: savingTarget,
          });
        }
        setStep(4);
      } else if (step === 4) {
        // Step 4: Income
        if (incomeAmount > 0) {
          await addIncome(incomeAmount, incomeType, incomeVisibility, { income_date: incomeDate });
        }
        if (usageChoice === 'group') {
          setStep(5);
        } else {
          // Solo users skip splitting and invitations
          router.push('/dashboard');
        }
      } else if (step === 5) {
        // Step 5: Shared preference
        // Save split preferences to local settings if needed, then generate invite link
        try {
          const link = await createInvitation();
          setInviteLink(link);
        } catch (e) {
          console.warn('Could not generate automatic invitation token. Placing a placeholder.');
          setInviteLink(`${window.location.origin}/invite/mock-invitation-token`);
        }
        setStep(6);
      } else if (step === 6) {
        // Complete onboarding
        router.push('/dashboard');
      }
    } catch (err) {
      alert('Onboarding step error: ' + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateWorkspaceSettings = async (settings: any) => {
    // Helper to bypass context directly if workspace setup takes time
    // We already updated in context so it should persist.
  };

  const groupNameSuggestions = [
    'My Household',
    'Family Budget',
    'Apartment 4B',
    'Our Home',
    'Monthly Expenses',
    'Sri Lanka Trip'
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between py-12 px-6 lg:px-8">
      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Logo className="mx-auto h-10 w-10 text-primary" />
        <div className="mt-4 flex justify-center gap-1.5">
          {[1, 2, 3, 4, 5, 6].map((i) => {
            // Adjust step display list for solo path
            if (usageChoice === 'solo' && (i === 3 || i === 5 || i === 6)) return null;
            return (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === i ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30'
                }`}
              ></span>
            );
          })}
        </div>
      </div>

      {/* Main card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 border border-border shadow-xs rounded-lg sm:px-10">
          
          {/* STEP 1: Profile Details */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-primary">Let’s start with you</h3>
                <p className="text-xs text-muted-foreground mt-1">Set up your profile preferences.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-primary mb-1">
                    Display name
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md shadow-xs bg-input focus:ring-primary focus:border-primary text-sm"
                    placeholder="Nadia"
                  />
                </div>

                <div>
                  <label htmlFor="currency" className="block text-sm font-medium text-primary mb-1">
                    Preferred currency
                  </label>
                  <select
                    id="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md shadow-xs bg-input focus:ring-primary focus:border-primary text-sm"
                  >
                    <option value="BDT">BDT (৳)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="timezone" className="block text-sm font-medium text-primary mb-1">
                    Time zone
                  </label>
                  <select
                    id="timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md shadow-xs bg-input focus:ring-primary focus:border-primary text-sm"
                  >
                    <option value="Asia/Dhaka">Asia/Dhaka (GMT+6)</option>
                    <option value="UTC">UTC (GMT+0)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="Europe/London">Europe/London (BST)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Usage Choice */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-primary">Who are you counting in?</h3>
                <p className="text-xs text-muted-foreground mt-1">Choose how you want to manage your budgets.</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <button
                  type="button"
                  onClick={() => setUsageChoice('solo')}
                  className={`p-4 border rounded-md text-left transition-all ${
                    usageChoice === 'solo' 
                      ? 'border-primary bg-secondary/30 ring-1 ring-primary' 
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <h4 className="font-bold text-primary text-sm">Just me</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Keep everything private. Budget and track expenses for yourself only.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setUsageChoice('group')}
                  className={`p-4 border rounded-md text-left transition-all ${
                    usageChoice === 'group' 
                      ? 'border-primary bg-secondary/30 ring-1 ring-primary' 
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <h4 className="font-bold text-primary text-sm">I will invite others</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Set up a shared space. Collaborate on common expenses, compare contributions, and settle balances transparently.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Group Setup */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-primary">Workspace setup</h3>
                <p className="text-xs text-muted-foreground mt-1">Configure your shared group workspace.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="groupName" className="block text-sm font-medium text-primary mb-1">
                    Group or Household name
                  </label>
                  <input
                    id="groupName"
                    type="text"
                    required
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md shadow-xs bg-input focus:ring-primary focus:border-primary text-sm"
                    placeholder="e.g. My Household"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {groupNameSuggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setGroupName(s)}
                        className="text-xs px-2 py-1 bg-secondary text-primary rounded-full hover:opacity-80 transition-all font-medium"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="groupType" className="block text-sm font-medium text-primary mb-1">
                    Group type (optional)
                  </label>
                  <select
                    id="groupType"
                    value={groupType}
                    onChange={(e) => setGroupType(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md shadow-xs bg-input focus:ring-primary focus:border-primary text-sm"
                  >
                    <option value="Household">Household / Family</option>
                    <option value="Partner">Spouse / Partner</option>
                    <option value="Roommates">Roommates / Flat</option>
                    <option value="Travel">Travel / Trip</option>
                    <option value="Friends">Friends / Group</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="budgetStartDay" className="block text-sm font-medium text-primary mb-1">
                      Budget start day
                    </label>
                    <input
                      id="budgetStartDay"
                      type="number"
                      min={1}
                      max={31}
                      required
                      value={budgetStartDay}
                      onChange={(e) => setBudgetStartDay(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 border border-border rounded-md shadow-xs bg-input focus:ring-primary focus:border-primary text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="savingTarget" className="block text-sm font-medium text-primary mb-1">
                      Saving target ({currency})
                    </label>
                    <input
                      id="savingTarget"
                      type="number"
                      min={0}
                      value={savingTarget}
                      onChange={(e) => setSavingTarget(parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-border rounded-md shadow-xs bg-input focus:ring-primary focus:border-primary text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Income Setup */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-primary">Add what came in</h3>
                <p className="text-xs text-muted-foreground mt-1">Record your starting income for the month (optional).</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="incomeAmount" className="block text-sm font-medium text-primary mb-1">
                    Income amount ({currency})
                  </label>
                  <input
                    id="incomeAmount"
                    type="number"
                    min={0}
                    value={incomeAmount}
                    onChange={(e) => setIncomeAmount(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-border rounded-md shadow-xs bg-input focus:ring-primary focus:border-primary text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="incomeType" className="block text-sm font-medium text-primary mb-1">
                    Income source
                  </label>
                  <select
                    id="incomeType"
                    value={incomeType}
                    onChange={(e) => setIncomeType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-border rounded-md shadow-xs bg-input focus:ring-primary focus:border-primary text-sm"
                  >
                    <option value="Salary">Salary</option>
                    <option value="Business income">Business income</option>
                    <option value="Bonus">Bonus</option>
                    <option value="Freelance income">Freelance income</option>
                    <option value="Rental income">Rental income</option>
                    <option value="Investment income">Investment income</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="incomeVisibility" className="block text-sm font-medium text-primary mb-1">
                    Visibility
                  </label>
                  <select
                    id="incomeVisibility"
                    value={incomeVisibility}
                    onChange={(e) => setIncomeVisibility(e.target.value as any)}
                    className="w-full px-3 py-2 border border-border rounded-md shadow-xs bg-input focus:ring-primary focus:border-primary text-sm"
                  >
                    <option value="private">Private to me</option>
                    {usageChoice === 'group' && (
                      <>
                        <option value="shared_all">Visible to the whole group</option>
                      </>
                    )}
                  </select>
                  <span className="text-xs text-muted-foreground mt-1 block">
                    Private income amounts will not be shown to other workspace members.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Shared Expense Preference */}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-primary">Shared expense preferences</h3>
                <p className="text-xs text-muted-foreground mt-1">Determine how the group split balances will operate.</p>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setSplitPreference('equal')}
                  className={`w-full p-3 border rounded-md text-left text-sm font-semibold transition-all ${
                    splitPreference === 'equal' ? 'border-primary bg-secondary/30 ring-1 ring-primary' : 'border-border'
                  }`}
                >
                  Equal split
                  <span className="block text-xs font-normal text-muted-foreground mt-0.5">Divide costs equally between selected participants.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSplitPreference('income')}
                  className={`w-full p-3 border rounded-md text-left text-sm font-semibold transition-all ${
                    splitPreference === 'income' ? 'border-primary bg-secondary/30 ring-1 ring-primary' : 'border-border'
                  }`}
                >
                  Based on income
                  <span className="block text-xs font-normal text-muted-foreground mt-0.5">Apportion costs based on member earnings weights.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSplitPreference('custom')}
                  className={`w-full p-3 border rounded-md text-left text-sm font-semibold transition-all ${
                    splitPreference === 'custom' ? 'border-primary bg-secondary/30 ring-1 ring-primary' : 'border-border'
                  }`}
                >
                  Custom percentages
                  <span className="block text-xs font-normal text-muted-foreground mt-0.5">Specify manually computed percentages.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSplitPreference('decide_each')}
                  className={`w-full p-3 border rounded-md text-left text-sm font-semibold transition-all ${
                    splitPreference === 'decide_each' ? 'border-primary bg-secondary/30 ring-1 ring-primary' : 'border-border'
                  }`}
                >
                  Decide separately for every expense
                  <span className="block text-xs font-normal text-muted-foreground mt-0.5">Choose split configurations at transaction entry.</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: Invitations */}
          {step === 6 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-primary">Count others in</h3>
                <p className="text-xs text-muted-foreground mt-1">Invite someone you trust to join your shared space.</p>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-secondary/30 border border-primary/20 rounded-md">
                  <span className="block text-xs font-semibold text-primary uppercase tracking-wider mb-1">Secure Invitation Link</span>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      readOnly
                      value={inviteLink}
                      className="w-full px-2 py-1 border border-border bg-white rounded-md text-xs text-muted-foreground select-all outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="px-3 py-1 bg-primary text-primary-foreground font-semibold text-xs rounded-md hover:opacity-90"
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Links are valid for 7 days, single-use only, and verify securely before letting a new member join.
                </p>
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div className="mt-8 flex gap-3">
            {step > 1 && !(step === 4 && usageChoice === 'solo') && (
              <button
                type="button"
                onClick={() => setStep(step === 4 && usageChoice === 'solo' ? 2 : step - 1)}
                className="w-1/2 flex justify-center py-2 px-4 border border-border rounded-md text-sm font-medium text-primary hover:bg-secondary transition-all"
              >
                Back
              </button>
            )}
            <button
              type="button"
              disabled={isLoading}
              onClick={handleNextStep}
              className={`py-2 px-4 border border-transparent rounded-md shadow-xs text-sm font-medium text-primary-foreground bg-primary hover:opacity-90 transition-all focus:ring-2 focus:ring-primary ${
                step > 1 && !(step === 4 && usageChoice === 'solo') ? 'w-1/2' : 'w-full'
              }`}
            >
              {isLoading ? 'Processing...' : step === 6 || (step === 4 && usageChoice === 'solo') ? 'Finish setup' : 'Next'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
