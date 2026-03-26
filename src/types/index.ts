import type { Tables, TablesInsert, TablesUpdate, Enums } from './database.types'

// ─────────────────────────────────────────────
// 1. Row types — базові типи для читання з БД
// ─────────────────────────────────────────────

export type User = Tables<'users'>
export type Word = Tables<'words'>
export type Collection = Tables<'collections'>
export type CollectionWord = Tables<'collection_words'>
export type CollectionFollow = Tables<'collection_follows'>
export type WordProgress = Tables<'word_progress'>
export type UserStreak = Tables<'user_streaks'>
export type Badge = Tables<'badges'>
export type UserBadge = Tables<'user_badges'>
export type ApiKey = Tables<'api_keys'>
export type StudySession = Tables<'study_sessions'>
export type StudySessionWord = Tables<'study_session_words'>

// ─────────────────────────────────────────────
// 2. Insert types — для створення нових записів
// ─────────────────────────────────────────────

export type UserInsert = TablesInsert<'users'>
export type WordInsert = TablesInsert<'words'>
export type CollectionInsert = TablesInsert<'collections'>
export type CollectionWordInsert = TablesInsert<'collection_words'>
export type CollectionFollowInsert = TablesInsert<'collection_follows'>
export type WordProgressInsert = TablesInsert<'word_progress'>
export type UserStreakInsert = TablesInsert<'user_streaks'>
export type BadgeInsert = TablesInsert<'badges'>
export type UserBadgeInsert = TablesInsert<'user_badges'>
export type ApiKeyInsert = TablesInsert<'api_keys'>
export type StudySessionInsert = TablesInsert<'study_sessions'>
export type StudySessionWordInsert = TablesInsert<'study_session_words'>

// ─────────────────────────────────────────────
// 3. Update types — для оновлення існуючих записів
// ─────────────────────────────────────────────

export type UserUpdate = TablesUpdate<'users'>
export type WordUpdate = TablesUpdate<'words'>
export type CollectionUpdate = TablesUpdate<'collections'>
export type CollectionWordUpdate = TablesUpdate<'collection_words'>
export type CollectionFollowUpdate = TablesUpdate<'collection_follows'>
export type WordProgressUpdate = TablesUpdate<'word_progress'>
export type UserStreakUpdate = TablesUpdate<'user_streaks'>
export type BadgeUpdate = TablesUpdate<'badges'>
export type UserBadgeUpdate = TablesUpdate<'user_badges'>
export type ApiKeyUpdate = TablesUpdate<'api_keys'>
export type StudySessionUpdate = TablesUpdate<'study_sessions'>
export type StudySessionWordUpdate = TablesUpdate<'study_session_words'>

// ─────────────────────────────────────────────
// 4. Enum types — з Database['public']['Enums']
// ─────────────────────────────────────────────

/** Формат картки в сесії навчання */
export type StudyFormat = 'flip' | 'quiz' | 'write'

/** Slugs існуючих бейджів */
export type BadgeSlug =
  | 'first_word'
  | 'words_10'
  | 'words_100'
  | 'streak_7'
  | 'streak_30'
  | 'first_collection'
  | 'first_public'
  | 'first_follow'

/** Мови, підтримувані інтерфейсом */
export const SUPPORTED_LANGUAGES = {
  en: 'English',
  uk: 'Українська',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  pl: 'Polski',
  pt: 'Português',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  ar: 'العربية',
} as const

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES

// Re-export Enums helper for downstream use
export type { Enums }

// ─────────────────────────────────────────────
// 5. Joined types — для поширених запитів з join-ами
// ─────────────────────────────────────────────

/**
 * Слово разом зі станом вивчення для поточного користувача.
 * Використовується в сесії навчання.
 */
export interface WordWithProgress extends Word {
  progress: WordProgress | null
}

/**
 * Збірка разом із повним списком слів.
 * Для сторінки детального перегляду збірки.
 */
export interface CollectionWithWords extends Collection {
  words: Word[]
}

/**
 * Збірка разом із даними автора.
 * Для каталогу та публічних сторінок.
 */
export interface CollectionWithAuthor extends Collection {
  author: Pick<User, 'id' | 'username' | 'avatar_url' | 'display_role'>
}

/**
 * Збірка з агрегованою статистикою: кількість слів та підписників.
 * Для карток у каталозі та списку власних збірок.
 */
export interface CollectionWithStats extends Collection {
  word_count: number
  follower_count: number
  /** Чи підписаний поточний користувач (присутній тільки для авторизованих) */
  is_followed?: boolean
}

/**
 * Користувач разом зі своєю поточною серією.
 */
export interface UserWithStreaks extends User {
  streak: UserStreak | null
}

/**
 * Користувач разом із отриманими бейджами та їх деталями.
 */
export interface UserWithBadges extends User {
  user_badges: (UserBadge & { badge: Badge })[]
}

/**
 * Сесія навчання разом з усіма відповідями на слова.
 * Для сторінки статистики та звітів.
 */
export interface StudySessionWithWords extends StudySession {
  words: StudySessionWord[]
}

/**
 * Публічний профіль користувача — агрегація для сторінки /profile/[username].
 * Містить серію, бейджі та публічні збірки.
 */
export interface PublicProfile extends Pick<User, 'id' | 'username' | 'avatar_url' | 'display_role' | 'bio' | 'default_source_lang' | 'default_target_lang'> {
  streak: Pick<UserStreak, 'current_streak' | 'longest_streak'> | null
  badges: (Pick<UserBadge, 'earned_at'> & { badge: Pick<Badge, 'slug' | 'name' | 'description' | 'icon_url'> })[]
  public_collections: CollectionWithStats[]
}

/**
 * Картка в активній сесії навчання (клієнтський стан).
 */
export interface StudyCard {
  word: Word
  format: StudyFormat
  progress: WordProgress | null
}

// ─────────────────────────────────────────────
// 6. JSONB types — типізований вміст jsonb полів
// ─────────────────────────────────────────────

/** `words.translations` — масив перекладів слова */
export type WordTranslation = string[]

/** `words.examples` — масив прикладів речень */
export type WordExample = string[]

/** `study_sessions.collection_ids` — масив uuid збірок у сесії */
export type SessionCollectionIds = string[]

// ─────────────────────────────────────────────
// 7. Utility types
// ─────────────────────────────────────────────

/** Параметри пагінації для будь-якого списку */
export interface PaginationParams {
  page: number
  limit: number
}

/** Обгортка для пагінованих відповідей */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  hasMore: boolean
}

/** Фільтри для каталогу публічних збірок */
export interface CatalogFilters extends PaginationParams {
  sourceLang?: LanguageCode
  targetLang?: LanguageCode
  /** Мінімальна кількість слів у збірці */
  minWords?: number
  /** Максимальна кількість слів у збірці */
  maxWords?: number
  search?: string
  sortBy?: 'created_at' | 'follower_count' | 'word_count'
}

/** Формат файлу для експорту/імпорту словника */
export type ExportFormat = 'json' | 'csv'

/** Результат імпорту слів */
export interface ImportResult {
  /** Кількість успішно імпортованих слів */
  imported: number
  /** Кількість пропущених слів (дублікати без конфліктів) */
  skipped: number
  /** Слова, що потребують вирішення конфлікту */
  conflicts: ConflictItem[]
}

/** Конфліктне слово при імпорті (існуюче vs вхідне) */
export interface ConflictItem {
  existing: Word
  incoming: WordInsert
  /** Обрана дія при вирішенні конфлікту */
  action: 'keep' | 'replace' | 'skip'
}

/** Підсумок завершеної сесії навчання */
export interface StudySessionResult {
  totalWords: number
  correctAnswers: number
  /** Відсоток правильних відповідей (0–100) */
  percentage: number
  /** Кількість слів, що досягли `is_learned = true` за цю сесію */
  wordsLearned: number
}

// ─────────────────────────────────────────────
// SM-2 types
// ─────────────────────────────────────────────

/** Якість відповіді для SM-2 алгоритму (0 = повний провал, 5 = ідеально) */
export type SM2Quality = 0 | 1 | 2 | 3 | 4 | 5

/** Вхідні параметри для SM-2 алгоритму */
export interface SM2Input {
  easeFactor: number
  interval: number
  repetitions: number
  quality: SM2Quality
}

/** Результат обчислення SM-2 алгоритму */
export interface SM2Output {
  easeFactor: number
  interval: number
  repetitions: number
  nextReviewAt: Date
}

// ─────────────────────────────────────────────
// Server Action result wrapper
// ─────────────────────────────────────────────

/** Стандартна обгортка для результату Server Action */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }
