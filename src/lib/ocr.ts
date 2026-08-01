import { createWorker } from 'tesseract.js';

export interface OCRResult {
  merchant: string;
  amount: number;
  date: string;
  currency: string;
  paymentMethod: string;
  rawText: string;
  possibleAmounts: number[];
}

/**
 * Parses raw OCR text to identify merchant, total amount, transaction date, currency, and payment method.
 * 
 * @param text The raw extracted text from the receipt.
 * @returns A structured OCRResult object.
 */
export function parseReceiptText(text: string): Omit<OCRResult, 'rawText'> {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let merchant = '';
  let amount = 0;
  let date = new Date().toISOString().split('T')[0]; // Default to today
  let currency = 'BDT'; // Default to BDT
  let paymentMethod = 'Cash'; // Default to Cash
  const possibleAmounts: number[] = [];

  if (lines.length > 0) {
    // 1. Merchant name is typically at the top of the receipt
    // Grab the first line that doesn't look like code, digits, or common headers
    const merchantCandidates = lines.slice(0, 3).filter(l => {
      const containsDigits = /\d/.test(l);
      const isTooShort = l.length < 3;
      const isCommonHeader = /receipt|invoice|tax|bill|welcome/i.test(l);
      return !containsDigits && !isTooShort && !isCommonHeader;
    });
    merchant = merchantCandidates[0] || lines[0] || 'Unknown Merchant';
    // Clean up merchant name (strip leading/trailing punctuation)
    merchant = merchant.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9\s.\-_&]+$/g, '').trim();
  }

  // 2. Parse numbers/amounts
  // Regex to match typical money amounts (e.g. 100, 100.00, 1,200.50)
  const amountRegex = /(?:BDT|TK|USD|[$€£])?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))\b|\b(\d+\.\d{2})\b/gi;
  let match;
  while ((match = amountRegex.exec(text)) !== null) {
    const numStr = (match[1] || match[2]).replace(/,/g, '');
    const num = parseFloat(numStr);
    if (!isNaN(num) && num > 0 && !possibleAmounts.includes(num)) {
      possibleAmounts.push(num);
    }
  }

  // Also catch simple integers if no decimals were found
  if (possibleAmounts.length === 0) {
    const intRegex = /\b\d+\b/g;
    while ((match = intRegex.exec(text)) !== null) {
      const num = parseInt(match[0], 10);
      if (!isNaN(num) && num > 0 && num < 1000000 && !possibleAmounts.includes(num)) {
        possibleAmounts.push(num);
      }
    }
  }

  // Sort possible amounts descending. The total is usually the largest number on the receipt.
  if (possibleAmounts.length > 0) {
    possibleAmounts.sort((a, b) => b - a);
    amount = possibleAmounts[0];
  }

  // 3. Detect date
  // Matches YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, MM/DD/YYYY
  const dateRegex = /\b(\d{4}[-/]\d{2}[-/]\d{2})|(\d{2}[-/]\d{2}[-/]\d{4})\b/g;
  const dateMatch = text.match(dateRegex);
  if (dateMatch && dateMatch.length > 0) {
    const rawDate = dateMatch[0].replace(/\//g, '-');
    // Try to format to YYYY-MM-DD if DD-MM-YYYY
    const parts = rawDate.split('-');
    if (parts[0].length === 2 && parts[2].length === 4) {
      // DD-MM-YYYY -> YYYY-MM-DD
      date = `${parts[2]}-${parts[1]}-${parts[0]}`;
    } else if (parts[0].length === 4) {
      date = rawDate; // Already YYYY-MM-DD
    }
  }

  // 4. Detect currency
  if (/usd|\$/i.test(text)) {
    currency = 'USD';
  } else if (/eur|€/i.test(text)) {
    currency = 'EUR';
  } else if (/bdt|tk|taka/i.test(text)) {
    currency = 'BDT';
  }

  // 5. Detect payment method
  if (/bkash/i.test(text)) {
    paymentMethod = 'bKash';
  } else if (/nagad/i.test(text)) {
    paymentMethod = 'Nagad';
  } else if (/visa|mastercard|card|credit|debit|amex/i.test(text)) {
    paymentMethod = 'Card';
  } else if (/cash/i.test(text)) {
    paymentMethod = 'Cash';
  }

  return {
    merchant,
    amount,
    date,
    currency,
    paymentMethod,
    possibleAmounts,
  };
}

/**
 * Runs client-side Tesseract OCR on a receipt image.
 * 
 * @param imageFile Compressed WebP or original image file.
 * @param onProgress Callback to report progress states.
 * @returns Parsed receipt details.
 */
export async function performOCR(
  imageFile: File,
  onProgress?: (message: string) => void
): Promise<OCRResult> {
  onProgress?.('Preparing your image...');
  
  // Create object URL for Tesseract
  const objectUrl = URL.createObjectURL(imageFile);
  
  onProgress?.('Reading the details...');
  const worker = await createWorker('eng');
  
  try {
    const ret = await worker.recognize(objectUrl);
    onProgress?.('Looking for the transaction...');
    
    const rawText = ret.data.text;
    const parsed = parseReceiptText(rawText);
    
    onProgress?.('Ready for your review.');
    
    return {
      rawText,
      ...parsed,
    };
  } catch (error) {
    console.error('Tesseract OCR Error:', error);
    throw new Error('We could not read this image clearly');
  } finally {
    await worker.terminate();
    URL.revokeObjectURL(objectUrl);
  }
}
