import { describe, test, expect } from 'vitest';
import { calculateSplit, calculateSettlements, MemberBalance } from './calculations';

describe('Financial Split Calculations', () => {
  const payer = 'user-1';
  const participants = [
    { profileId: 'user-1' },
    { profileId: 'user-2' },
    { profileId: 'user-3' },
  ];

  test('Equal Split: Odd-number amount (100.00 split 3 ways)', () => {
    // 100.00 / 3 = 33.33, 33.33, 33.33. Remainder 0.01 goes to the payer (user-1).
    const results = calculateSplit(100.00, participants, 'equal', payer);
    
    expect(results).toHaveLength(3);
    const splitMap = new Map(results.map(r => [r.profileId, r.amount]));
    
    expect(splitMap.get('user-1')).toBe(33.34);
    expect(splitMap.get('user-2')).toBe(33.33);
    expect(splitMap.get('user-3')).toBe(33.33);
    
    // Sum must equal exactly 100.00
    const sum = results.reduce((acc, r) => acc + r.amount, 0);
    expect(sum).toBe(100.00);
  });

  test('Equal Split: Multi-member with participant exclusion', () => {
    // user-4 is in workspace but excluded from participants list
    const subParticipants = [
      { profileId: 'user-1' },
      { profileId: 'user-2' },
    ];
    // 50.00 split 2 ways
    const results = calculateSplit(50.00, subParticipants, 'equal', payer);
    expect(results).toHaveLength(2);
    expect(results.some(r => r.profileId === 'user-3')).toBe(false);
    
    const sum = results.reduce((acc, r) => acc + r.amount, 0);
    expect(sum).toBe(50.00);
  });

  test('Percentage Split: Valid percentages sum to 100', () => {
    const pctParticipants = [
      { profileId: 'user-1', value: 50 },
      { profileId: 'user-2', value: 30 },
      { profileId: 'user-3', value: 20 },
    ];
    
    const results = calculateSplit(150.00, pctParticipants, 'percentage', payer);
    const splitMap = new Map(results.map(r => [r.profileId, r.amount]));
    
    expect(splitMap.get('user-1')).toBe(75.00);
    expect(splitMap.get('user-2')).toBe(45.00);
    expect(splitMap.get('user-3')).toBe(30.00);
    
    const sum = results.reduce((acc, r) => acc + r.amount, 0);
    expect(sum).toBe(150.00);
  });

  test('Percentage Split: Rounded percentages adjustment (10.00 split 30/30/40)', () => {
    const pctParticipants = [
      { profileId: 'user-1', value: 30 },
      { profileId: 'user-2', value: 30 },
      { profileId: 'user-3', value: 40 },
    ];
    
    // Raw shares: 3.00, 3.00, 4.00. Sum = 10.00
    const results = calculateSplit(10.00, pctParticipants, 'percentage', payer);
    const sum = results.reduce((acc, r) => acc + r.amount, 0);
    expect(sum).toBe(10.00);
  });

  test('Percentage Split: Invalid percentages total throws', () => {
    const badParticipants = [
      { profileId: 'user-1', value: 50 },
      { profileId: 'user-2', value: 40 },
    ];
    
    expect(() => calculateSplit(100.00, badParticipants, 'percentage', payer)).toThrow();
  });

  test('Fixed Split: Valid fixed amounts matching total', () => {
    const fixedParticipants = [
      { profileId: 'user-1', value: 60.50 },
      { profileId: 'user-2', value: 39.50 },
    ];
    
    const results = calculateSplit(100.00, fixedParticipants, 'fixed', payer);
    const splitMap = new Map(results.map(r => [r.profileId, r.amount]));
    
    expect(splitMap.get('user-1')).toBe(60.50);
    expect(splitMap.get('user-2')).toBe(39.50);
    
    const sum = results.reduce((acc, r) => acc + r.amount, 0);
    expect(sum).toBe(100.00);
  });

  test('Fixed Split: Invalid fixed sum throws', () => {
    const fixedParticipants = [
      { profileId: 'user-1', value: 50.00 },
      { profileId: 'user-2', value: 40.00 },
    ];
    
    expect(() => calculateSplit(100.00, fixedParticipants, 'fixed', payer)).toThrow();
  });

  test('Shares Split: Proportional allocation & rounding (100.00 split 1:2:3)', () => {
    const shareParticipants = [
      { profileId: 'user-1', value: 1 },
      { profileId: 'user-2', value: 2 },
      { profileId: 'user-3', value: 3 },
    ];
    // Total shares = 6. Raw shares: 16.6666, 33.3333, 50.00
    // Rounded: 16.67, 33.33, 50.00. Sum = 100.00
    const results = calculateSplit(100.00, shareParticipants, 'shares', payer);
    const splitMap = new Map(results.map(r => [r.profileId, r.amount]));
    
    expect(splitMap.get('user-1')).toBe(16.67);
    expect(splitMap.get('user-2')).toBe(33.33);
    expect(splitMap.get('user-3')).toBe(50.00);
    
    const sum = results.reduce((acc, r) => acc + r.amount, 0);
    expect(sum).toBe(100.00);
  });

  test('Income-Weighted Split: Proportional weighting', () => {
    const incomeParticipants = [
      { profileId: 'user-1', value: 60000 },
      { profileId: 'user-2', value: 40000 },
    ];
    // Total income = 100,000. Splits: 60%, 40%
    const results = calculateSplit(250.00, incomeParticipants, 'income_weighted', payer);
    const splitMap = new Map(results.map(r => [r.profileId, r.amount]));
    
    expect(splitMap.get('user-1')).toBe(150.00);
    expect(splitMap.get('user-2')).toBe(100.00);
    
    const sum = results.reduce((acc, r) => acc + r.amount, 0);
    expect(sum).toBe(250.00);
  });
});

describe('Settlement Matrix & Optimization', () => {
  test('Greedy Settlement: Reduces number of transfers and balances to zero', () => {
    // Scenario matching product requirements description:
    // Rahim (A) should receive BDT 5,000.
    // Member B should receive BDT 2,000.
    // Member C should pay BDT 4,000.
    // Member D should pay BDT 3,000.
    const balances: MemberBalance[] = [
      { profileId: 'user-A', displayName: 'Rahim', paid: 5000, responsibility: 0, settledPaid: 0, settledReceived: 0 },
      { profileId: 'user-B', displayName: 'Member B', paid: 2000, responsibility: 0, settledPaid: 0, settledReceived: 0 },
      { profileId: 'user-C', displayName: 'Member C', paid: 0, responsibility: 4000, settledPaid: 0, settledReceived: 0 },
      { profileId: 'user-D', displayName: 'Member D', paid: 0, responsibility: 3000, settledPaid: 0, settledReceived: 0 },
    ];

    const result = calculateSettlements(balances);
    
    // Positions verification
    const positionMap = new Map(result.positions.map(p => [p.profileId, p.netPosition]));
    expect(positionMap.get('user-A')).toBe(5000.00);
    expect(positionMap.get('user-B')).toBe(2000.00);
    expect(positionMap.get('user-C')).toBe(-4000.00);
    expect(positionMap.get('user-D')).toBe(-3000.00);
    
    // Check transfers
    // Optimal transfers:
    // C pays A 4,000 (leaves A needing 1,000, C at 0)
    // D pays A 1,000 (leaves A at 0, D needing 2,000)
    // D pays B 2,000 (leaves B at 0, D at 0)
    expect(result.transfers).toHaveLength(3);
    
    const transfer1 = result.transfers.find(t => t.fromId === 'user-C' && t.toId === 'user-A');
    expect(transfer1?.amount).toBe(4000);
    
    const transfer2 = result.transfers.find(t => t.fromId === 'user-D' && t.toId === 'user-A');
    expect(transfer2?.amount).toBe(1000);
    
    const transfer3 = result.transfers.find(t => t.fromId === 'user-D' && t.toId === 'user-B');
    expect(transfer3?.amount).toBe(2000);

    // Sum of suggested transfers must equal total negative/positive positions
    const totalTransferred = result.transfers.reduce((acc, t) => acc + t.amount, 0);
    expect(totalTransferred).toBe(7000);
  });

  test('Greedy Settlement: Already balanced group returns zero transfers', () => {
    const balances: MemberBalance[] = [
      { profileId: 'user-A', displayName: 'Rahim', paid: 100, responsibility: 100, settledPaid: 0, settledReceived: 0 },
      { profileId: 'user-B', displayName: 'Nadia', paid: 200, responsibility: 200, settledPaid: 0, settledReceived: 0 },
    ];
    
    const result = calculateSettlements(balances);
    expect(result.transfers).toHaveLength(0);
    expect(result.positions.every(p => p.netPosition === 0)).toBe(true);
  });
});
