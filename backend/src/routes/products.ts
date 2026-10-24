import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// GET all products (including supplier details) - Public / read-only for storefront
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      suppliers (name, average_lead_time_days)
    `)
    .order('created_at', { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// POST a new product - Restricted to admin and manager
router.post('/', requireAuth, requireRole(['admin', 'manager']), async (req: Request, res: Response): Promise<void> => {
  const { sku, title, category, cost_price, selling_price, current_stock, safety_stock_threshold } = req.body;
  const supplier_id = req.body.supplier_id || '11111111-1111-1111-1111-111111111111';

  const { data, error } = await supabase.from('products').insert([
    { supplier_id, sku, title, category, cost_price, selling_price, current_stock, safety_stock_threshold }
  ]).select().single();

  if (error) { res.status(400).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// PATCH update product (e.g., price change) - Restricted to admin and manager
router.patch('/:id', requireAuth, requireRole(['admin', 'manager']), async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const updates = req.body;

  const { data, error } = await supabase
    .from('products')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select().single();

  if (error) { res.status(400).json({ error: error.message }); return; }
  res.json(data);
});

// DELETE a product - Strictly restricted to admin only (Question 2b requirement)
router.delete('/:id', requireAuth, requireRole(['admin']), async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    // Clean up dependent foreign key records before product deletion
    await supabase.from('order_items').delete().eq('product_id', id);
    try {
      await supabase.from('purchase_orders').delete().eq('product_id', id);
    } catch { /* purchase_orders optional */ }

    const { data, error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .select();

    if (error) { res.status(400).json({ error: error.message }); return; }
    res.json({ message: 'Product deleted successfully', data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products/:id/restock - Restricted to admin and manager
router.post('/:id/restock', requireAuth, requireRole(['admin', 'manager']), async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { quantity, notes } = req.body;

  if (!quantity || quantity <= 0) {
    res.status(400).json({ error: 'Quantity must be greater than 0' });
    return;
  }

  const { error } = await supabase.rpc('restock_product', {
    p_product_id: id,
    p_quantity: quantity,
    p_notes: notes || 'Manual warehouse restock'
  });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(200).json({ message: 'Stock updated and logged successfully' });
});

export default router;
