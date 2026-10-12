/**
 * MongoDB connection for accounts, verification codes and sessions. Server-side only: the
 * connection string (MONGODB_URI) is read from the server environment (.env.local locally,
 * Render's Environment settings in production) and is never sent to the browser or logged.
 */
import { MongoClient, type Collection, type Db } from "mongodb";

/** A user account. Passwords are stored only as bcrypt hashes. */
export type UserDoc = {
  _id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: Date;
  /** Consecutive wrong passwords, reset on a successful sign-in */
  failed_logins: number;
  /** Sign-in is paused until this time after too many wrong passwords */
  locked_until: Date | null;
};

export type PasswordResetDoc = {
  _id: string; // email
  code_hash: string;
  expires_at: Date;
  attempts: number;
  last_sent_at: Date;
  purge_at: Date;
};

/** A signed-in session. Only a SHA-256 hash of the token is stored, never the token itself. */
export type SessionDoc = {
  _id: string; // sha256(token)
  user_id: string;
  created_at: Date;
  /** MongoDB deletes the session at this time (a TTL index) */
  expires_at: Date;
};

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("Accounts aren't set up yet: the database connection (MONGODB_URI) is missing.");
  }
}

let dbPromise: Promise<Db> | null = null;

async function connect(uri: string) {
  const client = await MongoClient.connect(uri, { serverSelectionTimeoutMS: 8000 });
  const db = client.db(process.env["MONGODB_DB"]?.trim() || "atelier_ora");
  await Promise.all([
    db.collection<UserDoc>("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("password_resets").createIndex({ purge_at: 1 }, { expireAfterSeconds: 0 }),
    db.collection("sessions").createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }),
    db.collection("sessions").createIndex({ user_id: 1 }),
  ]);
  return db;
}

/** The shared database, connected once per server process. */
export async function getDb(): Promise<Db> {
  const uri = process.env["MONGODB_URI"]?.trim();
  if (!uri) throw new DatabaseNotConfiguredError();
  if (!dbPromise) {
    dbPromise = connect(uri).catch((error: unknown) => {
      dbPromise = null; // retry on the next request
      throw error;
    });
  }
  return dbPromise;
}

export async function collections(): Promise<{
  users: Collection<UserDoc>;
  resets: Collection<PasswordResetDoc>;
  sessions: Collection<SessionDoc>;
}> {
  const db = await getDb();
  return {
    users: db.collection<UserDoc>("users"),
    resets: db.collection<PasswordResetDoc>("password_resets"),
    sessions: db.collection<SessionDoc>("sessions"),
  };
}
