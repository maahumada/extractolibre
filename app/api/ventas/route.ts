import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongo';
import { Venta } from '@/lib/models';

// Lista de ventas con paginación simple
export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Math.max(Number(url.searchParams.get('page') || 1), 1);
  const limit = Math.min(
    Math.max(Number(url.searchParams.get('limit') || 20), 1),
    100
  );
  const skip = (page - 1) * limit;

  await connectDB();
  const [data, total] = await Promise.all([
    Venta.find()
      .sort({ fecha: -1 })
      .skip(skip)
      .limit(limit)
      .populate('cliente')
      .lean(),
    Venta.countDocuments(),
  ]);

  return NextResponse.json({
    data,
    page,
    limit,
    total,
  });
}
