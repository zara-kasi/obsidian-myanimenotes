import { requestUrl } from 'obsidian';
import type CassettePlugin from '../../main';
import { ensureValidToken, getAuthHeaders } from './auth';
import { createDebugLogger } from '../../utils';

const MAL_API_BASE = 'https://api.myanimelist.net/v2';

// Optimized field sets - only fields we actually use from the reference document
const ANIME_FIELDS = [
  // Basic info
  'id',
  'title',
  'main_picture',
  'alternative_titles',
  
  // Description
  'synopsis',
  
  // Scores
  'mean',
  
  // Categories
  'genres',
  'media_type',
  'status',
  
  // Anime-specific
  'num_episodes',
  'start_season',
  'source',
  'start_date', 
  'end_date', 
  'average_episode_duration', 
  'studios',           
  // User list data - REQUIRED for user-specific fields
 'list_status{status,score,num_episodes_watched,is_rewatching,updated_at,start_date,finish_date}' 
].join(',');

const MANGA_FIELDS = [
  // Basic info
  'id',
  'title',
  'main_picture',
  'alternative_titles',
  
  // Description
  'synopsis',
  
  // Scores
  'mean',
  
  // Categories
  'genres',
  'media_type',
  'status',
  
  // Manga-specific
  'num_volumes',
  'num_chapters',
  'authors{first_name,last_name}',
  'start_date',
  'end_date',
  
  // User list data - REQUIRED for user-specific fields
  'list_status{status,score,num_volumes_read,num_chapters_read,start_date,finish_date}'
].join(',');

// Rate limiting configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000; // 1 second
const MAX_RETRY_DELAY_MS = 10000; // 10 seconds

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculates exponential backoff delay with jitter
 * @param attempt Current retry attempt (0-indexed)
 * @returns Delay in milliseconds
 */
function calculateBackoffDelay(attempt: number): number {
  // Exponential: 1s, 2s, 4s, 8s (capped at MAX_RETRY_DELAY_MS)
  const exponentialDelay = Math.min(
    INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt),
    MAX_RETRY_DELAY_MS
  );
  
  // Add jitter (±20%) to prevent thundering herd
  const jitter = exponentialDelay * 0.2 * (Math.random() - 0.5);
  
  return Math.floor(exponentialDelay + jitter);
}

/**
 * Makes an authenticated request to MAL API with retry logic
 * Implements exponential backoff for rate limits and transient errors
 */
async function makeMALRequest(
  plugin: CassettePlugin,
  endpoint: string,
  params: Record<string, string> = {}
): Promise<any> {
  const debug = createDebugLogger(plugin, 'MAL API');
  
  await ensureValidToken(plugin);
  
  const headers = getAuthHeaders(plugin);
  if (!headers) {
    throw new Error('Not authenticated with MyAnimeList');
  }

  const url = new URL(`${MAL_API_BASE}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  let lastError: Error | null = null;

  // Retry loop with exponential backoff
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await requestUrl({
        url: url.toString(),
        method: 'GET',
        headers,
        throw: false
      });

      // Success - return immediately
      if (response.status >= 200 && response.status < 300) {
        return response.json || JSON.parse(response.text);
      }

      // Rate limit hit (429) - always retry with backoff
      if (response.status === 429) {
        if (attempt < MAX_RETRIES) {
          const delay = calculateBackoffDelay(attempt);
          debug.log(
            `[MAL API] Rate limit hit (429). Retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`
          );
          await sleep(delay);
          continue; // Retry
        } else {
          throw new Error(
            `MAL API rate limit exceeded. Please try again in a few minutes.`
          );
        }
      }

      // Server errors (5xx) - retry with backoff
      if (response.status >= 500 && response.status < 600) {
        if (attempt < MAX_RETRIES) {
          const delay = calculateBackoffDelay(attempt);
          debug.log(
            `[MAL API] Server error (${response.status}). Retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`
          );
          await sleep(delay);
          continue; // Retry
        } else {
          throw new Error(
            `MAL API server error (HTTP ${response.status}). Please try again later.`
          );
        }
      }

      // Client errors (4xx except 429) - don't retry, fail immediately
      if (response.status >= 400 && response.status < 500) {
        const errorMessage = parseErrorMessage(response);
        throw new Error(
          `MAL API request failed (HTTP ${response.status}): ${errorMessage}`
        );
      }

      // Other errors - throw
      throw new Error(
        `MAL API request failed (HTTP ${response.status}): ${response.text}`
      );

    } catch (error) {
      lastError = error;

      // Network errors or other exceptions - retry
      if (attempt < MAX_RETRIES) {
        const delay = calculateBackoffDelay(attempt);
        debug.log(
          `[MAL API] Request failed: ${error.message}. Retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`
        );
        await sleep(delay);
        continue; // Retry
      }
      
      // Max retries reached - throw the last error
      break;
    }
  }

  // If we get here, all retries failed
  throw new Error(
    `MAL API request failed after ${MAX_RETRIES} retries: ${lastError?.message || 'Unknown error'}`
  );
}

/**
 * Parses error message from MAL API response
 */
function parseErrorMessage(response: any): string {
  try {
    const data = response.json || (response.text ? JSON.parse(response.text) : {});
    if (data.error) {
      return data.message || data.error;
    }
  } catch (e) {
    // Ignore parse errors
  }
  return response.text || 'Unknown error';
}

/**
 * Fetches all pages of a paginated MAL endpoint
 */
async function fetchAllPages(
  plugin: CassettePlugin,
  endpoint: string,
  params: Record<string, string> = {}
): Promise<any[]> {
    const debug = createDebugLogger(plugin, 'MAL API');
  const allItems: any[] = [];
  let nextUrl: string | null = null;
  let offset = 0;
  const limit = 100; // MAL's max limit per request

  do {
    const requestParams = {
      ...params,
      limit: limit.toString(),
      offset: offset.toString()
    };

    debug.log(`[MAL API] Fetching ${endpoint} (offset: ${offset})...`);
    
    const data = await makeMALRequest(plugin, endpoint, requestParams);
    
    if (data.data && Array.isArray(data.data)) {
      // Log first item to see structure
      if (offset === 0 && data.data.length > 0) {
        debug.log('[MAL API] Sample response structure:', {
          hasNode: !!data.data[0].node,
          hasListStatus: !!data.data[0].list_status,
          listStatusKeys: data.data[0].list_status ? Object.keys(data.data[0].list_status) : [],
          sampleItem: data.data[0]
        });
      }
      allItems.push(...data.data);
    }

    nextUrl = data.paging?.next || null;
    offset += limit;

    // Safety check to prevent infinite loops
    if (offset > 10000) {
      console.warn('[MAL API] Safety limit reached (10000 items), stopping pagination');
      break;
    }

  } while (nextUrl);

  debug.log(`[MAL API] Fetched total of ${allItems.length} items from ${endpoint}`);
  return allItems;
}

/**
 * Fetches complete anime list for authenticated user
 * Note: User list data (status, score, episodes watched) must be explicitly requested via list_status field
 */
export async function fetchCompleteMALAnimeList(plugin: CassettePlugin): Promise<any[]> {
  return fetchAllPages(plugin, '/users/@me/animelist', {
    fields: ANIME_FIELDS,
    nsfw: 'true'
  });
}

/**
 * Fetches complete manga list for authenticated user
 * Note: User list data (status, score, volumes/chapters read) must be explicitly requested via list_status field
 */
export async function fetchCompleteMALMangaList(plugin: CassettePlugin): Promise<any[]> {
  return fetchAllPages(plugin, '/users/@me/mangalist', {
    fields: MANGA_FIELDS,
    nsfw: 'true'
  });
}

/**
 * Fetches anime list filtered by status
 */
export async function fetchMALAnimeByStatus(
  plugin: CassettePlugin,
  status: 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch'
): Promise<any[]> {
  return fetchAllPages(plugin, '/users/@me/animelist', {
    fields: ANIME_FIELDS,
    status,
    nsfw: 'true'
  });
}

/**
 * Fetches manga list filtered by status
 */
export async function fetchMALMangaByStatus(
  plugin: CassettePlugin,
  status: 'reading' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_read'
): Promise<any[]> {
  return fetchAllPages(plugin, '/users/@me/mangalist', {
    fields: MANGA_FIELDS,
    status,
    nsfw: 'true'
  });
}

/**
 * Fetches detailed information for a specific anime
 */
export async function fetchMALAnimeDetails(
  plugin: CassettePlugin,
  animeId: number
): Promise<any> {
  return makeMALRequest(plugin, `/anime/${animeId}`, {
    fields: ANIME_FIELDS
  });
}

/**
 * Fetches detailed information for a specific manga
 */
export async function fetchMALMangaDetails(
  plugin: CassettePlugin,
  mangaId: number
): Promise<any> {
  return makeMALRequest(plugin, `/manga/${mangaId}`, {
    fields: MANGA_FIELDS
  });
}
