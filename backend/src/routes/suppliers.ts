import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase.js';

const router = Router();

// GET all suppliers
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

// POST a new supplier
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { name, contact_email, phone, average_lead_time_days } = req.body;
  
  const { data, error } = await supabase.from('suppliers').insert([
    { name, contact_email, phone, average_lead_time_days }
  ]).select().single();

  if (error) { res.status(400).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// PATCH update supplier details
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
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

// DELETE supplier (cascades to related products and order items)
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    // 1. Find all products associated with this supplier
    const { data: prods } = await supabase
      .from('products')
      .select('id')
      .eq('supplier_id', id);

    const productIds = (prods || []).map(p => p.id);

    // 2. Delete dependent records (order_items, purchase_orders) for those products
    if (productIds.length > 0) {
      await supabase.from('order_items').delete().in('product_id', productIds);
      try {
        await supabase.from('purchase_orders').delete().in('product_id', productIds);
      } catch {
        // Ignore if table not present
      }

      // 3. Delete the products
      await supabase.from('products').delete().in('id', productIds);
    }

    // 4. Delete any direct purchase orders for this supplier
    try {
      await supabase.from('purchase_orders').delete().eq('supplier_id', id);
    } catch {
      // Ignore if table not present
    }

    // 5. Delete the supplier record
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(200).json({ 
      message: 'Supplier and all associated products deleted successfully',
      deletedProductCount: productIds.length 
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
