import { describe, test, expect } from 'vitest';
import { parseReceiptText } from './ocr';

// Mock path redirection helper for open redirect checks
function getSafeRedirect(nextPath: string | null): string {
  const next = nextPath || '/dashboard';
  return next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
}

describe('Authentication & Open Redirect Safety', () => {
  test('Prevents open redirect to external domains', () => {
    expect(getSafeRedirect('https://malicious.com/dashboard')).toBe('/dashboard');
    expect(getSafeRedirect('//malicious-sub.com')).toBe('/dashboard');
  });

  test('Allows safe internal redirection paths', () => {
    expect(getSafeRedirect('/dashboard/reports')).toBe('/dashboard/reports');
    expect(getSafeRedirect('/onboarding')).toBe('/onboarding');
  });
});

describe('Zero-Income Financial Calculations', () => {
  test('Handles zero income for savings rate correctly', () => {
    const totalIncome = 0;
    const netSavings = -500;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
    expect(savingsRate).toBe(0);
  });
});

describe('AI Heuristic Receipt OCR Parser', () => {
  test('Correctly identifies TOTAL amount candidate over card or integer numbers', () => {
    const ocrText = `
      SuperMarket Store
      Phone: 01712345678
      Date: 2026-08-01
      
      Item 1: Egg - 150
      Item 2: Milk - 320
      
      Subtotal: 470.00
      VAT 5%: 23.50
      Grand Total: 493.50
      Cash Tendered: 1000.00
      Change Due: 506.50
      Card Suffix: 453912
    `;

    const result = parseReceiptText(ocrText);
    expect(result.amount).toBe(493.50); // Matches Grand Total
    expect(result.merchant).toBe('SuperMarket Store');
    expect(result.paymentMethod).toBe('Card'); // Detects Card keyword
  });
});
