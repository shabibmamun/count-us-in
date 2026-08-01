/**
 * Count Us In - Financial Calculation & Rounding Utilities
 * core calculations for expense splitting and group settlements.
 */

export type SplitMethod = 'equal' | 'percentage' | 'fixed' | 'shares' | 'income_weighted';

export interface ParticipantInput {
  profileId: string;
  value?: number; // percentage, fixed amount, shares/units, or income
}

export interface SplitResult {
  profileId: string;
  amount: number;
  value?: number;
}

/**
 * Deterministically splits an expense total using the specified method.
 * Handles rounding errors by adjusting the largest share or the payer.
 * 
 * @param total The total expense amount.
 * @param participants List of participant inputs (profileId and optional custom value).
 * @param method The split method (equal, percentage, fixed, shares, income_weighted).
 * @param payerId The profile ID of the person who paid for the expense.
 * @returns An array of SplitResult indicating how much each participant is responsible for.
 */
export function calculateSplit(
  total: number,
  participants: ParticipantInput[],
  method: SplitMethod,
  payerId: string
): SplitResult[] {
  if (participants.length === 0) {
    throw new Error('At least one participant is required.');
  }
  if (total <= 0) {
    throw new Error('Amount must be greater than zero.');
  }

  // Ensure total is clean to 2 decimal places
  const totalCents = Math.round(total * 100);
  let distributedCents = 0;
  const results: { profileId: string; cents: number }[] = [];

  switch (method) {
    case 'equal': {
      const count = participants.length;
      const baseCents = Math.floor(totalCents / count);
      let remainderCents = totalCents % count;

      // Distribute base cents
      for (const p of participants) {
        results.push({ profileId: p.profileId, cents: baseCents });
      }

      // Distribute remaining cents one by one to participants.
      // First try to assign to the payer if they are participating.
      const payerIdx = results.findIndex(r => r.profileId === payerId);
      if (payerIdx !== -1 && remainderCents > 0) {
        results[payerIdx].cents += 1;
        remainderCents -= 1;
      }

      // Then distribute to others
      let idx = 0;
      while (remainderCents > 0) {
        if (results[idx].profileId !== payerId || payerIdx === -1) {
          results[idx].cents += 1;
          remainderCents -= 1;
        }
        idx = (idx + 1) % count;
      }
      break;
    }

    case 'percentage': {
      let percentSum = 0;
      for (const p of participants) {
        const val = p.value || 0;
        if (val < 0) throw new Error('Percentage cannot be negative.');
        percentSum += val;
      }
      // Allow minor floating point variances in percentage total, but must be ~100
      if (Math.abs(percentSum - 100) > 0.01) {
        throw new Error(`Percentages must sum to 100. Current sum: ${percentSum}`);
      }

      // Calculate raw cents
      for (const p of participants) {
        const shareCents = Math.round((totalCents * (p.value || 0)) / 100);
        results.push({ profileId: p.profileId, cents: shareCents });
        distributedCents += shareCents;
      }

      // Reconcile rounding differences on the payer (if participating) or the first participant
      let diff = totalCents - distributedCents;
      if (diff !== 0) {
        const adjustIdx = results.findIndex(r => r.profileId === payerId);
        if (adjustIdx !== -1) {
          results[adjustIdx].cents += diff;
        } else {
          results[0].cents += diff;
        }
      }
      break;
    }

    case 'fixed': {
      let fixedCentsSum = 0;
      for (const p of participants) {
        const val = p.value || 0;
        if (val < 0) throw new Error('Fixed amount cannot be negative.');
        const cents = Math.round(val * 100);
        results.push({ profileId: p.profileId, cents });
        fixedCentsSum += cents;
      }

      if (fixedCentsSum !== totalCents) {
        throw new Error(
          `Sum of fixed splits (${fixedCentsSum / 100}) must equal total amount (${total}).`
        );
      }
      break;
    }

    case 'shares':
    case 'income_weighted': {
      let totalShares = 0;
      for (const p of participants) {
        const val = p.value || 0;
        if (val <= 0) throw new Error('Shares or income weight must be positive.');
        totalShares += val;
      }

      if (totalShares <= 0) {
        throw new Error('Total shares or weight must be greater than zero.');
      }

      // Calculate split cents proportionally
      for (const p of participants) {
        const shareCents = Math.round((totalCents * (p.value || 0)) / totalShares);
        results.push({ profileId: p.profileId, cents: shareCents });
        distributedCents += shareCents;
      }

      // Adjust rounding discrepancies
      let diff = totalCents - distributedCents;
      if (diff !== 0) {
        // Find participant with largest share to absorb the rounding adjustment
        let maxCentsIdx = 0;
        for (let i = 1; i < results.length; i++) {
          if (results[i].cents > results[maxCentsIdx].cents) {
            maxCentsIdx = i;
          }
        }
        results[maxCentsIdx].cents += diff;
      }
      break;
    }

    default:
      throw new Error(`Unsupported split method: ${method}`);
  }

  // Convert cents back to decimals
  return results.map(r => ({
    profileId: r.profileId,
    amount: Number((r.cents / 100).toFixed(2)),
  }));
}

export interface MemberBalance {
  profileId: string;
  displayName: string;
  paid: number;
  responsibility: number;
  settledPaid: number;
  settledReceived: number;
}

export interface MemberPosition {
  profileId: string;
  displayName: string;
  netPosition: number; // positive = owed money, negative = owes money
}

export interface SuggestedTransfer {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

/**
 * Calculates net positions and generates an optimized, minimized set of transfers to balance the group.
 * 
 * Net position = Shared Paid - Responsibility + Settlement Paid - Settlement Received
 * 
 * @param balances List of current member balances (expenses & settlements already made).
 * @returns An object containing positions and suggested transfers.
 */
export function calculateSettlements(balances: MemberBalance[]): {
  positions: MemberPosition[];
  transfers: SuggestedTransfer[];
} {
  // 1. Calculate net positions
  const positions: MemberPosition[] = balances.map(b => {
    const net = b.paid - b.responsibility + b.settledPaid - b.settledReceived;
    return {
      profileId: b.profileId,
      displayName: b.displayName,
      netPosition: Number(net.toFixed(2)),
    };
  });

  // Verify that sum of positions is zero (within minor rounding differences)
  const sum = positions.reduce((acc, p) => acc + p.netPosition, 0);
  if (Math.abs(sum) > 0.05) {
    // Small deviation can occur due to outside database updates, but we clean it during transfer calculation
    console.warn(`Net positions do not balance to zero: sum = ${sum}`);
  }

  // 2. Generate optimized transfers
  const debtors: { id: string; name: string; amount: number }[] = [];
  const creditors: { id: string; name: string; amount: number }[] = [];

  for (const pos of positions) {
    const amt = pos.netPosition;
    if (amt < -0.009) {
      debtors.push({ id: pos.profileId, name: pos.displayName, amount: -amt }); // Store as positive debt
    } else if (amt > 0.009) {
      creditors.push({ id: pos.profileId, name: pos.displayName, amount: amt });
    }
  }

  // Sort descending to settle largest amounts first
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers: SuggestedTransfer[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    // Transfer is limited by whichever is smaller (debt or credit)
    const transferAmount = Math.min(debtor.amount, creditor.amount);

    if (transferAmount > 0.009) {
      transfers.push({
        fromId: debtor.id,
        fromName: debtor.name,
        toId: creditor.id,
        toName: creditor.name,
        amount: Number(transferAmount.toFixed(2)),
      });

      debtor.amount -= transferAmount;
      creditor.amount -= transferAmount;
    }

    if (debtor.amount < 0.009) {
      dIdx++;
    }
    if (creditor.amount < 0.009) {
      cIdx++;
    }
  }

  return {
    positions,
    transfers,
  };
}
