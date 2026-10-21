import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import supplierRoutes from './routes/suppliers.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import analyticsRoutes from './routes/analytics.js';
import purchaseOrderRoutes from './routes/purchaseOrders.js';
import auditLogRoutes from './routes/auditLogs.js';
import { supabase } from './config/supabase.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:5173',
  'https://online-retail-inventory.vercel.app',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({ 
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }, 
  credentials: true 
}));
app.use(express.json());

app.get('/health', (req, res) => res.status(200).json({ status: 'ok', uptime: process.uptime() }));

// Mount API Routes
app.use('/api/suppliers', supplierRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/audit-logs', auditLogRoutes);

app.listen(port, () => console.log(`Inventory backend running on http://localhost:${port}`));