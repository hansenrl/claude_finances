import type { ParseResult } from '../../types';
import { parseQFX } from './qfx';
import { parseCSV } from './csv';

export type FileFormat = 'QFX' | 'CSV' | 'UNKNOWN';

export function detectFormat(filename: string, content: string): FileFormat {
  // Check extension
  const lowerFilename = filename.toLowerCase();
  if (lowerFilename.endsWith('.qfx')) {
    return 'QFX';
  }
  if (lowerFilename.endsWith('.csv')) {
    return 'CSV';
  }

  // Check content
  if (content.startsWith('OFXHEADER:') || content.includes('<OFX>')) {
    return 'QFX';
  }
  if (content.includes('Trans. Date,Post Date,Description,Amount,Category')) {
    return 'CSV';
  }

  return 'UNKNOWN';
}

export async function parseFile(
  file: File
): Promise<ParseResult> {
  try {
    const content = await file.text();
    const format = detectFormat(file.name, content);

    switch (format) {
      case 'QFX':
        return await parseQFX(content, file.name);
      case 'CSV':
        return await parseCSV(content, file.name);
      default:
        return {
          transactions: [],
          errors: [{
            message: `Unknown file format: ${file.name}. Expected .qfx or .csv file.`,
            severity: 'error'
          }]
        };
    }
  } catch (error) {
    return {
      transactions: [],
      errors: [{
        message: `Error reading file ${file.name}: ${error}`,
        severity: 'error'
      }]
    };
  }
}

export async function parseFiles(files: File[]): Promise<ParseResult> {
  const allTransactions: ParseResult['transactions'] = [];
  const allErrors: ParseResult['errors'] = [];

  for (const file of files) {
    const result = await parseFile(file);
    allTransactions.push(...result.transactions);
    allErrors.push(...result.errors);
  }

  return {
    transactions: allTransactions,
    errors: allErrors
  };
}
