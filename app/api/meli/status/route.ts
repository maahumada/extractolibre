import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongo';
import { MeliToken } from '@/lib/meliTokens';

// Devuelve si existe un token almacenado para el seller configurado
export async function GET() {
  const sellerId = Number(process.env.MELI_SELLER_ID);
  if (!sellerId) {
    return NextResponse.json(
      { connected: false, error: 'Configura MELI_SELLER_ID' },
      { status: 400 }
    );
  }

  await connectDB();
  const token = await MeliToken.findOne({ sellerId }).lean();
  const connected = !!token;

  return NextResponse.json({ connected, sellerId });
}
