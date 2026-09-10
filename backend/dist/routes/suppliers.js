import { Router } from 'express';
import { supabase } from '../config/supabase.js';
const router = Router();
// GET all suppliers
router.get('/', async (req, res) => {
    const { data, error } = await supabase.from('suppliers').select('*').order('created_at', { ascending: false });
    if (error) {
        res.status(500).json({ error: error.message });
        return;
    }
    res.json(data);
});
// POST a new supplier
router.post('/', async (req, res) => {
    const { name, contact_email, phone, average_lead_time_days } = req.body;
    const { data, error } = await supabase.from('suppliers').insert([
        { name, contact_email, phone, average_lead_time_days }
    ]).select().single();
    if (error) {
        res.status(400).json({ error: error.message });
        return;
    }
    res.status(201).json(data);
});
// PATCH update supplier details
router.patch('/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const { data, error } = await supabase
        .from('suppliers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select().single();
    if (error) {
        res.status(400).json({ error: error.message });
        return;
    }
    res.json(data);
});
export default router;
