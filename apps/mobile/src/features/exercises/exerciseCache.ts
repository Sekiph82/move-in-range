import AsyncStorage from "@react-native-async-storage/async-storage";

const RECENT_KEY = "mir.exercise.recent.v1";
const FILTER_KEY = "mir.exercise.filters.v1";
const PAGE_PREFIX = "mir.exercise.page.v1.";
const MAX_RECENTS = 30;

export type ExerciseFilters = {
  q: string;
  body_part: string;
  equipment: string;
  target: string;
  position: string;
  difficulty: string;
  impact: string;
  bodyweight: boolean;
  favorites: boolean;
};

export const emptyExerciseFilters: ExerciseFilters = {
  q: "",
  body_part: "",
  equipment: "",
  target: "",
  position: "",
  difficulty: "",
  impact: "",
  bodyweight: false,
  favorites: false
};

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function loadExerciseFilters() {
  return readJson<ExerciseFilters>(FILTER_KEY, emptyExerciseFilters);
}

export async function saveExerciseFilters(filters: ExerciseFilters) {
  await AsyncStorage.setItem(FILTER_KEY, JSON.stringify(filters));
}

export function loadCachedExercisePage(key: string) {
  return readJson<Record<string, unknown> | null>(`${PAGE_PREFIX}${key}`, null);
}

export async function saveCachedExercisePage(key: string, payload: Record<string, unknown>) {
  await AsyncStorage.setItem(`${PAGE_PREFIX}${key}`, JSON.stringify({ ...payload, cached_at: new Date().toISOString() }));
}

export async function addRecentExercise(item: { id: string; name: string; media?: unknown; target?: string; equipment?: string }) {
  const existing = await readJson<typeof item[]>(RECENT_KEY, []);
  const next = [item, ...existing.filter((entry) => entry.id !== item.id)].slice(0, MAX_RECENTS);
  await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

export function loadRecentExercises() {
  return readJson<{ id: string; name: string; media?: unknown; target?: string; equipment?: string }[]>(RECENT_KEY, []);
}

export async function clearExerciseCache() {
  const keys = await AsyncStorage.getAllKeys();
  const exerciseKeys = keys.filter((key) => key.startsWith(PAGE_PREFIX) || key === RECENT_KEY || key === FILTER_KEY);
  if (exerciseKeys.length) {
    await AsyncStorage.multiRemove(exerciseKeys);
  }
}
