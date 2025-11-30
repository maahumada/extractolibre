import { Cliente, Venta } from './models';

export function buildPhone(shipment: any): string | null {
  const phone = shipment?.receiver_phone;
  if (!phone) return null;
  if (typeof phone === 'string') return phone;

  const parts = [phone.area_code, phone.number, phone.extension]
    .filter(Boolean)
    .map((p: any) => String(p));
  return parts.length ? parts.join(' ') : null;
}

export function buildAddress(shipment: any) {
  const addr = shipment?.receiver_address || {};
  return {
    calle: addr.street_name || '',
    numero: addr.street_number ? String(addr.street_number) : '',
    ciudad: addr.city?.name || '',
    provincia: addr.state?.name || '',
    cp: addr.zip_code || '',
    textoCompleto: addr.comment || addr.address_line || '',
  };
}

// Persiste/actualiza cliente y venta a partir de datos de orden y envío
export async function persistOrderAndClient(order: any, shipment: any) {
  const buyer = order.buyer || {};
  const buyerId = Number(buyer.id);
  if (!buyerId) {
    throw new Error('buyer.id no disponible en la orden');
  }

  const telefono = buildPhone(shipment);
  const direccion = buildAddress(shipment);

  const existingCliente = await Cliente.findOne({ meliUserId: buyerId });

  const receiverName =
    shipment?.receiver_address?.receiver_name &&
    String(shipment.receiver_address.receiver_name).trim();
  const fallbackName = [buyer.first_name, buyer.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();
  const nombreComprador =
    receiverName || fallbackName || buyer.nickname || 'Sin nombre';
  const alias = buyer.nickname || existingCliente?.alias || '';

  const mergedDireccion = existingCliente
    ? {
        calle: direccion.calle || existingCliente.direccion.calle,
        numero: direccion.numero || existingCliente.direccion.numero,
        ciudad: direccion.ciudad || existingCliente.direccion.ciudad,
        provincia: direccion.provincia || existingCliente.direccion.provincia,
        cp: direccion.cp || existingCliente.direccion.cp,
        textoCompleto:
          direccion.textoCompleto || existingCliente.direccion.textoCompleto,
      }
    : direccion;

  const cliente = await Cliente.findOneAndUpdate(
    { meliUserId: buyerId },
    {
      nombre: nombreComprador,
      alias,
      telefono: telefono ?? existingCliente?.telefono ?? null,
      direccion: mergedDireccion,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const items =
    Array.isArray(order.order_items) && order.order_items.length
      ? order.order_items.map((item: any) => ({
          itemId: Number(item.item?.id) || 0,
          titulo: item.item?.title || 'Sin título',
          sku: item.item?.seller_sku || null,
          cantidad: item.quantity || 0,
          precioUnitario: item.unit_price || 0,
        }))
      : [];

  await Venta.findOneAndUpdate(
    { meliOrderId: Number(order.id) },
    {
      cliente: cliente._id,
      fecha: new Date(order.date_created),
      total: order.total_amount,
      items,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}
