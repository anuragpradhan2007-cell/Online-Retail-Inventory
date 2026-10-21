import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase.js';

const router = Router();

// GET all purchase orders with supplier and product details
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      suppliers (id, name, contact_email, phone),
      products (id, sku, title, current_stock, safety_stock_threshold)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

// POST a new purchase order manually
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { supplier_id, product_id, quantity_requested, cost_per_unit, notes } = req.body;

  if (!product_id || !quantity_requested || quantity_requested <= 0) {
    res.status(400).json({ error: 'Valid product and positive quantity are required.' });
    return;
  }

  const qty = Number(quantity_requested);
  const cost = Number(cost_per_unit || 0);
  const total = qty * cost;
  const po_number = `PO-${Date.now().toString().slice(-6)}`;

  const { data, error } = await supabase
    .from('purchase_orders')
    .insert([
      {
        po_number,
        supplier_id: supplier_id || null,
        product_id,
        quantity_requested: qty,
        cost_per_unit: cost,
        total_cost: total,
        status: 'PENDING',
        notes: notes || 'Manual Purchase Order'
      }
    ])
    .select(`
      *,
      suppliers (id, name),
      products (id, sku, title)
    `)
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.status(201).json(data);
});

// PATCH update purchase order status (e.g., mark as 'ORDERED' or 'CANCELLED')
router.patch('/:id/status', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status, notes } = req.body;

  const validStatuses = ['PENDING', 'ORDERED', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: `Invalid status transition. Allowed: ${validStatuses.join(', ')}` });
    return;
  }

  const updates: Record<string, any> = { status };
  if (notes !== undefined) updates.notes = notes;

  const { data, error } = await supabase
    .from('purchase_orders')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.json(data);
});

// POST receive stock for a purchase order (Atomic transaction)
// Tries the Postgres stored procedure `receive_purchase_order` first, with graceful fallback
router.post('/:id/receive', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  // Attempt using the PostgreSQL RPC procedure
  const { data: rpcData, error: rpcError } = await supabase.rpc('receive_purchase_order', {
    p_po_id: id
  });

  if (!rpcError) {
    res.json({ message: 'Stock received successfully via database transaction', details: rpcData });
    return;
  }

  // Graceful fallback if RPC function is not yet created in Supabase
  console.warn('RPC receive_purchase_order failed or not found, using sequential fallback:', rpcError.message);

  const { data: po, error: fetchErr } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !po) {
    res.status(404).json({ error: 'Purchase order not found' });
    return;
  }

  if (po.status === 'RECEIVED') {
    res.status(400).json({ error: 'This purchase order has already been received' });
    return;
  }

  // Fetch current product stock
  const { data: product, error: prodErr } = await supabase
    .from('products')
    .select('current_stock')
    .eq('id', po.product_id)
    .single();

  if (prodErr || !product) {
    res.status(404).json({ error: 'Associated product not found' });
    return;
  }

  // Update product stock
  await supabase
    .from('products')
    .update({ 
      current_stock: (product.current_stock || 0) + po.quantity_requested,
      updated_at: new Date().toISOString()
    })
    .eq('id', po.product_id);

  // Update PO status
  const { data: updatedPo, error: updateErr } = await supabase
    .from('purchase_orders')
    .update({ 
      status: 'RECEIVED',
      received_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (updateErr) {
    res.status(500).json({ error: updateErr.message });
    return;
  }

  res.json({ message: 'Stock received and inventory updated successfully', purchase_order: updatedPo });
});

export default router;
