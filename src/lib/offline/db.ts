import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'blue-shores-pm'
const DB_VERSION = 1

export interface OfflineDB {
  queue: {
    key: string
    value: {
      id: string
      type: string
      table: string
      data: Record<string, unknown>
      timestamp: string
      retries: number
    }
  }
  cache: {
    key: string
    value: {
      key: string
      data: unknown
      timestamp: string
    }
  }
  photos: {
    key: string
    value: {
      id: string
      blob: Blob
      metadata: Record<string, unknown>
      timestamp: string
    }
  }
}

let dbInstance: IDBPDatabase | null = null

export async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache', { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos', { keyPath: 'id' })
      }
    },
  })

  return dbInstance
}
