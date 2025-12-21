import { apiClient } from '@/lib/api-client';

// Offline check-in queue using IndexedDB
interface QueuedCheckin {
  id: string;
  qrToken?: string;
  sessionId: number;
  studentId: number;
  timestamp: number;
  gpsLat?: number;
  gpsLng?: number;
  method: string;
  retryCount: number;
}

class OfflineCheckinQueue {
  private dbName = 'smartpresence-offline';
  private storeName = 'checkin-queue';
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
    });
  }

  async enqueue(checkin: Omit<QueuedCheckin, 'id' | 'retryCount'>): Promise<void> {
    if (!this.db) await this.init();

    const item: QueuedCheckin = {
      ...checkin,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async dequeue(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(): Promise<QueuedCheckin[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async incrementRetry(id: string): Promise<void> {
    if (!this.db) await this.init();

    const item = await this.get(id);
    if (item) {
      item.retryCount++;
      return this.update(item);
    }
  }

  private async get(id: string): Promise<QueuedCheckin | undefined> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async update(item: QueuedCheckin): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const offlineQueue = new OfflineCheckinQueue();

// Sync manager
export class OfflineSyncManager {
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private isSyncing = false;

  async startSync(intervalMs: number = 30000): Promise<void> {
    // Initial sync
    await this.sync();

    // Periodic sync
    this.syncInterval = setInterval(() => this.sync(), intervalMs);

    // Sync when coming back online
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.sync());
    }
  }

  stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async sync(): Promise<{ successful: number; failed: number }> {
    if (this.isSyncing) return { successful: 0, failed: 0 };
    if (!navigator.onLine) return { successful: 0, failed: 0 };

    this.isSyncing = true;
    let successful = 0;
    let failed = 0;

    try {
      const items = await offlineQueue.getAll();

      for (const item of items) {
        try {
          if (!item.qrToken) {
            // Nothing actionable to replay; drop it.
            await offlineQueue.dequeue(item.id);
            failed++;
            continue;
          }

          // Replay QR check-in against the real backend
          await apiClient('/api/qr/checkin', {
            method: 'POST',
            data: {
              token: item.qrToken,
              gps_lat: item.gpsLat,
              gps_lng: item.gpsLng,
            },
          });

          {
            // Success - remove from queue
            await offlineQueue.dequeue(item.id);
            successful++;
            console.log(`✅ Synced offline check-in: ${item.id}`);
          }
        } catch (error) {
          const status = (error as any)?.response?.status as number | undefined;

          if (status && status >= 400 && status < 500) {
            // Client error - remove from queue (won't succeed on retry)
            await offlineQueue.dequeue(item.id);
            failed++;
            console.error(`❌ Removed failed check-in (client error ${status}): ${item.id}`);
          } else {
            // Server/network error - increment retry and keep in queue
            await offlineQueue.incrementRetry(item.id);
            failed++;
            console.error(`Sync error for ${item.id}:`, error);

            // Remove if too many retries
            if (item.retryCount >= 5) {
              await offlineQueue.dequeue(item.id);
              console.error(`❌ Removed check-in after 5 retries: ${item.id}`);
            }
          }
        }
      }
    } finally {
      this.isSyncing = false;
    }

    if (successful > 0 || failed > 0) {
      console.log(`🔄 Sync complete: ${successful} successful, ${failed} failed`);
    }

    return { successful, failed };
  }

  async addCheckin(data: Omit<QueuedCheckin, 'id' | 'retryCount'>): Promise<void> {
    await offlineQueue.enqueue(data);
    
    // Try immediate sync if online
    if (navigator.onLine) {
      setTimeout(() => this.sync(), 1000);
    }
  }

  async getQueueSize(): Promise<number> {
    const items = await offlineQueue.getAll();
    return items.length;
  }
}

export const syncManager = new OfflineSyncManager();
