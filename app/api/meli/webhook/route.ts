import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongo';
import { getValidAccessToken } from '@/lib/meliTokens';
import { persistOrderAndClient } from '@/lib/meliSync';

type MeliWebhookPayload = {
  topic?: string;
  id?: number | string;
  resource?: string;
  user_id?: number;
  [key: string]: unknown;
};

function extractOrderId(payload: MeliWebhookPayload): number | null {
  if (payload.id) {
    const asNumber = Number(payload.id);
    if (!Number.isNaN(asNumber)) return asNumber;
  }
  if (payload.resource && typeof payload.resource === 'string') {
    const segments = payload.resource.split('/');
    const maybeId = Number(segments.pop());
    if (!Number.isNaN(maybeId)) return maybeId;
  }
  return null;
}

// Webhook de Mercado Libre para nuevas órdenes
export async function POST(request: Request) {
  let payload: MeliWebhookPayload = {};
  try {
    payload = await request.json();
  } catch (error) {
    console.error('No se pudo parsear el webhook', error);
    return NextResponse.json({ ok: true });
  }

  if (payload.topic !== 'orders') {
    return NextResponse.json({ ok: true });
  }

  const orderId = extractOrderId(payload);
  if (!orderId) {
    console.error('Webhook sin orderId válido', payload);
    return NextResponse.json({ ok: true });
  }

  try {
    await connectDB();
    const sellerId = Number(process.env.MELI_SELLER_ID ?? payload.user_id);
    if (!sellerId) {
      throw new Error('SellerId no configurado');
    }

    const accessToken = await getValidAccessToken(sellerId);

    const orderResponse = await fetch(
      `https://api.mercadolibre.com/orders/${orderId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!orderResponse.ok) {
      const text = await orderResponse.text();
      throw new Error(
        `Fallo al obtener orden ${orderId}: ${orderResponse.status} ${text}`
      );
    }

    const order = await orderResponse.json();
    const shippingId = order.shipping?.id;
    let shipment: any = null;

    if (shippingId) {
      const shipmentResponse = await fetch(
        `https://api.mercadolibre.com/shipments/${shippingId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (shipmentResponse.ok) {
        shipment = await shipmentResponse.json();
      } else {
        console.error(
          `No se pudo obtener shipment ${shippingId}: ${shipmentResponse.status}`
        );
      }
    }

    await persistOrderAndClient(order, shipment);
  } catch (error) {
    console.error('Error procesando webhook', error);
  }

  return NextResponse.json({ ok: true });
}
