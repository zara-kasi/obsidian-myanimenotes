/**
 * Cassette Sync - Validation Examples and Tests
 * 
 * Demonstrates how cassette_sync strings are generated and validated
 * Can be used for testing or as reference documentation
 */

import { generateCassetteSync, validateCassetteSyncFormat } from './cassette-sync-manager';
import type { UniversalMediaItem } from '../types';
import { MediaCategory } from '../types';

/**
 * Example: Valid cassette_sync formats
 */
export const VALID_CASSETTE_SYNC_EXAMPLES = [
  'mal:anime:1245',           // Basic MAL anime
  'mal:manga:54321',          // Basic MAL manga
  'simkl:anime:123',          // SIMKL anime
  'anilist:anime:21',         // AniList (future support)
  'kitsu:manga:456',          // Kitsu (future support)
  'mal:anime:1',              // Single digit ID
  'mal:anime:999999',         // Large ID
  'my-provider:anime:abc123', // Alphanumeric ID with hyphens
  'provider_2:manga:ID-123',  // Underscores and capital letters in ID
];

/**
 * Example: Invalid cassette_sync formats
 */
export const INVALID_CASSETTE_SYNC_EXAMPLES = [
  'MAL:anime:1245',           // Uppercase provider (invalid)
  'mal:Anime:1245',           // Uppercase category (invalid)
  'mal:anime',                // Missing ID (invalid)
  'mal:1245',                 // Missing category (invalid)
  'anime:1245',               // Missing provider (invalid)
  'mal:anime:',               // Empty ID (invalid)
  'mal:anime:123:extra',      // Too many parts (invalid)
  'mal anime 1245',           // Spaces instead of colons (invalid)
  'mal:anime:id with spaces', // Spaces in ID (invalid)
  'mal:anime:id/123',         // Slash in ID (invalid)
  '',                         // Empty string (invalid)
];

/**
 * Validates all example formats
 */
export function validateAllExamples(): {
  validResults: { value: string; isValid: boolean }[];
  invalidResults: { value: string; isValid: boolean }[];
} {
  const validResults = VALID_CASSETTE_SYNC_EXAMPLES.map(value => ({
    value,
    isValid: validateCassetteSyncFormat(value)
  }));
  
  const invalidResults = INVALID_CASSETTE_SYNC_EXAMPLES.map(value => ({
    value,
    isValid: validateCassetteSyncFormat(value)
  }));
  
  return { validResults, invalidResults };
}

/**
 * Example: Generate cassette_sync from UniversalMediaItem
 */
export function exampleGenerateCassetteSync(): void {
  // Example MAL anime item
  const animeItem: Partial<UniversalMediaItem> = {
    id: 1245,
    title: 'Attack on Titan',
    platform: 'mal',
    category: MediaCategory.ANIME
  };
  
  const animeSync = generateCassetteSync(animeItem as UniversalMediaItem);
  console.log('Anime cassette_sync:', animeSync); // Output: mal:anime:1245
  
  // Example MAL manga item
  const mangaItem: Partial<UniversalMediaItem> = {
    id: 54321,
    title: 'One Piece',
    platform: 'mal',
    category: MediaCategory.MANGA
  };
  
  const mangaSync = generateCassetteSync(mangaItem as UniversalMediaItem);
  console.log('Manga cassette_sync:', mangaSync); // Output: mal:manga:54321
  
  // Example SIMKL item
  const simklItem: Partial<UniversalMediaItem> = {
    id: 999,
    title: 'Breaking Bad',
    platform: 'simkl',
    category: MediaCategory.ANIME // SIMKL uses anime category for TV shows
  };
  
  const simklSync = generateCassetteSync(simklItem as UniversalMediaItem);
  console.log('SIMKL cassette_sync:', simklSync); // Output: simkl:anime:999
}

/**
 * Example: Validation checks
 */
export function exampleValidation(): void {
  const testCases = [
    { value: 'mal:anime:1245', expected: true },
    { value: 'MAL:anime:1245', expected: false },
    { value: 'mal:anime', expected: false },
    { value: 'mal:anime:id with spaces', expected: false },
  ];
  
  testCases.forEach(({ value, expected }) => {
    const isValid = validateCassetteSyncFormat(value);
    const status = isValid === expected ? '✓' : '✗';
    console.log(`${status} ${value}: ${isValid} (expected: ${expected})`);
  });
}

/**
 * Example: Parsing cassette_sync components
 */
export function parseCassetteSyncComponents(cassetteSync: string): {
  provider: string;
  category: string;
  id: string;
} | null {
  if (!validateCassetteSyncFormat(cassetteSync)) {
    return null;
  }
  
  const [provider, category, id] = cassetteSync.split(':');
  return { provider, category, id };
}

/**
 * Example usage of parser
 */
export function exampleParsing(): void {
  const examples = [
    'mal:anime:1245',
    'simkl:manga:999',
    'invalid:format'
  ];
  
  examples.forEach(value => {
    const parsed = parseCassetteSyncComponents(value);
    if (parsed) {
      console.log(`${value} →`, parsed);
      // Output: { provider: 'mal', category: 'anime', id: '1245' }
    } else {
      console.log(`${value} → Invalid format`);
    }
  });
}

/**
 * Run all examples (for testing)
 */
export function runAllExamples(): void {
  console.log('=== Cassette Sync Examples ===\n');
  
  console.log('1. Generate cassette_sync:');
  exampleGenerateCassetteSync();
  
  console.log('\n2. Validation:');
  exampleValidation();
  
  console.log('\n3. Parsing:');
  exampleParsing();
  
  console.log('\n4. All examples validation:');
  const { validResults, invalidResults } = validateAllExamples();
  
  const allValidPass = validResults.every(r => r.isValid);
  const allInvalidFail = invalidResults.every(r => !r.isValid);
  
  console.log(`Valid examples: ${allValidPass ? '✓ All pass' : '✗ Some failed'}`);
  console.log(`Invalid examples: ${allInvalidFail ? '✓ All fail as expected' : '✗ Some passed incorrectly'}`);
}