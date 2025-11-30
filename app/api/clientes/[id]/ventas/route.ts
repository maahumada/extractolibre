import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongo';
import { Cliente, Venta } from '@/lib/models';

// Devuelve las ventas asociadas a un cliente específico
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'Falta id de cliente' }, { status: 400 });
  }

  await connectDB();
  const cliente = await Cliente.findById(id);
  if (!cliente) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
  }

  const ventas = await Venta.find({ cliente: cliente._id })
    .sort({ fecha: -1 })
    .lean();

  const total = ventas.reduce((acc, v) => acc + (v.total || 0), 0);

  return NextResponse.json({
    clienteId: id,
    count: ventas.length,
    total,
    ventas: ventas.map((v) => ({
      meliOrderId: v.meliOrderId,
      fecha: v.fecha,
      total: v.total,
      items: v.items,
    })),
  });
}
