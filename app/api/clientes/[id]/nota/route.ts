import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongo';
import { Cliente } from '@/lib/models';

// Actualiza la nota libre de un cliente
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'Falta id de cliente' }, { status: 400 });
  }

  let nota: string = '';
  try {
    const body = await request.json();
    nota = (body?.nota || '').toString();
  } catch {
    nota = '';
  }

  await connectDB();
  const cliente = await Cliente.findByIdAndUpdate(
    id,
    { nota },
    { new: true }
  ).lean();

  if (!cliente) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, cliente });
}
