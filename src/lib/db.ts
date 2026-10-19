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

// MOCKED in-memory store for environments without external MongoDB connection
class InMemoryCollection<T extends { _id: string }> {
  private docs = new Map<string, T>();

  async findOne(query: Record<string, unknown>, _options?: unknown): Promise<T | null> {
    for (const doc of this.docs.values()) {
      let match = true;
      for (const [key, val] of Object.entries(query)) {
        if ((doc as Record<string, unknown>)[key] !== val) {
          match = false;
          break;
        }
      }
      if (match) return { ...doc };
    }
    return null;
  }

  async insertOne(doc: T): Promise<{ insertedId: string; acknowledged: boolean }> {
    this.docs.set(doc._id, { ...doc });
    return { insertedId: doc._id, acknowledged: true };
  }

  async updateOne(
    filter: Record<string, unknown>,
    update: { $set?: Partial<T> },
  ): Promise<{ matchedCount: number; modifiedCount: number }> {
    for (const [id, doc] of this.docs.entries()) {
      let match = true;
      for (const [key, val] of Object.entries(filter)) {
        if ((doc as Record<string, unknown>)[key] !== val) {
          match = false;
          break;
        }
      }
      if (match) {
        if (update.$set) {
          this.docs.set(id, { ...doc, ...update.$set });
        }
        return { matchedCount: 1, modifiedCount: 1 };
      }
    }
    return { matchedCount: 0, modifiedCount: 0 };
  }

  async replaceOne(
    filter: Record<string, unknown>,
    replacement: T,
    options?: { upsert?: boolean },
  ): Promise<{ matchedCount: number; modifiedCount: number; upsertedId?: string }> {
    const existing = await this.findOne(filter);
    if (existing) {
      this.docs.set(existing._id, { ...replacement });
      return { matchedCount: 1, modifiedCount: 1 };
    }
    if (options?.upsert) {
      const id = (filter["_id"] as string) || replacement._id;
      this.docs.set(id, { ...replacement, _id: id });
      return { matchedCount: 0, modifiedCount: 0, upsertedId: id };
    }
    return { matchedCount: 0, modifiedCount: 0 };
  }

  async deleteOne(filter: Record<string, unknown>): Promise<{ deletedCount: number }> {
    for (const [id, doc] of this.docs.entries()) {
      let match = true;
      for (const [key, val] of Object.entries(filter)) {
        if ((doc as Record<string, unknown>)[key] !== val) {
          match = false;
          break;
        }
      }
      if (match) {
        this.docs.delete(id);
        return { deletedCount: 1 };
      }
    }
    return { deletedCount: 0 };
  }

  async deleteMany(filter: Record<string, unknown>): Promise<{ deletedCount: number }> {
    let deleted = 0;
    for (const [id, doc] of this.docs.entries()) {
      let match = true;
      for (const [key, val] of Object.entries(filter)) {
        if ((doc as Record<string, unknown>)[key] !== val) {
          match = false;
          break;
        }
      }
      if (match) {
        this.docs.delete(id);
        deleted++;
      }
    }
    return { deletedCount: deleted };
  }

  async createIndex(): Promise<string> {
    return "ok";
  }
}

const mockUsers = new InMemoryCollection<UserDoc>();
const mockResets = new InMemoryCollection<PasswordResetDoc>();
const mockSessions = new InMemoryCollection<SessionDoc>();

let dbPromise: Promise<Db> | null = null;
let useMock = false;

async function connect(uri: string) {
  const client = await MongoClient.connect(uri, { serverSelectionTimeoutMS: 4000 });
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
export async function getDb(): Promise<Db | null> {
  const uri = process.env["MONGODB_URI"]?.trim();
  if (!uri) {
    useMock = true;
    return null;
  }
  if (useMock) return null;
  if (!dbPromise) {
    dbPromise = connect(uri).catch((error: unknown) => {
      console.warn(
        "[AI Studio] MongoDB connection failed, falling back to in-memory store:",
        error,
      );
      useMock = true;
      dbPromise = null;
      return null as unknown as Db;
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
  if (!db || useMock) {
    return {
      users: mockUsers as unknown as Collection<UserDoc>,
      resets: mockResets as unknown as Collection<PasswordResetDoc>,
      sessions: mockSessions as unknown as Collection<SessionDoc>,
    };
  }
  return {
    users: db.collection<UserDoc>("users"),
    resets: db.collection<PasswordResetDoc>("password_resets"),
    sessions: db.collection<SessionDoc>("sessions"),
  };
}
