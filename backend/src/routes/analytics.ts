import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase.js';

const router = Router();

// GET /api/analytics/predictive
// Returns inventory runway, daily run rates, and stock status
router.get('/predictive', async (req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabase
    .from('predictive_inventory_view')
    .select('*')
    .order('days_until_stockout', { ascending: true }); // Critical items first

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// POST /api/analytics/reset
// Danger: Clears all data from the database
router.post('/reset', async (req: Request, res: Response): Promise<void> => {
  try {
    // Delete in order to respect foreign key constraints
    await supabase.from('order_items').delete().not('id', 'is', null);
    await supabase.from('orders').delete().not('id', 'is', null);
    await supabase.from('products').delete().not('id', 'is', null);
    await supabase.from('suppliers').delete().not('id', 'is', null);
    
    res.status(200).json({ message: 'Database reset successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;