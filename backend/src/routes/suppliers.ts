import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// GET all suppliers - Read-only access
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabase.from('suppliers').select('*').order('created_at', { ascending: false });
  
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// GET all products belonging to a supplier
router.get('/:id/products', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('products')
    .select('id, sku, title, current_stock, selling_price')
    .eq('supplier_id', id);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data || []);
});

// POST a new supplier - Restricted to admin and manager
router.post('/', requireAuth, requireRole(['admin', 'manager']), async (req: Request, res: Response): Promise<void> => {
  const { name, contact_email, phone, average_lead_time_days } = req.body;
  
  const { data, error } = await supabase.from('suppliers').insert([
    { name, contact_email, phone, average_lead_time_days }
  ]).select().single();

  if (error) { res.status(400).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// PATCH update supplier details - Restricted to admin and manager
router.patch('/:id', requireAuth, requireRole(['admin', 'manager']), async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const updates = req.body;

  const { data, error } = await supabase
    .from('suppliers')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select().single();

  if (error) { res.status(400).json({ error: error.message }); return; }
  res.json(data);
});

// DELETE a supplier - Strictly restricted to admin only (Question 2b requirement)
router.delete('/:id', requireAuth, requireRole(['admin']), async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    // 1. Fetch all products belonging to this supplier
    const { data: prods } = await supabase.from('products').select('id').eq('supplier_id', id);
    const productIds = (prods || []).map(p => p.id);

    // 2. Cascade delete order_items and purchase_orders for those products
    if (productIds.length > 0) {
      await supabase.from('order_items').delete().in('product_id', productIds);
      try {
        await supabase.from('purchase_orders').delete().in('product_id', productIds);
      } catch { /* purchase_orders optional */ }
      await supabase.from('products').delete().eq('supplier_id', id);
    }

    // 3. Delete supplier
    const { data, error } = await supabase.from('suppliers').delete().eq('id', id).select();
    if (error) { res.status(400).json({ error: error.message }); return; }

    res.json({ message: 'Supplier and associated products deleted successfully', data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
