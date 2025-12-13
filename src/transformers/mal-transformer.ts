import type MyAnimeNotesPlugin from '../main';
import { createDebugLogger } from '../utils';
import type {
  UniversalMediaItem,
  UniversalPicture,
  UniversalAlternativeTitles,
  UniversalGenre,
  UniversalAuthor,
} from './media.types';
import { MediaStatus, UserListStatus, MediaCategory } from './media.types';


/**
 * Generates MyAnimeList URL for anime
 */
function generateMALAnimeUrl(id: number): string {
  return `https://myanimelist.net/anime/${id}`;
}

/**
 * Generates MyAnimeList URL for manga
 */
function generateMALMangaUrl(id: number): string {
  return `https://myanimelist.net/manga/${id}`;
}

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
function transformPicture(malPicture: Record<string, unknown> | undefined): UniversalPicture | undefined {
  if (!malPicture) return undefined;
  
  return {
    medium: typeof malPicture.medium === 'string' ? malPicture.medium : undefined,
    large: typeof malPicture.large === 'string' ? malPicture.large : undefined
  };
}

/**
 * Transforms MAL alternative titles
 */
function transformAlternativeTitles(malTitles: Record<string, unknown> | undefined): UniversalAlternativeTitles | undefined {
  if (!malTitles) return undefined;
  
  return {
    en: typeof malTitles.en === 'string' ? malTitles.en : undefined,
    ja: typeof malTitles.ja === 'string' ? malTitles.ja : undefined,
    synonyms: Array.isArray(malTitles.synonyms) ? malTitles.synonyms : []
  };
}

/**
 * Transforms MAL genres - with strict null filtering
 */
function transformGenres(malGenres: unknown[]): UniversalGenre[] {
  if (!malGenres || !Array.isArray(malGenres)) return [];
  
  return malGenres
    .filter((genre): genre is Record<string, unknown> => 
      genre != null && 
      typeof genre === 'object' &&
      'id' in genre &&
      'name' in genre
    )
    .map(genre => ({
      id: Number(genre.id),
      name: String(genre.name)
    }));
}


/**
 * Transforms MAL authors (for manga) - with strict null filtering
 */
function transformAuthors(malAuthors: unknown[]): UniversalAuthor[] {
  if (!malAuthors || !Array.isArray(malAuthors)) return [];
  
  return malAuthors
    .filter((author): author is Record<string, unknown> => 
      author != null && 
      typeof author === 'object' &&
      'node' in author
    )
    .map(author => {
      const node = author.node as Record<string, unknown>;
      return {
        firstName: typeof node.first_name === 'string' ? node.first_name : '',
        lastName: typeof node.last_name === 'string' ? node.last_name : '',
        role: typeof author.role === 'string' ? author.role : undefined
      };
    })
    .filter(author => author.firstName || author.lastName);
}



/**
 * Transforms a single MAL anime item to universal format
 * IMPORTANT: User list data comes from list_status object in /users/@me/animelist response
 */
export function transformMALAnime(plugin: MyAnimeNotesPlugin, malItem: Record<string, unknown>): UniversalMediaItem {
  const debug = createDebugLogger(plugin, 'MAL Transformer');
  const node = (malItem.node || malItem) as Record<string, unknown>;
  const listStatus = malItem.list_status as Record<string, unknown> | undefined;
   // User-specific data

  debug.log('[MAL Transformer] Processing anime:', {
    title: node.title,
    hasListStatus: !!listStatus,
    listStatus: listStatus
  });

  return {
    // Basic info
    id: node.id,
    title: node.title,
    category: MediaCategory.ANIME,
    url: generateMALAnimeUrl(node.id),
    
    // Visual
    mainPicture: transformPicture(node.main_picture),
    pictures: node.pictures?.map(transformPicture).filter(Boolean) || [],
    
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
    // Airing dates 
    releasedStart: node.start_date,
    releasedEnd: node.end_date,
    
   // Anime-specific
    numEpisodes: node.num_episodes,
    source: node.source, 
    studios: transformStudios(node.studios),    
    duration: convertDurationToMinutes(node.average_episode_duration), 
    

    
    // User list data - THIS IS THE KEY PART
    // list_status is returned by /users/@me/animelist endpoint
    userStatus: listStatus ? mapMALUserStatus(listStatus.status) : undefined,
    userScore: listStatus?.score || 0,
    numEpisodesWatched: listStatus?.num_episodes_watched || 0,
    userStartDate: listStatus?.start_date,      
    userFinishDate: listStatus?.finish_date,    
    
    // Sync metadata - MAL's updated_at timestamp
    updatedAt: listStatus?.updated_at,
    // Platform metadata
    platform: 'mal',
  };
}

/**
 * Transforms a single MAL manga item to universal format
 * IMPORTANT: User list data comes from list_status object in /users/@me/mangalist response
 */export function transformMALManga(plugin: MyAnimeNotesPlugin, malItem: Record<string, unknown>): UniversalMediaItem {
  const debug = createDebugLogger(plugin, 'MAL Transformer');
  const node = (malItem.node || malItem) as Record<string, unknown>;
  const listStatus = malItem.list_status as Record<string, unknown> | undefined;  // User-specific data


  return {
    // Basic info
    id: node.id,
    title: node.title,
    category: MediaCategory.MANGA,
    url: generateMALMangaUrl(node.id),
    
    // Visual
    mainPicture: transformPicture(node.main_picture),
    pictures: node.pictures?.map(transformPicture).filter(Boolean) || [],
    
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
   // Publication dates 
    releasedStart: node.start_date,
    releasedEnd: node.end_date,
    
    // Manga-specific
    numVolumes: node.num_volumes,
    numChapters: node.num_chapters,
    authors: transformAuthors(node.authors),     
    

    // User list data - THIS IS THE KEY PART
    // list_status is returned by /users/@me/mangalist endpoint
    userStatus: listStatus ? mapMALUserStatus(listStatus.status) : undefined,
    userScore: listStatus?.score || 0,
    numVolumesRead: listStatus?.num_volumes_read || 0,
    numChaptersRead: listStatus?.num_chapters_read || 0,
    userStartDate: listStatus?.start_date,  
    userFinishDate: listStatus?.finish_date,  
    
    // Sync metadata - MAL's updated_at timestamp
    updatedAt: listStatus?.updated_at,
    // Platform metadata
    platform: 'mal',
  };
}

/**
 * Transforms MAL studios array - keeps objects for wiki link formatting
 * Filters out null, undefined, and invalid entries
 */
function transformStudios(malStudios: unknown[]): Array<{name: string}> {
  if (!malStudios || !Array.isArray(malStudios)) return [];
  
  return malStudios
    .filter((studio): studio is Record<string, unknown> => 
      studio != null && 
      typeof studio === 'object' &&
      'name' in studio &&
      typeof studio.name === 'string' &&
      studio.name !== ''
    )
    .map(studio => ({ name: String(studio.name) }));
}

/**
 * Converts duration from seconds to minutes (rounded)
 */
function convertDurationToMinutes(seconds: number | undefined): number | undefined {
  if (!seconds) return undefined;
  return Math.round(seconds / 60);
}


/**
 * Transforms an array of MAL anime items
 */
export function transformMALAnimeList(plugin: MyAnimeNotesPlugin, malItems: unknown[]): UniversalMediaItem[] {
  if (!Array.isArray(malItems)) {
    console.warn('[MAL Transformer] Expected array but got:', typeof malItems);
    return [];
  }
  
  return malItems.map(item => transformMALAnime(plugin, item as Record<string, unknown>));
}


/**
 * Transforms an array of MAL manga items
 */
export function transformMALMangaList(plugin: MyAnimeNotesPlugin, malItems: unknown[]): UniversalMediaItem[] {
  if (!Array.isArray(malItems)) {
    console.warn('[MAL Transformer] Expected array but got:', typeof malItems);
    return [];
  }
  
  return malItems.map(item => transformMALManga(plugin, item as Record<string, unknown>));
}
