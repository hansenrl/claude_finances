import type { Transaction, ParseError } from '../../types';
import { generateTransactionId, truncateFilename } from '../utils';

export async function parseQFX(content: string, filename?: string): Promise<{
  transactions: Transaction[];
  errors: ParseError[];
}> {
  const errors: ParseError[] = [];
  const transactions: Transaction[] = [];

  try {
    // Remove OFX header and get XML content
    const xmlContent = extractXMLFromOFX(content);

    // Parse XML using DOMParser
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

    // Check for parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error('Failed to parse OFX XML: ' + parserError.textContent);
    }

    // Extract account ID
    let accountId: string | undefined;
    const bankAcctId = xmlDoc.querySelector('BANKACCTFROM ACCTID');
    const ccAcctId = xmlDoc.querySelector('CCACCTFROM ACCTID');
    accountId = bankAcctId?.textContent || ccAcctId?.textContent || undefined;

    // Get all transactions
    const stmtTrnElements = xmlDoc.querySelectorAll('STMTTRN');

    if (stmtTrnElements.length === 0) {
      errors.push({
        message: 'No transactions found in QFX file',
        severity: 'warning'
      });
      return { transactions, errors };
    }

    // Process each transaction
    for (const txnElement of Array.from(stmtTrnElements)) {
      try {
        const trnType = txnElement.querySelector('TRNTYPE')?.textContent || '';
        const dtPosted = txnElement.querySelector('DTPOSTED')?.textContent || '';
        const trnAmt = txnElement.querySelector('TRNAMT')?.textContent || '';
        const fitId = txnElement.querySelector('FITID')?.textContent || '';
        const name = txnElement.querySelector('NAME')?.textContent || 'Unknown';
        const memo = txnElement.querySelector('MEMO')?.textContent || undefined;

        // Parse date
        const date = parseOFXDate(dtPosted);
        if (!date) {
          errors.push({
            field: 'DTPOSTED',
            message: `Invalid date format: ${dtPosted}`,
            severity: 'error'
          });
          continue;
        }

        // Parse amount
        const amount = parseFloat(trnAmt);
        if (isNaN(amount)) {
          errors.push({
            field: 'TRNAMT',
            message: `Invalid amount: ${trnAmt}`,
            severity: 'error'
          });
          continue;
        }

        // Decode HTML entities in merchant name
        const description = decodeHTMLEntities(name);

        // Generate consistent ID
        const id = await generateTransactionId(date, amount, description, accountId);

        // Normalize transaction type: negative amounts are debits (expenses)
        const normalizedType = amount < 0 ? 'DEBIT' : 'CREDIT';

        transactions.push({
          id,
          date,
          description,
          amount, // QFX: negative = debit, positive = credit (already normalized)
          type: normalizedType,
          isExcluded: false,
          source: 'QFX',
          sourceFile: filename ? truncateFilename(filename) : undefined,
          accountId,
          transactionId: fitId,
          memo,
          isManuallyCategorized: false,
        });
      } catch (error) {
        errors.push({
          message: `Error parsing transaction: ${error}`,
          severity: 'error'
        });
      }
    }

    if (transactions.length === 0 && stmtTrnElements.length > 0) {
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

function extractXMLFromOFX(content: string): string {
  // OFX files start with a header, followed by XML
  // Find the start of the XML content (starts with <OFX>)
  const xmlStartIndex = content.indexOf('<OFX>');
  if (xmlStartIndex === -1) {
    throw new Error('Invalid OFX file: <OFX> tag not found');
  }

  let sgml = content.substring(xmlStartIndex);

  // Convert SGML-style OFX to proper XML
  const xml = convertOFXToXML(sgml);

  return xml;
}

function convertOFXToXML(sgml: string): string {
  // OFX uses SGML format where tags don't have closing tags
  // We need to add closing tags based on the structure

  // Strategy: Process character by character, tracking open tags
  // When we encounter a new opening tag or closing tag, close any open leaf tags

  const result: string[] = [];
  const tagStack: string[] = [];
  let i = 0;

  // Define container tags that contain other tags (not leaf nodes)
  const containerTags = new Set([
    'OFX', 'SIGNONMSGSRSV1', 'SONRS', 'STATUS', 'FI',
    'BANKMSGSRSV1', 'STMTTRNRS', 'STMTRS', 'BANKACCTFROM', 'BANKTRANLIST',
    'STMTTRN', 'LEDGERBAL', 'AVAILBAL',
    'CREDITCARDMSGSRSV1', 'CCSTMTTRNRS', 'CCSTMTRS', 'CCACCTFROM'
  ]);

  while (i < sgml.length) {
    if (sgml[i] === '<') {
      // Find the end of the tag
      const tagEnd = sgml.indexOf('>', i);
      if (tagEnd === -1) break;

      const tagContent = sgml.substring(i + 1, tagEnd);

      if (tagContent.startsWith('/')) {
        // Closing tag
        const tagName = tagContent.substring(1);

        // Close all open tags until we find this one
        while (tagStack.length > 0) {
          const openTag = tagStack.pop()!;
          if (!containerTags.has(openTag)) {
            result.push(`</${openTag}>`);
          }
          if (openTag === tagName) {
            result.push(`</${tagName}>`);
            break;
          }
        }
      } else {
        // Opening tag
        const tagName = tagContent;

        // If this is a new opening tag and we have leaf tags open, close them
        if (tagStack.length > 0 && !containerTags.has(tagStack[tagStack.length - 1])) {
          const leafTag = tagStack.pop()!;
          result.push(`</${leafTag}>`);
        }

        result.push(`<${tagName}>`);
        tagStack.push(tagName);
      }

      i = tagEnd + 1;
    } else {
      // Regular content
      result.push(sgml[i]);
      i++;
    }
  }

  // Close any remaining open tags
  while (tagStack.length > 0) {
    const tag = tagStack.pop()!;
    result.push(`</${tag}>`);
  }

  return result.join('');
}

function parseOFXDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  try {
    // Parse raw OFX format: YYYYMMDDHHMMSS or YYYYMMDDHHMMSS[OFFSET:GMT] or YYYYMMDDHHMMSS.mmm
    let cleaned = dateStr.split('[')[0].split('.')[0];

    // Extract date parts
    const year = parseInt(cleaned.substring(0, 4), 10);
    const month = parseInt(cleaned.substring(4, 6), 10);
    const day = parseInt(cleaned.substring(6, 8), 10);

    // Create date using ISO format string to ensure consistent parsing
    // This avoids timezone shifting issues
    const isoString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00.000Z`;
    const date = new Date(isoString);

    if (isNaN(date.getTime())) {
      return null;
    }

    return date;
  } catch {
    return null;
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
