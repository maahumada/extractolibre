import { Schema, Document, Model, models, model } from 'mongoose';
import { connectDB } from './mongo';

export interface MeliTokenDocument extends Document {
  sellerId: number;
  access_token: string;
  refresh_token: string;
  expires_at: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MeliTokenSchema = new Schema<MeliTokenDocument>(
  {
    sellerId: { type: Number, required: true, unique: true, index: true },
    access_token: { type: String, required: true },
    refresh_token: { type: String, required: true },
    expires_at: { type: Date, required: true },
  },
  { timestamps: true }
);

export const MeliToken: Model<MeliTokenDocument> =
  models.MeliToken || model<MeliTokenDocument>('MeliToken', MeliTokenSchema);

type OAuthTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id?: number;
};

const TOKEN_ENDPOINT = 'https://api.mercadolibre.com/oauth/token';

function computeExpiry(expiresIn: number): Date {
  return new Date(Date.now() + expiresIn * 1000);
}

async function refreshToken(
  tokenDoc: MeliTokenDocument
): Promise<MeliTokenDocument> {
  if (!process.env.MELI_CLIENT_ID || !process.env.MELI_CLIENT_SECRET) {
    throw new Error('Variables OAuth de Mercado Libre no configuradas');
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: process.env.MELI_CLIENT_ID,
    client_secret: process.env.MELI_CLIENT_SECRET,
    refresh_token: tokenDoc.refresh_token,
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Fallo al refrescar token: ${response.status} ${errorText}`
    );
  }

  const data = (await response.json()) as OAuthTokenResponse;
  tokenDoc.access_token = data.access_token;
  tokenDoc.refresh_token = data.refresh_token || tokenDoc.refresh_token;
  tokenDoc.expires_at = computeExpiry(data.expires_in);
  await tokenDoc.save();
  return tokenDoc;
}

export async function upsertMeliToken(params: {
  sellerId: number;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}): Promise<MeliTokenDocument> {
  await connectDB();
  const expires_at = computeExpiry(params.expires_in);
  const token = await MeliToken.findOneAndUpdate(
    { sellerId: params.sellerId },
    {
      access_token: params.access_token,
      refresh_token: params.refresh_token,
      expires_at,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return token;
}

export async function getValidAccessToken(
  sellerId: number
): Promise<string> {
  await connectDB();
  const tokenDoc = await MeliToken.findOne({ sellerId });

  if (!tokenDoc) {
    throw new Error(`No hay token almacenado para sellerId=${sellerId}`);
  }

  const now = Date.now();
  const expiresAt = tokenDoc.expires_at.getTime();
  const shouldRefresh = expiresAt - 60_000 <= now;

  if (shouldRefresh) {
    const refreshed = await refreshToken(tokenDoc);
    return refreshed.access_token;
  }

  return tokenDoc.access_token;
}
