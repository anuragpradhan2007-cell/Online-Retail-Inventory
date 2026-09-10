import { Router } from 'express';
import { supabase } from '../config/supabase.js';
const router = Router();
// GET all orders with their line items
router.get('/', async (req, res) => {
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
    if (error) {
        res.status(500).json({ error: error.message });
        return;
    }
    res.json(data);
});
// POST a new order (Atomic Checkout)
router.post('/', async (req, res) => {
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
// PATCH update order status (e.g., 'DISPATCHED' or 'DELIVERED')
router.patch('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { order_status } = req.body;
    const { data, error } = await supabase
        .from('orders')
        .update({
        order_status,
        delivered_at: order_status === 'DELIVERED' ? new Date().toISOString() : null
    })
        .eq('id', id)
        .select().single();
    if (error) {
        res.status(400).json({ error: error.message });
        return;
    }
    res.json(data);
});
export default router;
