/**
 * Firebase Admin (Firestore + Storage) for the store.
 * Credentials come from env — never commit the service account JSON.
 */
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";
import { env, requireEnv } from "./env";

let app: App | null = null;

function parseServiceAccount() {
  const json = env("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (json) {
    const parsed = JSON.parse(json) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON incompleto (project_id, client_email, private_key)");
    }
    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key.replace(/\\n/g, "\n"),
    };
  }

  const projectId = requireEnv("FIREBASE_PROJECT_ID");
  const clientEmail = requireEnv("FIREBASE_CLIENT_EMAIL");
  const privateKey = requireEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n");
  return { projectId, clientEmail, privateKey };
}

export function firebaseApp(): App {
  if (app) return app;
  const existing = getApps()[0];
  if (existing) {
    app = existing;
    return app;
  }
  const { projectId, clientEmail, privateKey } = parseServiceAccount();
  const storageBucket =
    env("FIREBASE_STORAGE_BUCKET") ??
    // Proyectos nuevos suelen usar .firebasestorage.app; los viejos .appspot.com
    `${projectId}.firebasestorage.app`;
  app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    projectId,
    storageBucket,
  });
  return app;
}

export function db(): Firestore {
  return getFirestore(firebaseApp());
}

export function storage(): Storage {
  return getStorage(firebaseApp());
}

export function mediaBucket() {
  return storage().bucket();
}
