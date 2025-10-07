// src/sync/transformers/mal-transformer.ts
// Transforms MAL API responses to universal format

import type {
  UniversalMediaItem,
  UniversalPicture,
  UniversalAlternativeTitles,
  UniversalGenre,
  UniversalAuthor,
  UniversalSeason
} from '../types';
import { MediaStatus, UserListStatus, MediaCategory } from '../types';

/**
 * Maps MAL status to universal status
 */
function mapMALStatus(malStatus: string): MediaStatus {
  switch (malStatus) {
    case 'finished_airing':
    case 'finished':
      return MediaStatus.FINISHED;
    case 'currently_airing':
    case 'currently_publishing':
      return MediaStatus.CURRENTLY_RELEASING;
    case 'not_yet_aired':
    case 'not_yet_published':
      return MediaStatus.NOT_YET_RELEASED;
    default:
      return MediaStatus.FINISHED;
  }
}

/**
 * Maps MAL user status to universal user status
 */
function mapMALUserStatus(malStatus: string): UserListStatus {
  switch (malStatus) {
    case 'watching':
      return UserListStatus.WATCHING;
    case 'reading':
      return UserListStatus.READING;
    case 'completed':
      return UserListStatus.COMPLETED;
    case 'on_hold':
      return UserListStatus.ON_HOLD;
    case 'dropped':
      return UserListStatus.DROPPED;
    case 'plan_to_watch':
      return UserListStatus.PLAN_TO_WATCH;
    case 'plan_to_read':
      return UserListStatus.PLAN_TO_READ;
    default:
      return UserListStatus.PLAN_TO_WATCH;
  }
}

/**
 * Transforms MAL picture object
 */
function transformPicture(malPicture: any): UniversalPicture | undefined {
  if (!malPicture) return undefined;
  
  return {
    medium: malPicture.medium,
    large: malPicture.large
  };
}

/**
 * Transforms MAL alternative titles
 */
function transformAlternativeTitles(malTitles: any): UniversalAlternativeTitles | undefined {
  if (!malTitles) return undefined;
  
  return {
    en: malTitles.en,
    ja: malTitles.ja,
    synonyms: malTitles.synonyms || []
  };
}

/**
 * Transforms MAL genres
 */
function transformGenres(malGenres: any[]): UniversalGenre[] {
  if (!malGenres || !Array.isArray(malGenres)) return [];
  
  return malGenres.map(genre => ({
    id: genre.id,
    name: genre.name
  }));
}

/**
 * Transforms MAL authors (for manga)
 */
function transformAuthors(malAuthors: any[]): UniversalAuthor[] {
  if (!malAuthors || !Array.isArray(malAuthors)) return [];
  
  return malAuthors.map(author => ({
    firstName: author.node?.first_name || '',
    lastName: author.node?.last_name || '',
    role: author.role
  }));
}

/**
 * Transforms MAL start season (for anime)
 */
function transformSeason(malSeason: any): UniversalSeason | undefined {
  if (!malSeason) return undefined;
  
  return {
    year: malSeason.year,
    season: malSeason.season
  };
}

/**
 * Transforms a single MAL anime item to universal format
 */
export function transformMALAnime(malItem: any): UniversalMediaItem {
  const node = malItem.node || malItem;
  const listStatus = malItem.list_status;

  return {
    // Basic info
    id: node.id,
    title: node.title,
    category: MediaCategory.ANIME,
    
    // Visual
    mainPicture: transformPicture(node.main_picture),
    pictures: node.pictures?.map(transformPicture) || [],
    
    // Alternative titles
    alternativeTitles: transformAlternativeTitles(node.alternative_titles),
    
    // Description
    synopsis: node.synopsis,
    
    // Metadata
    mediaType: node.media_type || 'unknown',
    status: mapMALStatus(node.status),
    mean: node.mean,
    
    // Genres
    genres: transformGenres(node.genres),
    
    // Anime-specific
    numEpisodes: node.num_episodes,
    startSeason: transformSeason(node.start_season),
    source: node.source,
    
    // User list data
    userStatus: listStatus ? mapMALUserStatus(listStatus.status) : undefined,
    userScore: listStatus?.score || 0,
    numEpisodesWatched: listStatus?.num_episodes_watched,
    
    // Platform metadata
    platform: 'mal',
    lastSynced: Date.now()
  };
}

/**
 * Transforms a single MAL manga item to universal format
 */
export function transformMALManga(malItem: any): UniversalMediaItem {
  const node = malItem.node || malItem;
  const listStatus = malItem.list_status;

  return {
    // Basic info
    id: node.id,
    title: node.title,
    category: MediaCategory.MANGA,
    
    // Visual
    mainPicture: transformPicture(node.main_picture),
    pictures: node.pictures?.map(transformPicture) || [],
    
    // Alternative titles
    alternativeTitles: transformAlternativeTitles(node.alternative_titles),
    
    // Description
    synopsis: node.synopsis,
    
    // Metadata
    mediaType: node.media_type || 'unknown',
    status: mapMALStatus(node.status),
    mean: node.mean,
    
    // Genres
    genres: transformGenres(node.genres),
    
    // Manga-specific
    numVolumes: node.num_volumes,
    numChapters: node.num_chapters,
    authors: transformAuthors(node.authors),
    
    // User list data
    userStatus: listStatus ? mapMALUserStatus(listStatus.status) : undefined,
    userScore: listStatus?.score || 0,
    numVolumesRead: listStatus?.num_volumes_read,
    numChaptersRead: listStatus?.num_chapters_read,
    
    // Platform metadata
    platform: 'mal',
    lastSynced: Date.now()
  };
}

/**
 * Transforms an array of MAL anime items
 */
export function transformMALAnimeList(malItems: any[]): UniversalMediaItem[] {
  if (!Array.isArray(malItems)) {
    console.warn('[MAL Transformer] Expected array but got:', typeof malItems);
    return [];
  }
  
  return malItems.map(transformMALAnime);
}

/**
 * Transforms an array of MAL manga items
 */
export function transformMALMangaList(malItems: any[]): UniversalMediaItem[] {
  if (!Array.isArray(malItems)) {
    console.warn('[MAL Transformer] Expected array but got:', typeof malItems);
    return [];
  }
  
  return malItems.map(transformMALManga);
}