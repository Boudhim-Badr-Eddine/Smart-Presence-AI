/**
 * Offline Check-in Service
 * Allows students to check in without internet, syncs when online
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { apiClient } from '@/lib/api-client';

interface OfflineCheckIn {
  id: string;
  sessionId: number;
  photo: Blob;
  latitude: number | null;
  longitude: number | null;
  deviceId: string;
  timestamp: string;
  synced: 0 | 1;
}

interface SmartPresenceDB extends DBSchema {
  'offline-checkins': {
    key: string;
    value: OfflineCheckIn;
    indexes: { 'by-synced': 0 | 1 };
  };
}

class OfflineCheckInService {
  private db: IDBPDatabase<SmartPresenceDB> | null = null;

  async init() {
    if (!this.db) {
      this.db = await openDB<SmartPresenceDB>('smartpresence-offline', 1, {
        upgrade(db) {
          const store = db.createObjectStore('offline-checkins', { keyPath: 'id' });
          store.createIndex('by-synced', 'synced');
        },
      });
    }
  }

  async saveCheckIn(
    sessionId: number,
    photo: Blob,
    latitude: number | null,
    longitude: number | null
  ): Promise<string> {
    await this.init();
    
    const id = `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const deviceId = this.getDeviceId();
    
    const checkIn: OfflineCheckIn = {
      id,
      sessionId,
      photo,
      latitude,
      longitude,
      deviceId,
      timestamp: new Date().toISOString(),
      synced: 0,
    };

    await this.db!.add('offline-checkins', checkIn);
    
    // Try to sync immediately if online
    if (navigator.onLine) {
      this.syncPending();
    }
    
    return id;
  }

  async getPendingCheckIns(): Promise<OfflineCheckIn[]> {
    await this.init();
    return this.db!.getAllFromIndex('offline-checkins', 'by-synced', 0);
  }

  async syncPending(): Promise<{ success: number; failed: number }> {
    const pending = await this.getPendingCheckIns();
    let success = 0;
    let failed = 0;

    for (const checkIn of pending) {
      try {
        const formData = new FormData();
        formData.append('photo', checkIn.photo);
        if (checkIn.latitude) formData.append('latitude', checkIn.latitude.toString());
        if (checkIn.longitude) formData.append('longitude', checkIn.longitude.toString());
        formData.append('device_id', checkIn.deviceId);

        await apiClient(`/api/smart-attendance/self-checkin?session_id=${encodeURIComponent(checkIn.sessionId.toString())}`, {
          method: 'POST',
          data: formData,
        });

        {
          // Mark as synced
          await this.db!.put('offline-checkins', { ...checkIn, synced: 1 });
          success++;
        }
      } catch (error) {
        console.error('Sync failed for check-in:', checkIn.id, error);
        failed++;
      }
    }

    // Clean up synced check-ins older than 7 days
    await this.cleanupOldCheckIns();

    return { success, failed };
  }

  async cleanupOldCheckIns() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    const all = await this.db!.getAll('offline-checkins');
    for (const checkIn of all) {
      if (checkIn.synced === 1 && new Date(checkIn.timestamp) < cutoff) {
        await this.db!.delete('offline-checkins', checkIn.id);
      }
    }
  }

  private getDeviceId(): string {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }

  async getQueuedCount(): Promise<number> {
    const pending = await this.getPendingCheckIns();
    return pending.length;
  }
}

export const offlineCheckInService = new OfflineCheckInService();

// Auto-sync when coming online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    offlineCheckInService.syncPending();
  });
}
