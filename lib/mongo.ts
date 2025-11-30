import mongoose from 'mongoose';

// Cache global para evitar múltiples conexiones en dev/hot-reload
type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache =
  global._mongooseCache || { conn: null, promise: null };

global._mongooseCache = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI no está configurado');
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, {
        // Ajusta aquí opciones adicionales de conexión si lo necesitás
        maxPoolSize: 10,
      })
      .then((mongooseInstance) => mongooseInstance);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
