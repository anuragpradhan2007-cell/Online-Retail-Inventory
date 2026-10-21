-- =============================================================================
-- DBMS ENHANCEMENTS: AUDIT LOGGING & AUTOMATED PURCHASE ORDERS
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. AUDIT LOGGING TABLE & TRIGGER
-- Demonstrates: Database Triggers, Dynamic JSONB serialization, Temporal Auditing
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    record_id TEXT,
    old_data JSONB,
    new_data JSONB,
    changed_by TEXT DEFAULT 'system',
    changed_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup on table_name and timestamp
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_time ON public.audit_logs(table_name, changed_at DESC);

-- Universal Audit Trigger Function
CREATE OR REPLACE FUNCTION public.fn_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (table_name, action, record_id, new_data)
        VALUES (TG_TABLE_NAME, 'INSERT', NEW.id::text, to_jsonb(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (table_name, action, record_id, old_data, new_data)
        VALUES (TG_TABLE_NAME, 'UPDATE', NEW.id::text, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (table_name, action, record_id, old_data)
        VALUES (TG_TABLE_NAME, 'DELETE', OLD.id::text, to_jsonb(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- Attach triggers to core tables
DROP TRIGGER IF EXISTS trg_audit_products ON public.products;
CREATE TRIGGER trg_audit_products
AFTER INSERT OR UPDATE OR DELETE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_orders ON public.orders;
CREATE TRIGGER trg_audit_orders
AFTER INSERT OR UPDATE OR DELETE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_suppliers ON public.suppliers;
CREATE TRIGGER trg_audit_suppliers
AFTER INSERT OR UPDATE OR DELETE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- -----------------------------------------------------------------------------
-- 2. PURCHASE ORDERS & AUTO-REORDER TRIGGER
-- Demonstrates: Foreign Key Constraints, Transactions, Stored Procedures, Stock Propagation
-- -----------------------------------------------------------------------------

CREATE SEQUENCE IF NOT EXISTS seq_po_number START 1001;

CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number TEXT UNIQUE NOT NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    quantity_requested INT NOT NULL CHECK (quantity_requested > 0),
    cost_per_unit NUMERIC NOT NULL DEFAULT 0 CHECK (cost_per_unit >= 0),
    total_cost NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ORDERED', 'RECEIVED', 'CANCELLED')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    received_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_po_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_product ON public.purchase_orders(product_id);

-- Stored Procedure: Atomic Stock Receipt when PO is marked RECEIVED
-- Ensures ACID compliance: updates product stock and flags PO simultaneously
CREATE OR REPLACE FUNCTION public.receive_purchase_order(p_po_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_po RECORD;
BEGIN
    SELECT * INTO v_po FROM public.purchase_orders WHERE id = p_po_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase order with ID % not found', p_po_id;
    END IF;

    IF v_po.status = 'RECEIVED' THEN
        RAISE EXCEPTION 'Purchase order % is already marked as RECEIVED', v_po.po_number;
    END IF;

    -- 1. Increase current stock on product
    UPDATE public.products
    SET current_stock = current_stock + v_po.quantity_requested,
        updated_at = now()
    WHERE id = v_po.product_id;

    -- 2. Mark PO as RECEIVED
    UPDATE public.purchase_orders
    SET status = 'RECEIVED',
        received_at = now()
    WHERE id = p_po_id;

    RETURN jsonb_build_object(
        'success', true, 
        'po_number', v_po.po_number, 
        'quantity_added', v_po.quantity_requested
    );
END;
$$;

-- Trigger Function: Auto-Reorder when product stock drops below safety threshold
CREATE OR REPLACE FUNCTION public.fn_auto_reorder_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_active_po_count INT;
    v_reorder_qty INT;
    v_next_po_num TEXT;
BEGIN
    -- Check if current stock fell to or below safety threshold
    IF (NEW.current_stock <= NEW.safety_stock_threshold) AND 
       (OLD.current_stock IS NULL OR OLD.current_stock > NEW.safety_stock_threshold) THEN
        
        -- Check if an active (PENDING or ORDERED) PO already exists to avoid duplicates
        SELECT COUNT(*) INTO v_active_po_count
        FROM public.purchase_orders
        WHERE product_id = NEW.id
          AND status IN ('PENDING', 'ORDERED');

        IF v_active_po_count = 0 AND NEW.supplier_id IS NOT NULL THEN
            -- Calculate economic reorder quantity (e.g. at least 2x safety stock or minimum 20)
            v_reorder_qty := GREATEST(COALESCE(NEW.safety_stock_threshold * 2, 20), 20);
            v_next_po_num := 'PO-AUTO-' || nextval('seq_po_number');

            INSERT INTO public.purchase_orders (
                po_number,
                supplier_id,
                product_id,
                quantity_requested,
                cost_per_unit,
                total_cost,
                status,
                notes
            ) VALUES (
                v_next_po_num,
                NEW.supplier_id,
                NEW.id,
                v_reorder_qty,
                NEW.cost_price,
                (v_reorder_qty * NEW.cost_price),
                'PENDING',
                'System Auto-Generated: Stock fell below safety threshold (' || NEW.current_stock || ' <= ' || NEW.safety_stock_threshold || ')'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_reorder ON public.products;
CREATE TRIGGER trg_auto_reorder
AFTER UPDATE OF current_stock ON public.products
FOR EACH ROW EXECUTE FUNCTION public.fn_auto_reorder_trigger();
