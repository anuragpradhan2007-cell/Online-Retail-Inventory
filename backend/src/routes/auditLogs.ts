import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase.js';

const router = Router();

// GET all audit logs with optional filters and pagination
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { table, action, limit = 100 } = req.query;

  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('changed_at', { ascending: false })
    .limit(Number(limit));

  if (table) {
    query = query.eq('table_name', String(table));
  }

  if (action) {
    query = query.eq('action', String(action).toUpperCase());
  }

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data || []);
});

export default router;
