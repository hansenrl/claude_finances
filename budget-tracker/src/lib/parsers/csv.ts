import Papa from 'papaparse';
import type { Transaction, ParseError } from '../../types';
import { generateTransactionId } from '../utils';

export async function parseCSV(content: string, _filename?: string): Promise<{
  transactions: Transaction[];
  errors: ParseError[];
}> {
  const errors: ParseError[] = [];
  const transactions: Transaction[] = [];

  return new Promise((resolve) => {
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: async (results) => {
        const { data, errors: parseErrors } = results;

        // Add CSV parsing errors
        parseErrors.forEach((error) => {
          errors.push({
            line: error.row,
            message: error.message,
            severity: 'error'
          });
        });

        // Process each row
        for (const [index, record] of (data as any[]).entries()) {
          try {
            // Expected columns: Trans. Date, Post Date, Description, Amount, Category
            const transDate = record['Trans. Date'];
            const description = record['Description'];
            const amountStr = record['Amount'];
            const category = record['Category'];

            // Validate required fields
            if (!transDate || !description || !amountStr) {
              errors.push({
                line: index + 2, // +1 for header, +1 for 0-index
                message: 'Missing required fields (Trans. Date, Description, or Amount)',
                severity: 'warning'
              });
              continue;
            }

            // Parse date (MM/DD/YYYY format)
            const date = parseCSVDate(transDate);
            if (!date) {
              errors.push({
                line: index + 2,
                field: 'Trans. Date',
                message: `Invalid date format: ${transDate}`,
                severity: 'error'
              });
              continue;
            }

            // Parse amount
            const amount = parseFloat(amountStr.replace(/,/g, ''));
            if (isNaN(amount)) {
              errors.push({
                line: index + 2,
                field: 'Amount',
                message: `Invalid amount: ${amountStr}`,
                severity: 'error'
              });
              continue;
            }

            // CSV convention: positive = debit, negative = credit
            // Normalize to: negative = debit, positive = credit
            const normalizedAmount = -amount;
            const type: 'DEBIT' | 'CREDIT' = normalizedAmount < 0 ? 'DEBIT' : 'CREDIT';

            // Generate consistent ID
            const id = await generateTransactionId(date, normalizedAmount, description);

            transactions.push({
              id,
              date,
              description: description.trim(),
              amount: normalizedAmount,
              type,
              isExcluded: false,
              source: 'CSV',
              isManuallyCategorized: false,
              // Store original category from CSV as memo for reference
              memo: category ? `Original category: ${category}` : undefined,
            });
          } catch (error) {
            errors.push({
              line: index + 2,
              message: `Error parsing row: ${error}`,
              severity: 'error'
            });
          }
        }

        if (transactions.length === 0 && data.length > 0) {
          errors.push({
            message: 'No valid transactions found in CSV file',
            severity: 'error'
          });
        }

        resolve({ transactions, errors });
      },
      error: (error: Error) => {
        errors.push({
          message: `Error parsing CSV file: ${error.message}`,
          severity: 'error'
        });
        resolve({ transactions: [], errors });
      }
    });
  });
}

function parseCSVDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  try {
    // Expected format: MM/DD/YYYY
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;

    const month = parseInt(parts[0], 10) - 1; // 0-indexed
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    const date = new Date(year, month, day);

    if (isNaN(date.getTime())) {
      return null;
    }

    return date;
  } catch {
    return null;
  }
}
