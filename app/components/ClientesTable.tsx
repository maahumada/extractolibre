'use client';

import { useEffect, useState } from 'react';

type Cliente = {
  _id: string;
  meliUserId: number;
  nombre: string;
  alias?: string;
  telefono?: string | null;
  direccion?: {
    calle?: string;
    numero?: string;
    ciudad?: string;
    provincia?: string;
    cp?: string;
    textoCompleto?: string;
  };
  createdAt?: string;
  updatedAt?: string;
  lastVentaDate?: string;
  nota?: string;
};

type VentaResumen = {
  meliOrderId: number;
  fecha: string;
  total: number;
  items: {
    titulo: string;
    cantidad: number;
    precioUnitario: number;
  }[];
};

type VentasResponse = {
  clienteId: string;
  count: number;
  total: number;
  ventas: VentaResumen[];
};

type Props = {
  initialClientes: Cliente[];
};

// Tabla de clientes con refresh manual desde el browser
export default function ClientesTable({ initialClientes }: Props) {
  const [clientes, setClientes] = useState<Cliente[]>(initialClientes);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Cliente | null>(null);
  const [ventas, setVentas] = useState<VentasResponse | null>(null);
  const [ventasLoading, setVentasLoading] = useState(false);
  const [ventasError, setVentasError] = useState<string | null>(null);
  const [telefonoSaving, setTelefonoSaving] = useState(false);
  const [notaSaving, setNotaSaving] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/clientes', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setClientes(data.data || []);
    } catch (err) {
      console.error('Error refrescando clientes', err);
      setError('No se pudo refrescar la lista');
    } finally {
      setLoading(false);
    }
  };

  const loadVentas = async (clienteId: string) => {
    setVentasLoading(true);
    setVentasError(null);
    try {
      const res = await fetch(`/api/clientes/${clienteId}/ventas`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as VentasResponse;
      setVentas(data);
    } catch (err) {
      console.error('Error cargando ventas', err);
      setVentasError('No se pudo cargar el resumen de ventas');
    } finally {
      setVentasLoading(false);
    }
  };

  const syncManual = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch('/api/meli/sync', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await refresh();
    } catch (err) {
      console.error('Error sincronizando manualmente', err);
      setError('No se pudo sincronizar manualmente');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3 justify-between flex-wrap">
        <div>
          <h2 className="text-xl font-semibold">Clientes</h2>
          <span className="text-sm text-slate-600">
            {clientes.length} encontrado{clientes.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={syncManual}
            className="inline-flex items-center rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-green-700 transition disabled:opacity-60"
            disabled={syncing}
          >
            {syncing ? 'Sincronizando...' : 'Sincronizar órdenes'}
          </button>
          <button
            onClick={refresh}
            className="inline-flex items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 transition disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Actualizando...' : 'Refrescar lista'}
          </button>
        </div>
      </div>
      {error && (
        <div className="px-5 py-3 text-sm text-red-700 bg-red-50 border-b border-red-200">
          {error}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full text-base">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-slate-800">Nombre completo</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-800">Alias ML</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-800">ML User ID</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-800">Teléfono</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-800">Ciudad / Provincia</th>
            </tr>
          </thead>
          <tbody>
            {clientes.length === 0 && (
              <tr>
                <td className="px-5 py-4 text-slate-600" colSpan={4}>
                  No hay clientes aún. Generá una venta para verlos aquí.
                </td>
              </tr>
            )}
          {clientes.map((cliente) => (
              <tr
                key={cliente._id}
                className="border-t border-slate-100 cursor-pointer hover:bg-blue-50"
                onClick={() => {
                  setSelected(cliente);
                  loadVentas(cliente._id);
                }}
              >
                <td className="px-5 py-4 text-slate-900 text-lg">
                  {cliente.nombre}
                </td>
                <td className="px-5 py-4 text-slate-700">
                  {cliente.alias || '—'}
                </td>
                <td className="px-5 py-4 text-slate-700">
                  {cliente.meliUserId}
                </td>
                <td className="px-5 py-4 text-slate-700">
                  {cliente.telefono || '—'}
                </td>
                <td className="px-5 py-4 text-slate-700">
                  {[cliente.direccion?.ciudad, cliente.direccion?.provincia]
                    .filter(Boolean)
                    .join(', ') || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <DetailModal
          cliente={selected}
          onClose={() => setSelected(null)}
          onRefresh={refresh}
          ventas={ventas}
          ventasLoading={ventasLoading}
          ventasError={ventasError}
          onEditTelefono={async (telefono) => {
            if (!selected) return;
            setTelefonoSaving(true);
            try {
              const res = await fetch(`/api/clientes/${selected._id}/telefono`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telefono }),
              });
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              await refresh();
              setSelected((prev) => (prev ? { ...prev, telefono } : prev));
            } catch (err) {
              console.error('No se pudo guardar el teléfono', err);
              setError('No se pudo guardar el teléfono');
            } finally {
              setTelefonoSaving(false);
            }
          }}
          onEditNota={async (nota) => {
            if (!selected) return;
            setNotaSaving(true);
            try {
              const res = await fetch(`/api/clientes/${selected._id}/nota`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nota }),
              });
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              await refresh();
              setSelected((prev) => (prev ? { ...prev, nota } : prev));
            } catch (err) {
              console.error('No se pudo guardar la nota', err);
              setError('No se pudo guardar la nota');
            } finally {
              setNotaSaving(false);
            }
          }}
          telefonoSaving={telefonoSaving}
          notaSaving={notaSaving}
        />
      )}
    </section>
  );
}

type DetailProps = {
  cliente: Cliente;
  onClose: () => void;
  onRefresh: () => void;
  ventas: VentasResponse | null;
  ventasLoading: boolean;
  ventasError: string | null;
  onEditTelefono: (telefono: string | null) => Promise<void>;
  telefonoSaving: boolean;
  onEditNota: (nota: string) => Promise<void>;
  notaSaving: boolean;
};

function DetailModal({
  cliente,
  onClose,
  onRefresh,
  ventas,
  ventasLoading,
  ventasError,
  onEditTelefono,
  telefonoSaving,
  onEditNota,
  notaSaving,
}: DetailProps) {
  const [telefonoValue, setTelefonoValue] = useState<string>(cliente.telefono || '');
  const [telefonoEditing, setTelefonoEditing] = useState(false);
  const [notaValue, setNotaValue] = useState<string>(cliente.nota || '');

  useEffect(() => {
    setTelefonoValue(cliente.telefono || '');
    setTelefonoEditing(false);
    setNotaValue(cliente.nota || '');
  }, [cliente._id, cliente.telefono, cliente.nota]);

  const addressLines = [
    [cliente.direccion?.calle, cliente.direccion?.numero].filter(Boolean).join(' '),
    cliente.direccion?.textoCompleto,
    [cliente.direccion?.ciudad, cliente.direccion?.provincia]
      .filter(Boolean)
      .join(', '),
    cliente.direccion?.cp ? `CP ${cliente.direccion?.cp}` : '',
  ]
    .filter((line) => !!line)
    .map((line) => line.trim());

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-full w-10 h-10 flex items-center justify-center text-xl font-bold shadow cursor-pointer"
          aria-label="Cerrar"
        >
          ×
        </button>
        <h3 className="text-2xl font-bold text-slate-900 mb-3">{cliente.nombre}</h3>
        <div className="space-y-2 text-slate-800">
          {cliente.alias ? (
            <p className="text-slate-700">
              <span className="font-semibold">Alias ML:</span> {cliente.alias}
            </p>
          ) : null}
          <p>
            <span className="font-semibold">ML User ID:</span> {cliente.meliUserId}
          </p>
          <div className="flex flex-col gap-2">
            <label className="font-semibold" htmlFor="telefono">
              Teléfono
            </label>
            <div className="flex items-center gap-2">
              {telefonoEditing ? (
                <>
                  <input
                    id="telefono"
                    type="text"
                    value={telefonoValue}
                    onChange={(e) => setTelefonoValue(e.target.value)}
                    placeholder="Ingresá un teléfono"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                  <button
                    onClick={async () => {
                      await onEditTelefono(telefonoValue.trim() || null);
                      setTelefonoEditing(false);
                    }}
                    className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 transition disabled:opacity-60"
                    disabled={telefonoSaving}
                  >
                    {telefonoSaving ? 'Guardando...' : 'Guardar'}
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-slate-900">
                    {telefonoValue || 'No disponible'}
                  </span>
                  <button
                    onClick={() => setTelefonoEditing(true)}
                    className="rounded-full bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300 transition"
                    aria-label="Editar teléfono"
                  >
                    ✏️
                  </button>
                </>
              )}
            </div>
          </div>
          <div>
            <p className="font-semibold">Dirección:</p>
            {addressLines.length === 0 ? (
              <p className="text-slate-600">No disponible</p>
            ) : (
              <ul className="list-disc list-inside text-slate-700">
                {addressLines.map((line, idx) => (
                  <li key={`${idx}-${line}`}>{line}</li>
                ))}
              </ul>
            )}
          </div>
          <p className="text-sm text-slate-500">
            Última actualización:{' '}
            {cliente.updatedAt
              ? new Date(cliente.updatedAt).toLocaleString()
              : '—'}
          </p>
        </div>
        <div className="mt-4 border-t border-slate-200 pt-4">
          <h4 className="text-lg font-semibold text-slate-900 mb-2">Ventas</h4>
          {ventasLoading && <p className="text-slate-600 text-sm">Cargando ventas...</p>}
          {ventasError && (
            <p className="text-red-700 text-sm">{ventasError}</p>
          )}
          {!ventasLoading && !ventasError && ventas && (
            <div className="space-y-2">
              <p className="text-slate-800">
                <span className="font-semibold">Total ventas:</span>{' '}
                {ventas.count} | Monto acumulado: ${ventas.total.toFixed(2)}
              </p>
              {ventas.ventas.length === 0 ? (
                <p className="text-slate-600 text-sm">
                  No hay ventas registradas para este cliente.
                </p>
              ) : (
                <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {ventas.ventas.map((v) => (
                    <li
                      key={v.meliOrderId}
                      className="rounded-lg border border-slate-200 p-3 bg-slate-50"
                    >
                      <p className="font-semibold text-slate-900">
                        Orden {v.meliOrderId}
                      </p>
                      <p className="text-slate-700 text-sm">
                        Fecha: {new Date(v.fecha).toLocaleString()}
                      </p>
                      <p className="text-slate-700 text-sm">
                        Total: ${v.total.toFixed(2)}
                      </p>
                      {v.items?.length ? (
                        <ul className="text-slate-700 text-sm list-disc list-inside mt-1">
                          {v.items.map((i, idx) => (
                            <li key={`${v.meliOrderId}-${idx}`}>
                              {i.titulo} x{i.cantidad} (${i.precioUnitario})
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <div className="mt-4 border-t border-slate-200 pt-4">
          <h4 className="text-lg font-semibold text-slate-900 mb-2">Notas del cliente</h4>
          <textarea
            value={notaValue}
            onChange={(e) => setNotaValue(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="Escribí una nota libre..."
          />
          <div className="mt-2 flex justify-end">
            <button
              onClick={async () => {
                await onEditNota(notaValue);
              }}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 transition disabled:opacity-60"
              disabled={notaSaving}
            >
              {notaSaving ? 'Guardando...' : 'Guardar nota'}
            </button>
          </div>
        </div>
        <div className="mt-6 flex gap-2 justify-end">
          <button
            onClick={() => {
              onClose();
              onRefresh();
            }}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 transition"
          >
            Refrescar datos
          </button>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
