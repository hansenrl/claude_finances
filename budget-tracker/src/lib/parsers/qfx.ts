import { Ofx } from 'ofx-data-extractor';
import type { Transaction, ParseError } from '../../types';
import { generateTransactionId } from '../utils';

export async function parseQFX(content: string, _filename?: string): Promise<{
  transactions: Transaction[];
  errors: ParseError[];
}> {
  const errors: ParseError[] = [];
  const transactions: Transaction[] = [];

  try {
    const ofx = new Ofx(content);
    ofx.config({ nativeTypes: true });

    const type = ofx.getType();
    const rawTransactions = type === 'CREDIT_CARD'
      ? ofx.getCreditCardTransferList()
      : ofx.getBankTransferList();

    // Get account ID if available
    const accountId = extractAccountId(ofx);

    for (const txn of rawTransactions) {
      try {
        // Parse date
        const date = parseOFXDate(txn.DTPOSTED);
        if (!date) {
          errors.push({
            field: 'DTPOSTED',
            message: `Invalid date format: ${txn.DTPOSTED}`,
            severity: 'error'
          });
          continue;
        }

        // Parse amount
        const amount = typeof txn.TRNAMT === "number" ? txn.TRNAMT : parseFloat(txn.TRNAMT);
        if (isNaN(amount)) {
          errors.push({
            field: 'TRNAMT',
            message: `Invalid amount: ${String(txn.TRNAMT)}`,
            severity: 'error'
          });
          continue;
        }

        // Decode HTML entities in merchant name
        const description = decodeHTMLEntities(txn.NAME || 'Unknown');

        // Generate consistent ID
        const id = await generateTransactionId(date, amount, description, accountId);

        transactions.push({
          id,
          date,
          description,
          amount, // QFX: negative = debit, positive = credit (already normalized)
          type: txn.TRNTYPE as 'DEBIT' | 'CREDIT',
          isExcluded: false,
          source: 'QFX',
          accountId,
          transactionId: txn.FITID,
          memo: txn.MEMO,
          isManuallyCategorized: false,
        });
      } catch (error) {
        errors.push({
          message: `Error parsing transaction: ${error}`,
          severity: 'error'
        });
      }
    }

    if (transactions.length === 0 && rawTransactions.length > 0) {
      errors.push({
        message: 'No valid transactions found in QFX file',
        severity: 'error'
      });
    }

  } catch (error) {
    errors.push({
      message: `Error parsing QFX file: ${error}`,
      severity: 'error'
    });
  }

  return { transactions, errors };
}

function parseOFXDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  try {
    // Format: YYYYMMDDHHMMSS or YYYYMMDDHHMMSS[OFFSET:GMT] or YYYYMMDDHHMMSS.mmm
    let cleaned = dateStr.split('[')[0].split('.')[0];

    // Extract date parts
    const year = parseInt(cleaned.substring(0, 4), 10);
    const month = parseInt(cleaned.substring(4, 6), 10) - 1; // 0-indexed
    const day = parseInt(cleaned.substring(6, 8), 10);

    const date = new Date(year, month, day);

    if (isNaN(date.getTime())) {
      return null;
    }

    return date;
  } catch {
    return null;
  }
}

function extractAccountId(ofx: any): string | undefined {
  try {
    const type = ofx.getType();
    const data = ofx.toJson();

    if (type === 'CREDIT_CARD') {
      return data.OFX?.CREDITCARDMSGSRSV1?.CCSTMTTRNRS?.CCSTMTRS?.CCACCTFROM?.ACCTID;
    } else {
      return data.OFX?.BANKMSGSRSV1?.STMTTRNRS?.STMTRS?.BANKACCTFROM?.ACCTID;
    }
  } catch {
    return undefined;
  }
}

function decodeHTMLEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
  };

  return text.replace(/&[a-z0-9#]+;/gi, (match) => entities[match] || match);
}
