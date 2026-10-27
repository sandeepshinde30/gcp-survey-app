/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GcpRecord, SurveySession } from '../types';

const DB_NAME = 'GcpSurveyDB';
const DB_VERSION = 1;
const STORE_NAME = 'gcp_records';
const SESSION_KEY = 'gcp_current_session';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('gcpId', 'gcpId', { unique: false });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('projectName', 'projectName', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

export async function getAllRecords(): Promise<GcpRecord[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const records = request.result as GcpRecord[];
        // Sort descending by creation date
        records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(records);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Error fetching records from IndexedDB:', err);
    return [];
  }
}

export async function saveRecord(record: GcpRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(record);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteRecord(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getRecordById(id: string): Promise<GcpRecord | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

// Session persistence (stored in localStorage for fast immediate restoration)
export function getStoredSession(): SurveySession {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading stored session', e);
  }
  return {
    hotelLocation: null,
    hotelCapturedAt: null,
    hotelName: 'Base Hotel / Base Camp',
    currentGcpLocation: null,
    lastRecordedGcp: null,
    accumulatedDistanceMeters: 0,
  };
}

export function saveStoredSession(session: SurveySession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.error('Error saving session', e);
  }
}

export function clearStoredSession(): SurveySession {
  const fresh: SurveySession = {
    hotelLocation: null,
    hotelCapturedAt: null,
    hotelName: 'Base Hotel / Base Camp',
    currentGcpLocation: null,
    lastRecordedGcp: null,
    accumulatedDistanceMeters: 0,
  };
  saveStoredSession(fresh);
  return fresh;
}
