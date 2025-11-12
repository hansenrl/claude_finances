import type { Transaction } from '../types';
import { generateTransactionId } from './utils';

// Helper to add days to a date
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Recurring subscriptions that appear monthly
const subscriptions = [
  { description: 'Netflix Subscription', amount: 15.99, dayOfMonth: 5 },
  { description: 'Spotify Premium', amount: 10.99, dayOfMonth: 1 },
  { description: 'Amazon Prime', amount: 14.99, dayOfMonth: 15 },
  { description: 'Adobe Creative Cloud', amount: 54.99, dayOfMonth: 20 },
  { description: 'GOOGLE *YOUTUBEPREMIUM', amount: 7.99, dayOfMonth: 26 },
  { description: 'Apple iCloud Storage', amount: 2.99, dayOfMonth: 8 },
  { description: 'The New York Times Digital', amount: 17.00, dayOfMonth: 12 },
];

// Various merchants for different categories
const merchants = {
  groceries: [
    'SAFEWAY #1234',
    'WHOLE FOODS MARKET',
    'TRADER JOES #089',
    'COSTCO WHSE #0123',
    'TARGET',
    'KROGER',
    'ALDI',
  ],
  restaurants: [
    'STARBUCKS',
    'CHIPOTLE MEXICAN GRILL',
    'PANERA BREAD',
    'MCDONALD\'S',
    'OLIVE GARDEN',
    'TACO BELL',
    'SUBWAY',
    'PIZZA HUT',
    'DOMINOS PIZZA',
    'IN-N-OUT BURGER',
  ],
  gas: [
    'SHELL OIL',
    'CHEVRON',
    'ARCO',
    '76 GAS STATION',
    'EXXONMOBIL',
  ],
  shopping: [
    'AMAZON.COM',
    'BEST BUY',
    'WALMART',
    'TARGET',
    'HOME DEPOT',
    'IKEA',
    'KOHLS',
  ],
  entertainment: [
    'AMC THEATERS',
    'REGAL CINEMAS',
    'STEAM GAMES',
    'APPLE.COM/BILL',
    'PLAYSTATION NETWORK',
  ],
  utilities: [
    'PG&E ELECTRIC',
    'COMCAST CABLE',
    'AT&T WIRELESS',
    'WATER COMPANY',
  ],
  transportation: [
    'UBER TRIP',
    'LYFT RIDE',
    'BART CLIPPER',
    'AMTRAK',
  ],
  healthcare: [
    'CVS PHARMACY',
    'WALGREENS',
    'KAISER PERMANENTE',
    'DENTAL OFFICE',
  ],
};

// Generate random amount within a range
function randomAmount(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

// Pick random item from array
function randomPick<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export async function generateSampleData(): Promise<Transaction[]> {
  const transactions: Transaction[] = [];
  const startDate = new Date(2025, 0, 1); // January 1, 2025 at local midnight
  const endDate = new Date(2025, 11, 31); // December 31, 2025 at local midnight

  // Generate monthly subscriptions for all 12 months
  for (let month = 0; month < 12; month++) {
    for (const sub of subscriptions) {
      const date = new Date(2025, month, sub.dayOfMonth);
      if (date >= startDate && date <= endDate) {
        const transaction: Transaction = {
          id: await generateTransactionId(date, sub.amount, sub.description),
          date,
          description: sub.description,
          amount: sub.amount,
          type: 'DEBIT',
          isExcluded: false,
          source: 'CSV',
          sourceFile: 'sample-data.csv',
          isManuallyCategorized: false,
        };
        transactions.push(transaction);
      }
    }
  }

  // Generate random transactions throughout the year
  // Target ~200 transactions total, we have 84 subscription transactions (7 * 12)
  // So we need ~116 more random transactions
  const randomTransactionsCount = 116;
  const daysBetween = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  for (let i = 0; i < randomTransactionsCount; i++) {
    const randomDay = Math.floor(Math.random() * daysBetween);
    const date = addDays(startDate, randomDay);

    // Pick a random category and merchant
    const categories = Object.keys(merchants) as Array<keyof typeof merchants>;
    const category = randomPick(categories);
    const merchantList = merchants[category];
    const merchant = randomPick(merchantList);

    // Generate amount based on category
    let amount: number;
    switch (category) {
      case 'groceries':
        amount = randomAmount(25, 150);
        break;
      case 'restaurants':
        amount = randomAmount(8, 75);
        break;
      case 'gas':
        amount = randomAmount(30, 80);
        break;
      case 'shopping':
        amount = randomAmount(15, 300);
        break;
      case 'entertainment':
        amount = randomAmount(10, 60);
        break;
      case 'utilities':
        amount = randomAmount(50, 200);
        break;
      case 'transportation':
        amount = randomAmount(8, 45);
        break;
      case 'healthcare':
        amount = randomAmount(10, 150);
        break;
      default:
        amount = randomAmount(10, 100);
    }

    const transaction: Transaction = {
      id: await generateTransactionId(date, amount, merchant),
      date,
      description: merchant,
      amount,
      type: 'DEBIT',
      isExcluded: false,
      source: 'CSV',
      sourceFile: 'sample-data.csv',
      isManuallyCategorized: false,
    };
    transactions.push(transaction);
  }

  // Add some income/payment transactions (credits)
  for (let month = 0; month < 12; month++) {
    // Monthly salary
    const salaryDate = new Date(2025, month, 1);
    transactions.push({
      id: await generateTransactionId(salaryDate, -3500, 'Employer Direct Deposit'),
      date: salaryDate,
      description: 'Employer Direct Deposit - Salary',
      amount: -3500,
      type: 'CREDIT',
      isExcluded: false,
      source: 'CSV',
      sourceFile: 'sample-data.csv',
      isManuallyCategorized: false,
    });

    // Occasional credit card payment
    if (month % 2 === 0) {
      const paymentDate = new Date(2025, month, 28);
      const paymentAmount = -randomAmount(500, 1500);
      transactions.push({
        id: await generateTransactionId(paymentDate, paymentAmount, 'Credit Card Payment'),
        date: paymentDate,
        description: 'DIRECTPAY FULL BALANCE - Payment',
        amount: paymentAmount,
        type: 'CREDIT',
        isExcluded: false,
        source: 'CSV',
        sourceFile: 'sample-data.csv',
        isManuallyCategorized: false,
      });
    }
  }

  // Sort transactions by date
  transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

  return transactions;
}
