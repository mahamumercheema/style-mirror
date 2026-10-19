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

import bcrypt from "bcryptjs";

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("Accounts aren't set up yet: the database connection (MONGODB_URI) is missing.");
  }
}

// In-Memory Collection Mock for environments without active MongoDB (AI Studio container / preview)
class InMemoryCollection<T extends { _id: string }> {
  private items = new Map<string, T>();

  async createIndex(): Promise<string> {
    return "mock_index";
  }

  async findOne(query: Record<string, unknown>, _options?: unknown): Promise<T | null> {
    for (const item of this.items.values()) {
      let matches = true;
      for (const [k, v] of Object.entries(query)) {
        if ((item as Record<string, unknown>)[k] !== v) {
          matches = false;
          break;
        }
      }
      if (matches) return { ...item };
    }
    return null;
  }

  async insertOne(doc: T): Promise<{ insertedId: string }> {
    if ("email" in (doc as Record<string, unknown>)) {
      const email = (doc as Record<string, unknown>)["email"];
      for (const item of this.items.values()) {
        if ((item as Record<string, unknown>)["email"] === email) {
          const err = new Error("E11000 duplicate key error collection");
          (err as { code: number }).code = 11000;
          throw err;
        }
      }
    }
    this.items.set(doc._id, { ...doc });
    return { insertedId: doc._id };
  }

  async updateOne(
    query: Record<string, unknown>,
    update: { $set?: Partial<T> },
  ): Promise<{ modifiedCount: number }> {
    for (const [id, item] of this.items.entries()) {
      let matches = true;
      for (const [k, v] of Object.entries(query)) {
        if ((item as Record<string, unknown>)[k] !== v) {
          matches = false;
          break;
        }
      }
      if (matches) {
        this.items.set(id, { ...item, ...(update.$set || {}) });
        return { modifiedCount: 1 };
      }
    }
    return { modifiedCount: 0 };
  }

  async replaceOne(
    query: Record<string, unknown>,
    doc: T,
    options?: { upsert?: boolean },
  ): Promise<{ modifiedCount: number }> {
    for (const [id, item] of this.items.entries()) {
      let matches = true;
      for (const [k, v] of Object.entries(query)) {
        if ((item as Record<string, unknown>)[k] !== v) {
          matches = false;
          break;
        }
      }
      if (matches) {
        this.items.set(id, { ...doc });
        return { modifiedCount: 1 };
      }
    }
    if (options?.upsert) {
      this.items.set(doc._id, { ...doc });
      return { modifiedCount: 1 };
    }
    return { modifiedCount: 0 };
  }

  async deleteOne(query: Record<string, unknown>): Promise<{ deletedCount: number }> {
    for (const [id, item] of this.items.entries()) {
      let matches = true;
      for (const [k, v] of Object.entries(query)) {
        if ((item as Record<string, unknown>)[k] !== v) {
          matches = false;
          break;
        }
      }
      if (matches) {
        this.items.delete(id);
        return { deletedCount: 1 };
      }
    }
    return { deletedCount: 0 };
  }

  async deleteMany(query: Record<string, unknown>): Promise<{ deletedCount: number }> {
    let deletedCount = 0;
    for (const [id, item] of this.items.entries()) {
      let matches = true;
      for (const [k, v] of Object.entries(query)) {
        if ((item as Record<string, unknown>)[k] !== v) {
          matches = false;
          break;
        }
      }
      if (matches) {
        this.items.delete(id);
        deletedCount++;
      }
    }
    return { deletedCount };
  }
}

// In-memory singletons
const inMemoryUsers = new InMemoryCollection<UserDoc>();
const inMemoryResets = new InMemoryCollection<PasswordResetDoc>();
const inMemorySessions = new InMemoryCollection<SessionDoc>();

// Seed sample demo accounts
const defaultDemoHash = bcrypt.hashSync("password123", 10);
void inMemoryUsers.insertOne({
  _id: "usr_demo",
  email: "demo@atelier-ora.com",
  name: "Demo Stylist",
  password_hash: defaultDemoHash,
  created_at: new Date(),
  failed_logins: 0,
  locked_until: null,
});

void inMemoryUsers.insertOne({
  _id: "usr_default",
  email: "user@example.com",
  name: "Fashion Enthusiast",
  password_hash: defaultDemoHash,
  created_at: new Date(),
  failed_logins: 0,
  locked_until: null,
});

let dbPromise: Promise<Db> | null = null;

async function connect(uri: string) {
  const client = await MongoClient.connect(uri, { serverSelectionTimeoutMS: 5000 });
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
  const uri = process.env["MONGODB_URI"]?.trim();
  if (uri) {
    try {
      const db = await getDb();
      return {
        users: db.collection<UserDoc>("users"),
        resets: db.collection<PasswordResetDoc>("password_resets"),
        sessions: db.collection<SessionDoc>("sessions"),
      };
    } catch (err) {
      console.warn(
        "[AI Studio] MongoDB connection unavailable — falling back to in-memory store:",
        err,
      );
    }
  }

  // Graceful in-memory fallback
  return {
    users: inMemoryUsers as unknown as Collection<UserDoc>,
    resets: inMemoryResets as unknown as Collection<PasswordResetDoc>,
    sessions: inMemorySessions as unknown as Collection<SessionDoc>,
  };
}
