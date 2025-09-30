// services/sqliteService.ts
import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("safeher.db");

export const initDB = async (): Promise<void> => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS emergency_alerts (
      id TEXT PRIMARY KEY NOT NULL,
      timestamp INTEGER,
      latitude REAL,
      longitude REAL,
      contacts TEXT,
      status TEXT,
      synced INTEGER DEFAULT 0
    );
  `);
};

export const insertAlert = async (alert: {
  id: string;
  timestamp: number;
  latitude: number;
  longitude: number;
  contactsNotified: any[];
  status?: string;
  synced?: boolean;
}): Promise<void> => {
  await db.runAsync(
    `
    INSERT INTO emergency_alerts 
      (id, timestamp, latitude, longitude, contacts, status, synced)
    VALUES (?, ?, ?, ?, ?, ?, ?);
    `,
    [
      alert.id,
      alert.timestamp,
      alert.latitude,
      alert.longitude,
      JSON.stringify(alert.contactsNotified),
      alert.status || "pending",
      alert.synced ? 1 : 0,
    ]
  );
};

export const getPendingAlerts = async (): Promise<any[]> => {
  return await db.getAllAsync(
    `SELECT * FROM emergency_alerts WHERE synced = 0;`
  );
};

export const markAlertSynced = async (id: string): Promise<void> => {
  await db.runAsync(
    `UPDATE emergency_alerts SET synced = 1, status = 'sent' WHERE id = ?;`,
    [id]
  );
};

export const markAlertFailed = async (id: string): Promise<void> => {
  await db.runAsync(
    `UPDATE emergency_alerts SET status = 'failed' WHERE id = ?;`,
    [id]
  );
};