import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongo';
import { getValidAccessToken } from '@/lib/meliTokens';
import { persistOrderAndClient } from '@/lib/meliSync';

// Sincroniza órdenes recientes desde la API de Mercado Libre (para recuperar pedidos no recibidos por webhook)
export async function POST(request: Request) {
  const sellerId = Number(process.env.MELI_SELLER_ID);
  if (!sellerId) {
    return NextResponse.json(
      { error: 'Configura MELI_SELLER_ID' },
      { status: 500 }
    );
  }

  let limit = 20;
  try {
    const body = await request.json().catch(() => ({}));
    if (body?.limit) {
      limit = Math.min(Math.max(Number(body.limit), 1), 50);
    }
  } catch {
    // ignore
  }

  try {
    await connectDB();
    const accessToken = await getValidAccessToken(sellerId);

    const searchParams = new URLSearchParams({
      seller: String(sellerId),
      limit: String(limit),
      sort: 'date_desc',
    });

    const url = `https://api.mercadolibre.com/orders/search?${searchParams.toString()}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `No se pudo listar órdenes: ${res.status} ${text}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const results = Array.isArray(data.results) ? data.results : [];
    let processed = 0;

    for (const order of results) {
      try {
        let shipment: any = null;
        const shippingId = order.shipping?.id;
        if (shippingId) {
          const shipmentRes = await fetch(
            `https://api.mercadolibre.com/shipments/${shippingId}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (shipmentRes.ok) {
            shipment = await shipmentRes.json();
          }
        }
        await persistOrderAndClient(order, shipment);
        processed += 1;
      } catch (err) {
        console.error('No se pudo procesar orden en sync', err);
      }
    }

    return NextResponse.json({
      ok: true,
      processed,
      total: results.length,
    });
  } catch (error) {
    console.error('Error en sync manual', error);
    return NextResponse.json(
      { error: 'Fallo la sincronización manual' },
      { status: 500 }
    );
  }
}
