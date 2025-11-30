import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongo';
import { Cliente } from '@/lib/models';

// Actualiza el teléfono de un cliente de forma manual
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'Falta id de cliente' }, { status: 400 });
  }

  let telefono: string | null = null;
  try {
    const body = await request.json();
    telefono = body?.telefono?.toString() ?? null;
  } catch {
    // ignore, telefono queda null
  }

  await connectDB();
  const cliente = await Cliente.findByIdAndUpdate(
    id,
    { telefono },
    { new: true }
  ).lean();

  if (!cliente) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, cliente });
}
