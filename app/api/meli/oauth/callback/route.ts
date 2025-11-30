import { NextResponse } from 'next/server';
import { upsertMeliToken } from '@/lib/meliTokens';
import { connectDB } from '@/lib/mongo';

// Endpoint de callback OAuth: intercambia el code por tokens y los guarda en MongoDB
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json(
      { error: 'Falta el parámetro "code" en el callback' },
      { status: 400 }
    );
  }

  const clientId = process.env.MELI_CLIENT_ID;
  const clientSecret = process.env.MELI_CLIENT_SECRET;
  const redirectUri = process.env.MELI_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { error: 'Variables de entorno OAuth incompletas' },
      { status: 500 }
    );
  }

  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    });

    const response = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error al intercambiar code por token', errorText);
      return NextResponse.json(
        { error: 'No se pudo obtener el token de Mercado Libre' },
        { status: 502 }
      );
    }

    const data = await response.json();
    const sellerId = Number(process.env.MELI_SELLER_ID ?? data.user_id);

    if (!sellerId) {
      return NextResponse.json(
        { error: 'No se pudo determinar sellerId (configura MELI_SELLER_ID)' },
        { status: 400 }
      );
    }

    await connectDB();
    const token = await upsertMeliToken({
      sellerId,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    });

    return NextResponse.json({
      ok: true,
      sellerId,
      expires_at: token.expires_at,
    });
  } catch (error) {
    console.error('Fallo en callback OAuth', error);
    return NextResponse.json(
      { error: 'Error al procesar el callback OAuth' },
      { status: 500 }
    );
  }
}
