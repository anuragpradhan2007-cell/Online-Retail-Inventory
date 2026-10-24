-- =============================================================================
-- SUPPLIER CASCADE DELETE TRIGGER (PostgreSQL / Supabase)
-- Automatically deletes all products and line items belonging to a supplier
-- when that supplier is deleted.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_cascade_delete_supplier_products()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Remove order items tied to products of the deleted supplier
    DELETE FROM public.order_items 
    WHERE product_id IN (SELECT id FROM public.products WHERE supplier_id = OLD.id);

    -- 2. Remove purchase orders tied to products of the deleted supplier (if table exists)
    BEGIN
        DELETE FROM public.purchase_orders WHERE supplier_id = OLD.id OR product_id IN (SELECT id FROM public.products WHERE supplier_id = OLD.id);
    EXCEPTION WHEN undefined_table THEN
        -- table does not exist, continue
    END;

    -- 3. Delete all products belonging to this supplier
    DELETE FROM public.products 
    WHERE supplier_id = OLD.id;

    RETURN OLD;
END;
$$;

-- Attach Trigger to suppliers table
DROP TRIGGER IF EXISTS trg_cascade_delete_supplier_products ON public.suppliers;
CREATE TRIGGER trg_cascade_delete_supplier_products
BEFORE DELETE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.fn_cascade_delete_supplier_products();
