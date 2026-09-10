import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import supplierRoutes from './routes/suppliers.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import analyticsRoutes from './routes/analytics.js'; // <-- Add import
dotenv.config();
const app = express();
const port = process.env.PORT || 5000;
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.get('/health', (req, res) => res.status(200).json({ status: 'ok', uptime: process.uptime() }));
// Mount API Routes
app.use('/api/suppliers', supplierRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/analytics', analyticsRoutes); // <-- Mount analytics
app.listen(port, () => console.log(`Inventory backend running on http://localhost:${port}`));
