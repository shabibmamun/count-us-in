import { describe, test, expect } from 'vitest';
import { parseReceiptText } from './ocr';

describe('Receipt OCR Parser', () => {
  test('Correctly parses merchant, date, amount, currency and payment method', () => {
    const rawReceiptText = `
      AGORA SUPERMARKET
      Gulshan-2, Dhaka
      -------------------------
      DATE: 2026-08-01
      TIME: 14:35
      INV NO: 987654
      -------------------------
      GROCERIES      BDT 450.00
      FRESH FRUITS   BDT 350.00
      ORGANIC MILK   BDT 200.00
      -------------------------
      SUBTOTAL      1000.00
      VAT 5%          50.00
      TOTAL         1050.00
      -------------------------
      PAID BY: CARD VISA
      AUTH: 098765
      -------------------------
      Thank you for shopping!
    `;

    const result = parseReceiptText(rawReceiptText);

    expect(result.merchant).toBe('AGORA SUPERMARKET');
    expect(result.date).toBe('2026-08-01');
    expect(result.currency).toBe('BDT');
    expect(result.paymentMethod).toBe('Card');
    expect(result.amount).toBe(1050.00); // Largest amount (total)
    expect(result.possibleAmounts).toContain(1050.00);
    expect(result.possibleAmounts).toContain(450.00);
    expect(result.possibleAmounts).toContain(1000.00);
    expect(result.possibleAmounts[0]).toBe(1050.00); // Sorted descending
  });

  test('Gracefully handles missing data and falls back to defaults', () => {
    const messyText = `
      Random numbers 12 45
      No clear date
      Check for Cash payment
    `;
    const result = parseReceiptText(messyText);
    expect(result.merchant).toBe('No clear date'); // First line without digits
    expect(result.paymentMethod).toBe('Cash');
    expect(result.amount).toBe(45); // Largest integer
    expect(result.currency).toBe('BDT'); // Default
  });
});
