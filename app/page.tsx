import { headers } from 'next/headers';
import ClientesTable from './components/ClientesTable';

export const dynamic = 'force-dynamic';

async function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, '');
  }
  const hdrs = await headers();
  const host = hdrs.get('host');
  if (host) {
    const protocol = host.startsWith('localhost') ? 'http' : 'https';
    return `${protocol}://${host}`;
  }
  return '';
}

async function getClientes() {
  try {
    const base = await getBaseUrl();
    const res = await fetch(`${base}/api/clientes`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch (error) {
    console.error('No se pudo cargar clientes', error);
    return [];
  }
}

async function getMeliStatus() {
  try {
    const base = await getBaseUrl();
    const res = await fetch(`${base}/api/meli/status`, { cache: 'no-store' });
    if (!res.ok) return { connected: false };
    return res.json();
  } catch (error) {
    console.error('No se pudo verificar estado de token', error);
    return { connected: false };
  }
}

function buildAuthUrl() {
  const clientId = process.env.MELI_CLIENT_ID;
  const redirectUri = process.env.MELI_REDIRECT_URI;
  if (!clientId || !redirectUri) return null;
  const encodedRedirect = encodeURIComponent(redirectUri);
  return `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodedRedirect}&state=web`;
}

export default async function Home() {
  const clientes = await getClientes();
  const status = await getMeliStatus();
  const authUrl = buildAuthUrl();

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-slate-900">
      <main className="max-w-5xl mx-auto px-6 py-10">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Mercado Libre
            </p>
            <h1 className="text-3xl font-bold text-slate-900">
              Clientes y ventas
            </h1>
            <p className="text-base text-slate-700">
              Conectá tu cuenta y refrescá los clientes obtenidos de las órdenes.
            </p>
          </div>
          {status?.connected ? (
            <div className="inline-flex items-center justify-center rounded-full bg-green-100 px-5 py-3 text-base font-semibold text-green-800 border border-green-200">
              Conectado a Mercado Libre
            </div>
          ) : authUrl ? (
            <a
              href={authUrl}
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-3 text-base font-semibold text-white shadow hover:bg-blue-700 transition"
            >
              Conectar con Mercado Libre
            </a>
          ) : (
            <div className="text-sm text-red-600 bg-white border border-red-200 rounded-md px-3 py-2">
              Configurá <code>MELI_CLIENT_ID</code> y <code>MELI_REDIRECT_URI</code>.
            </div>
          )}
        </header>

        <ClientesTable initialClientes={clientes} />
      </main>
    </div>
  );
}
