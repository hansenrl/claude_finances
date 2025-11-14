// Generate a unique ID using timestamp and random number
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Generate a transaction fingerprint for consistent ID across sessions
export async function generateTransactionId(
  date: Date,
  amount: number,
  description: string,
  accountId?: string
): Promise<string> {
  const key = `${date.toISOString()}_${amount}_${description}_${accountId || ''}`;

  // Use crypto API if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback to simple hash
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Generate a transaction signature for exclusion tracking (based on date, description, amount only)
// This allows exclusions to persist across data clearing and re-importing
export async function generateTransactionSignature(
  date: Date,
  amount: number,
  description: string
): Promise<string> {
  const key = `${date.toISOString()}_${amount}_${description}`;

  // Use crypto API if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback to simple hash
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Synchronous version of transaction signature generation (uses simple hash only)
// This is used in the reducer for immediate signature computation
export function generateTransactionSignatureSync(
  date: Date | string,
  amount: number,
  description: string
): string {
  // Handle both Date objects and date strings
  const dateStr = date instanceof Date ? date.toISOString() : new Date(date).toISOString();
  const key = `${dateStr}_${amount}_${description}`;

  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

// Format date (handles both Date objects and strings from localStorage)
export function formatDate(date: Date | string): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(dateObj);
}

// Download a blob as a file
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Truncate filename for display (keep last 20 chars with extension)
export function truncateFilename(filename: string, maxLength: number = 20): string {
  if (filename.length <= maxLength) {
    return filename;
  }

  // Get extension
  const lastDotIndex = filename.lastIndexOf('.');
  const extension = lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '';
  const nameWithoutExt = lastDotIndex !== -1 ? filename.substring(0, lastDotIndex) : filename;

  // Calculate how much of the name we can keep
  const availableLength = maxLength - extension.length - 3; // -3 for "..."

  if (availableLength <= 0) {
    return '...' + extension;
  }

  // Take the last N characters of the filename (more useful for date-stamped files)
  const truncatedName = nameWithoutExt.substring(nameWithoutExt.length - availableLength);
  return '...' + truncatedName + extension;
}
