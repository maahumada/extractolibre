import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongo';
import { Cliente } from '@/lib/models';

// Lista básica de clientes con paginación simple
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
    Cliente.aggregate([
      {
        $lookup: {
          from: 'ventas',
          localField: '_id',
          foreignField: 'cliente',
          as: 'ventas',
          pipeline: [
            { $sort: { fecha: -1 } },
            { $project: { fecha: 1 } },
            { $limit: 1 },
          ],
        },
      },
      {
        $addFields: {
          lastVentaDate: { $arrayElemAt: ['$ventas.fecha', 0] },
        },
      },
      { $project: { ventas: 0 } },
      { $sort: { lastVentaDate: -1, updatedAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]),
    Cliente.countDocuments(),
  ]);

  return NextResponse.json({
    data,
    page,
    limit,
    total,
  });
}
