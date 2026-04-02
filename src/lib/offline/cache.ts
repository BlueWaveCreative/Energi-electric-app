import { getDB } from './db'

export async function cacheData(key: string, data: unknown): Promise<void> {
  const db = await getDB()
  await db.put('cache', {
    key,
    data,
    timestamp: new Date().toISOString(),
  })
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  const db = await getDB()
  const result = await db.get('cache', key)
  return result?.data as T ?? null
}

export async function removeCachedData(key: string): Promise<void> {
  const db = await getDB()
  await db.delete('cache', key)
}

/**
 * Cache project data for offline access.
 * Call this when a project detail page loads while online.
 */
export async function cacheProjectData(
  projectId: string,
  data: {
    project: unknown
    notes: unknown[]
    photos: unknown[]
    timeEntries: unknown[]
  }
): Promise<void> {
  await cacheData(`project:${projectId}`, data)
}

export async function getCachedProject(projectId: string): Promise<any | null> {
  return getCachedData(`project:${projectId}`)
}
