import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { Preferences } from '../types';

/**
 * Data structure for URL-encoded settings export
 * Includes all user preferences and mappings (but not transactions)
 */
export interface ExportableSettings {
  preferences: Preferences;
  descriptionMappings: Record<string, string>;
  manualOverrides?: Record<string, string>;
}

/**
 * Serialize settings to a compressed URL-safe string
 */
export function encodeSettingsToURL(settings: ExportableSettings): string {
  try {
    // Convert to JSON
    const json = JSON.stringify(settings, dateReplacer);

    // Compress and encode for URL
    const compressed = compressToEncodedURIComponent(json);

    return compressed;
  } catch (error) {
    console.error('Error encoding settings:', error);
    throw new Error('Failed to encode settings for URL');
  }
}

/**
 * Deserialize settings from a compressed URL-safe string
 */
export function decodeSettingsFromURL(encoded: string): ExportableSettings {
  try {
    // Decompress from URL encoding
    const json = decompressFromEncodedURIComponent(encoded);

    if (!json) {
      throw new Error('Failed to decompress settings');
    }

    // Parse JSON with date revival
    const settings = JSON.parse(json, dateReviver);

    // Validate structure
    if (!isValidExportableSettings(settings)) {
      throw new Error('Invalid settings structure');
    }

    return settings;
  } catch (error) {
    console.error('Error decoding settings:', error);
    throw new Error('Failed to decode settings from URL');
  }
}

/**
 * Generate a shareable URL with current settings
 */
export function generateShareableURL(settings: ExportableSettings): string {
  const encoded = encodeSettingsToURL(settings);
  const url = new URL(window.location.href);

  // Clear existing params and set the settings param
  url.search = '';
  url.searchParams.set('settings', encoded);

  return url.toString();
}

/**
 * Extract settings from current URL query params
 * Returns null if no settings param exists
 */
export function extractSettingsFromURL(): ExportableSettings | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('settings');

    if (!encoded) {
      return null;
    }

    return decodeSettingsFromURL(encoded);
  } catch (error) {
    console.error('Error extracting settings from URL:', error);
    return null;
  }
}

/**
 * Clear settings from URL without page reload
 */
export function clearSettingsFromURL(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('settings');

  // Update URL without reload
  window.history.replaceState({}, '', url.toString());
}

/**
 * JSON replacer for Date serialization
 */
function dateReplacer(_key: string, value: any): any {
  if (value instanceof Date) {
    return { __type: 'Date', value: value.toISOString() };
  }
  return value;
}

/**
 * JSON reviver for Date deserialization
 */
function dateReviver(_key: string, value: any): any {
  if (value && value.__type === 'Date') {
    return new Date(value.value);
  }
  return value;
}

/**
 * Validate exportable settings structure
 */
function isValidExportableSettings(data: any): data is ExportableSettings {
  return (
    data &&
    typeof data === 'object' &&
    data.preferences &&
    typeof data.preferences === 'object' &&
    Array.isArray(data.preferences.categories) &&
    Array.isArray(data.preferences.rules) &&
    data.descriptionMappings &&
    typeof data.descriptionMappings === 'object'
  );
}
