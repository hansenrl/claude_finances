import type { Category, CategorizationRule } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'groceries', name: 'Groceries', color: '#10b981', patterns: [], isCustom: false, isDefault: true },
  { id: 'restaurants', name: 'Restaurants & Dining', color: '#f59e0b', patterns: [], isCustom: false, isDefault: true },
  { id: 'transportation', name: 'Transportation', color: '#3b82f6', patterns: [], isCustom: false, isDefault: true },
  { id: 'gas', name: 'Gas & Fuel', color: '#8b5cf6', patterns: [], isCustom: false, isDefault: true },
  { id: 'entertainment', name: 'Entertainment', color: '#ec4899', patterns: [], isCustom: false, isDefault: true },
  { id: 'shopping', name: 'Shopping & Retail', color: '#ef4444', patterns: [], isCustom: false, isDefault: true },
  { id: 'utilities', name: 'Utilities', color: '#14b8a6', patterns: [], isCustom: false, isDefault: true },
  { id: 'healthcare', name: 'Healthcare', color: '#06b6d4', patterns: [], isCustom: false, isDefault: true },
  { id: 'insurance', name: 'Insurance', color: '#6366f1', patterns: [], isCustom: false, isDefault: true },
  { id: 'housing', name: 'Housing', color: '#84cc16', patterns: [], isCustom: false, isDefault: true },
  { id: 'subscriptions', name: 'Subscriptions', color: '#a855f7', patterns: [], isCustom: false, isDefault: true },
  { id: 'travel', name: 'Travel', color: '#0ea5e9', patterns: [], isCustom: false, isDefault: true },
  { id: 'services', name: 'Services', color: '#f97316', patterns: [], isCustom: false, isDefault: true },
  { id: 'income', name: 'Income/Payments', color: '#22c55e', patterns: [], isCustom: false, isDefault: true },
  { id: 'other', name: 'Other', color: '#64748b', patterns: [], isCustom: false, isDefault: true },
];

export const DEFAULT_RULES: CategorizationRule[] = [
  // Groceries
  { id: 'r1', categoryId: 'groceries', pattern: '(safeway|kroger|whole foods|trader joe|albertsons|publix|wegmans)', priority: 10, enabled: true },
  { id: 'r2', categoryId: 'groceries', pattern: '(grocery|supermarket|market)', priority: 15, enabled: true },

  // Restaurants
  { id: 'r3', categoryId: 'restaurants', pattern: '(starbucks|coffee|cafe|restaurant|dining)', priority: 10, enabled: true },
  { id: 'r4', categoryId: 'restaurants', pattern: '(mcdonald|burger king|wendy|subway|chipotle|panera)', priority: 10, enabled: true },
  { id: 'r5', categoryId: 'restaurants', pattern: '(pizza|taco|burrito)', priority: 12, enabled: true },

  // Transportation
  { id: 'r6', categoryId: 'transportation', pattern: '(uber|lyft|taxi|transit|metro|bart)', priority: 10, enabled: true },

  // Gas
  { id: 'r7', categoryId: 'gas', pattern: '(shell|chevron|exxon|mobil|bp|arco|gas|fuel)', priority: 10, enabled: true },

  // Subscriptions
  { id: 'r8', categoryId: 'subscriptions', pattern: '(netflix|spotify|hulu|disney|amazon prime|apple music)', priority: 10, enabled: true },

  // Utilities
  { id: 'r9', categoryId: 'utilities', pattern: '(electric|power|water|internet|comcast|at&t|verizon)', priority: 10, enabled: true },

  // Shopping
  { id: 'r10', categoryId: 'shopping', pattern: '(amazon|target|walmart|costco|best buy)', priority: 10, enabled: true },

  // Income/Payments
  { id: 'r11', categoryId: 'income', pattern: '(payment|credit|refund)', priority: 10, enabled: true },

  // Healthcare
  { id: 'r12', categoryId: 'healthcare', pattern: '(pharmacy|cvs|walgreens|doctor|medical|health)', priority: 10, enabled: true },

  // Entertainment
  { id: 'r13', categoryId: 'entertainment', pattern: '(movie|theater|cinema|concert|ticket)', priority: 10, enabled: true },
];

export function getDefaultPreferences() {
  return {
    categories: DEFAULT_CATEGORIES,
    rules: DEFAULT_RULES,
    version: 1,
    lastModified: new Date(),
  };
}
