import { readFileSync } from 'fs';
import Papa from 'papaparse';

// Simple test to verify CSV parsing works
const csvContent = readFileSync('./example_anonymized.csv', 'utf-8');

console.log('Testing CSV Parser...\n');
console.log('File content preview:');
console.log(csvContent.split('\n').slice(0, 5).join('\n'));
console.log('\n---\n');

Papa.parse(csvContent, {
  header: true,
  skipEmptyLines: true,
  transformHeader: (header) => header.trim(),
  complete: (results) => {
    console.log(`✓ Parsed ${results.data.length} transactions`);
    console.log('\nFirst 5 transactions:');

    results.data.slice(0, 5).forEach((record, i) => {
      const transDate = record['Trans. Date'];
      const description = record['Description'];
      const amount = parseFloat(record['Amount'].replace(/,/g, ''));
      const category = record['Category'];

      // CSV convention: positive = debit, negative = credit
      // Normalize to: negative = debit, positive = credit
      const normalizedAmount = -amount;
      const type = normalizedAmount < 0 ? 'DEBIT' : 'CREDIT';

      console.log(`\n${i + 1}. ${transDate} - ${description}`);
      console.log(`   Amount: $${Math.abs(amount).toFixed(2)} (${type})`);
      console.log(`   Category: ${category}`);
    });

    // Analyze the data
    const debits = results.data.filter(r => parseFloat(r.Amount) > 0);
    const credits = results.data.filter(r => parseFloat(r.Amount) < 0);

    const totalDebits = debits.reduce((sum, r) => sum + parseFloat(r.Amount), 0);
    const totalCredits = Math.abs(credits.reduce((sum, r) => sum + parseFloat(r.Amount), 0));

    console.log('\n\n=== Summary ===');
    console.log(`Total Transactions: ${results.data.length}`);
    console.log(`Debits: ${debits.length} transactions, $${totalDebits.toFixed(2)}`);
    console.log(`Credits: ${credits.length} transactions, $${totalCredits.toFixed(2)}`);
    console.log(`Net: $${(totalCredits - totalDebits).toFixed(2)}`);

    // Check for repeated expenses
    console.log('\n=== Repeated Merchants ===');
    const merchants = {};
    debits.forEach(r => {
      const desc = r.Description.substring(0, 30).trim();
      merchants[desc] = (merchants[desc] || 0) + 1;
    });

    const repeated = Object.entries(merchants)
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1]);

    repeated.forEach(([merchant, count]) => {
      console.log(`  ${merchant}: ${count} occurrences`);
    });

    console.log('\n✓ CSV parsing test completed successfully!');

    if (results.errors.length > 0) {
      console.log('\n⚠ Parsing errors:');
      results.errors.forEach(err => console.log(`  ${err.message}`));
    }
  },
  error: (error) => {
    console.error('✗ Error parsing CSV:', error);
  }
});
