// src/sync/services/mal-api-service.ts
// MAL API service for fetching anime and manga data

import { requestUrl } from 'obsidian';
import type CassettePlugin from '../../main';
import { ensureValidToken, getAuthHeaders } from '../../auth/mal';

const MAL_API_BASE = 'https://api.myanimelist.net/v2';

// Field sets for different request types
const ANIME_FIELDS = [
  'id',
  'title',
  'main_picture',
  'alternative_titles',
  'start_date',
  'end_date',
  'synopsis',
  'mean',
  'rank',
  'popularity',
  'num_list_users',
  'num_scoring_users',
  'nsfw',
  'genres',
  'media_type',
  'status',
  'num_episodes',
  'start_season',
  'broadcast',
  'source',
  'average_episode_duration',
  'rating',
  'studios',
  'pictures',
  'background',
  'related_anime',
  'related_manga',
  'recommendations',
  'statistics'
].join(',');

const MANGA_FIELDS = [
  'id',
  'title',
  'main_picture',
  'alternative_titles',
  'start_date',
  'end_date',
  'synopsis',
  'mean',
  'rank',
  'popularity',
  'num_list_users',
  'num_scoring_users',
  'nsfw',
  'genres',
  'media_type',
  'status',
  'num_volumes',
  'num_chapters',
  'authors{first_name,last_name}',
  'pictures',
  'background',
  'related_anime',
  'related_manga',
  'recommendations',
  'serialization'
].join(',');

/**
 * Makes an authenticated request to MAL API
 */
async function makeMALRequest(
  plugin: CassettePlugin,
  endpoint: string,
  params: Record<string, string> = {}
): Promise<any> {
  await ensureValidToken(plugin);
  
  const headers = getAuthHeaders(plugin);
  if (!headers) {
    throw new Error('Not authenticated with MyAnimeList');
  }

  const url = new URL(`${MAL_API_BASE}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const response = await requestUrl({
    url: url.toString(),
    method: 'GET',
    headers,
    throw: false
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`MAL API request failed (HTTP ${response.status}): ${response.text}`);
  }

  return response.json || JSON.parse(response.text);
}

/**
 * Fetches all pages of a paginated MAL endpoint
 */
async function fetchAllPages(
  plugin: CassettePlugin,
  endpoint: string,
  params: Record<string, string> = {}
): Promise<any[]> {
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

    console.log(`[MAL API] Fetching ${endpoint} (offset: ${offset})...`);
    
    const data = await makeMALRequest(plugin, endpoint, requestParams);
    
    if (data.data && Array.isArray(data.data)) {
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

  console.log(`[MAL API] Fetched total of ${allItems.length} items from ${endpoint}`);
  return allItems;
}

/**
 * Fetches complete anime list for authenticated user
 */
export async function fetchCompleteMALAnimeList(plugin: CassettePlugin): Promise<any[]> {
  return fetchAllPages(plugin, '/users/@me/animelist', {
    fields: ANIME_FIELDS,
    nsfw: 'true'
  });
}

/**
 * Fetches complete manga list for authenticated user
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