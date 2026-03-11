import mongoose from "mongoose";

function getMongoURI(): string {
  const user = process.env.MONGODB_USER;
  const password = process.env.MONGODB_PASSWORD;
  const baseUrl = process.env.MONGODB_BASE_URL;
  const database = process.env.MONGODB_DATABASE;

  if (!user || !password || !baseUrl || !database) {
    throw new Error("MongoDB environment variables are not set");
  }

  // The base URL is a direct shard address (e.g. ac-xxx-shard-00-01.xxx.mongodb.net:27017)
  // Use standard mongodb:// with TLS for Atlas direct connection
  return `mongodb://${user}:${encodeURIComponent(password)}@${baseUrl}/${database}?tls=true&authSource=admin`;
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(getMongoURI());
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
}
