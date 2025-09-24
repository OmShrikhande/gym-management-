// Utility to enforce per-day usage limits using localStorage
// Safe for client-side enforcement; consider adding server-side checks for stronger guarantees.

const STORAGE_PREFIX = 'gymflow_limit';

const getTodayStr = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

const buildKey = (key, userId) => `${STORAGE_PREFIX}_${key}_${userId}`;

const readRecord = (key, userId) => {
  if (!userId) return { date: getTodayStr(), count: 0 };
  const storageKey = buildKey(key, userId);
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { date: getTodayStr(), count: 0 };
    const parsed = JSON.parse(raw);
    // Reset if day changed
    if (!parsed || parsed.date !== getTodayStr()) {
      return { date: getTodayStr(), count: 0 };
    }
    return { date: parsed.date, count: Number(parsed.count) || 0 };
  } catch {
    return { date: getTodayStr(), count: 0 };
  }
};

const writeRecord = (key, userId, record) => {
  if (!userId) return;
  const storageKey = buildKey(key, userId);
  try {
    localStorage.setItem(storageKey, JSON.stringify({ date: record.date, count: record.count }));
  } catch {
    // Ignore quota or serialization errors
  }
};

export const getDailyCount = (key, userId) => readRecord(key, userId).count;

export const canUse = (key, userId, limit) => {
  const { count } = readRecord(key, userId);
  const remaining = Math.max(0, limit - count);
  return { allowed: count < limit, remaining };
};

export const recordUse = (key, userId) => {
  const rec = readRecord(key, userId);
  const next = { date: getTodayStr(), count: (Number(rec.count) || 0) + 1 };
  writeRecord(key, userId, next);
  return next.count;
};

export const resetDaily = (key, userId) => {
  writeRecord(key, userId, { date: getTodayStr(), count: 0 });
};