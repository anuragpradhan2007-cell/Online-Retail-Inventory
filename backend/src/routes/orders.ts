import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase.js';

const router = Router();

// GET all orders with their line items
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        id, quantity, unit_price, subtotal,
        products (sku, title)
      )
    `)
    .order('ordered_at', { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// POST a new order (Atomic Checkout)
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { customer_name, customer_email, items } = req.body;

  /* Expected items format:
     [{ product_id: "uuid-1", quantity: 2, unit_price: 15.50 }] 
  */

  if (!items || items.length === 0) {
    res.status(400).json({ error: 'Order must contain at least one item.' });
    return;
  }

  // Call the Postgres RPC function
  const { data: orderId, error } = await supabase.rpc('place_order_transaction', {
    p_customer_name: customer_name,
    p_customer_email: customer_email,
    p_items: items
  });

  if (error) {
    // If the SQL RAISE EXCEPTION is triggered (e.g., insufficient stock), it catches here
    res.status(400).json({ error: error.message });
    return;
  }

  res.status(201).json({ message: 'Order placed successfully', order_id: orderId });
});

// PATCH update order status (e.g., 'DISPATCHED', 'DELIVERED', 'CANCELLED')
// If status is changed to CANCELLED, restores item stocks back to products!
router.patch('/:id/status', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { order_status } = req.body;

  try {
    // 1. Fetch current order with its items to check status transition
    const { data: existingOrder, error: fetchErr } = await supabase
      .from('orders')
      .select(`
        id, order_status,
        order_items (
          id, product_id, quantity
        )
      `)
      .eq('id', id)
      .single();

    if (fetchErr || !existingOrder) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const prevStatus = existingOrder.order_status;
    const items = existingOrder.order_items || [];

    // 2. If cancelling an active order: RESTORE STOCK
    if (prevStatus !== 'CANCELLED' && order_status === 'CANCELLED') {
      for (const item of items) {
        if (item.product_id && item.quantity > 0) {
          const { data: prod } = await supabase
            .from('products')
            .select('current_stock')
            .eq('id', item.product_id)
            .single();

          if (prod) {
            await supabase
              .from('products')
              .update({
                current_stock: (prod.current_stock || 0) + item.quantity,
                updated_at: new Date().toISOString()
              })
              .eq('id', item.product_id);
          }
        }
      }
    }

    // 3. If un-cancelling a previously cancelled order: DEDUCT STOCK
    if (prevStatus === 'CANCELLED' && order_status !== 'CANCELLED') {
      for (const item of items) {
        if (item.product_id && item.quantity > 0) {
          const { data: prod } = await supabase
            .from('products')
            .select('current_stock')
            .eq('id', item.product_id)
            .single();

          if (prod) {
            await supabase
              .from('products')
              .update({
                current_stock: Math.max(0, (prod.current_stock || 0) - item.quantity),
                updated_at: new Date().toISOString()
              })
              .eq('id', item.product_id);
          }
        }
      }
    }

    // 4. Update the order
    const { data, error } = await supabase
      .from('orders')
      .update({ 
        order_status,
        delivered_at: order_status === 'DELIVERED' ? new Date().toISOString() : null
      })
      .eq('id', id)
      .select().single();

    if (error) { res.status(400).json({ error: error.message }); return; }
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
