import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase.js';

const router = Router();

// GET all products (including supplier details)
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

// POST a new product
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { sku, title, category, cost_price, selling_price, current_stock, safety_stock_threshold } = req.body;
  const supplier_id = req.body.supplier_id || '11111111-1111-1111-1111-111111111111';

  const { data, error } = await supabase.from('products').insert([
    { supplier_id, sku, title, category, cost_price, selling_price, current_stock, safety_stock_threshold }
  ]).select().single();

  if (error) { res.status(400).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// PATCH update product (e.g., price change)
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
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

// DELETE a product
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    // Delete any dependent records in order_items and purchase_orders first to avoid FK constraint errors
    await supabase.from('order_items').delete().eq('product_id', id);
    try {
      await supabase.from('purchase_orders').delete().eq('product_id', id);
    } catch {
      // Table may not exist in pure main branch, ignore
    }

    const { error } = await supabase.from('products').delete().eq('id', id);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products/:id/restock
router.post('/:id/restock', async (req: Request, res: Response): Promise<void> => {
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
