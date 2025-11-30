import { Schema, Document, Model, models, model, Types } from 'mongoose';

export interface Direccion {
  calle: string;
  numero: string;
  ciudad: string;
  provincia: string;
  cp: string;
  textoCompleto: string;
}

export interface ClienteDocument extends Document {
  meliUserId: number;
  nombre: string;
  alias?: string;
  telefono: string | null;
  nota?: string;
  direccion: Direccion;
  createdAt: Date;
  updatedAt: Date;
}

const ClienteSchema = new Schema<ClienteDocument>(
  {
    meliUserId: { type: Number, required: true, unique: true, index: true },
    nombre: { type: String, required: true },
    alias: { type: String, default: '' },
    telefono: { type: String, default: null },
    nota: { type: String, default: '' },
    direccion: {
      calle: { type: String, default: '' },
      numero: { type: String, default: '' },
      ciudad: { type: String, default: '' },
      provincia: { type: String, default: '' },
      cp: { type: String, default: '' },
      textoCompleto: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

export const Cliente: Model<ClienteDocument> =
  models.Cliente || model<ClienteDocument>('Cliente', ClienteSchema);

export interface VentaItem {
  itemId: number;
  titulo: string;
  sku: string | null;
  cantidad: number;
  precioUnitario: number;
}

export interface VentaDocument extends Document {
  meliOrderId: number;
  cliente: Types.ObjectId;
  fecha: Date;
  total: number;
  items: VentaItem[];
  createdAt: Date;
  updatedAt: Date;
}

const VentaItemSchema = new Schema<VentaItem>(
  {
    itemId: { type: Number, required: true },
    titulo: { type: String, required: true },
    sku: { type: String, default: null },
    cantidad: { type: Number, required: true },
    precioUnitario: { type: Number, required: true },
  },
  { _id: false }
);

const VentaSchema = new Schema<VentaDocument>(
  {
    meliOrderId: { type: Number, required: true, unique: true, index: true },
    cliente: { type: Schema.Types.ObjectId, ref: 'Cliente', required: true },
    fecha: { type: Date, required: true },
    total: { type: Number, required: true },
    items: { type: [VentaItemSchema], default: [] },
  },
  { timestamps: true }
);

export const Venta: Model<VentaDocument> =
  models.Venta || model<VentaDocument>('Venta', VentaSchema);
