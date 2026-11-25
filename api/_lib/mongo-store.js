/**
 * Hall of fame store on MongoDB Atlas (TESTELLARIS_GDD.md §7.2). The connection string comes from
 * the `MONGODB_URI` environment variable of the Vercel project, never from the repository; the
 * database name from `MONGODB_DB` (default "testellaris").
 *
 * Collection `entries`: one document per top 10 entry (the fields of `board.js` PUBLIC_FIELDS);
 * only the top 10 of each ruleset is kept. The connection is reused by warm function instances.
 */

/** Same order as `compareEntries` of js/testellaris-scores.js (ISO dates sort as text). */
export const BOARD_SORT = { score: -1, maxTier: -1, answered: 1, date: 1 };

let connecting = null;

async function connect(uri, dbName) {
    const { MongoClient } = await import("mongodb");
    const client = new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 5000 });
    await client.connect();
    const db = client.db(dbName);
    await db.collection("entries").createIndex({ rulesetId: 1, ...BOARD_SORT }, { name: "board" });
    return db;
}

/** The store, or null when `MONGODB_URI` is not set (the API then answers 503). */
export async function mongoStore(env = process.env) {
    if (!env.MONGODB_URI) return null;
    connecting ??= connect(env.MONGODB_URI, env.MONGODB_DB || "testellaris").catch((error) => {
        connecting = null; // try again on the next request
        throw error;
    });
    const db = await connecting;
    const entries = db.collection("entries");
    const board = (rulesetId, limit, projection) => entries.find({ rulesetId }, { projection }).sort(BOARD_SORT).limit(limit).toArray();
    return {
        top: (rulesetId, limit) => board(rulesetId, limit, { _id: 0 }),
        insert: (entry) => entries.insertOne({ ...entry }),
        async trim(rulesetId, limit) {
            const keep = await board(rulesetId, limit, { _id: 1 });
            await entries.deleteMany({ rulesetId, _id: { $nin: keep.map((doc) => doc._id) } });
        },
    };
}
