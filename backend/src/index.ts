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
const instanceId = process.env.INSTANCE_ID || 'instance-default';

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

// Load balancing identification middleware: tags every response with the backend instance ID
app.use((req, res, next) => {
  res.setHeader('X-Served-By', instanceId);
  next();
});

app.get('/health', (req, res) => res.status(200).json({ 
  status: 'ok', 
  instance: instanceId, 
  uptime: process.uptime() 
}));

// Mount API Routes
app.use('/api/suppliers', supplierRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/audit-logs', auditLogRoutes);

app.listen(port, () => console.log(`Inventory backend [${instanceId}] running on http://localhost:${port}`));
