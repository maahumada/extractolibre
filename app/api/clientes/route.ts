import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongo';
import { Cliente } from '@/lib/models';
import type { PipelineStage } from 'mongoose';

// Lista básica de clientes con paginación simple
export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Math.max(Number(url.searchParams.get('page') || 1), 1);
  const limitParam = url.searchParams.get('limit');
  const searchQuery = url.searchParams.get('q')?.trim();
  const wantsAll =
    limitParam === '0' || (limitParam || '').toLowerCase() === 'all';
  const limit = wantsAll
    ? 0
    : Math.min(Math.max(Number(limitParam || 20), 1), 100);
  const skip = limit > 0 ? (page - 1) * limit : 0;

  await connectDB();

  const filter: Record<string, unknown> = searchQuery
    ? {
        $or: [
          { nombre: { $regex: escapeRegex(searchQuery), $options: 'i' } },
          { alias: { $regex: escapeRegex(searchQuery), $options: 'i' } },
          { 'direccion.ciudad': { $regex: escapeRegex(searchQuery), $options: 'i' } },
        ],
      }
    : {};

  const pipeline: PipelineStage[] = [
    ...(searchQuery ? [{ $match: filter }] : []),
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
  ];

  if (limit > 0) {
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });
  }

  const [data, total] = await Promise.all([
    Cliente.aggregate(pipeline),
    Cliente.countDocuments(filter),
  ]);

  return NextResponse.json({
    data,
    page: limit > 0 ? page : 1,
    limit,
    total,
  });
}

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
