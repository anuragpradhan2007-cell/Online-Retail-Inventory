-- =============================================================================
-- SEED SCRIPT: OCTOBER 11 - OCTOBER 24 ORDERS, PRODUCTS, SUPPLIERS & AUTH USER
-- =============================================================================
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. AUTH USER: anuragpradhan2007@gmail.com / demoACC
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    v_user_id UUID := gen_random_uuid();
    v_encrypted_pw TEXT := crypt('demoACC', gen_salt('bf'));
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'anuragpradhan2007@gmail.com') THEN
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            recovery_sent_at,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_user_id,
            'authenticated',
            'authenticated',
            'anuragpradhan2007@gmail.com',
            v_encrypted_pw,
            now(),
            now(),
            now(),
            '{"provider":"email","providers":["email"]}',
            '{"name":"Anurag Pradhan"}',
            now(),
            now(),
            '',
            '',
            '',
            ''
        );

        -- Add email provider identity so Supabase auth signs in seamlessly
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            v_user_id,
            v_user_id,
            format('{"sub":"%s","email":"%s"}', v_user_id::text, 'anuragpradhan2007@gmail.com')::jsonb,
            'email',
            v_user_id::text,
            now(),
            now(),
            now()
        );
    ELSE
        -- Update password and ensure email is confirmed
        UPDATE auth.users
        SET encrypted_password = v_encrypted_pw,
            email_confirmed_at = COALESCE(email_confirmed_at, now())
        WHERE email = 'anuragpradhan2007@gmail.com';
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- If auth schema is strictly managed by Supabase Cloud, continue to data insertion
    RAISE NOTICE 'Auth user insertion notice: %', SQLERRM;
END $$;

-- -----------------------------------------------------------------------------
-- 2. SUPPLIERS
-- -----------------------------------------------------------------------------
INSERT INTO public.suppliers (id, name, contact_email, phone, average_lead_time_days)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Apex Electronics Hub', 'apex.supplies@gmail.com', '+91 98765 43210', 5),
    ('a0000000-0000-0000-0000-000000000002', 'NexaLogix Components', 'orders@nexalogix.in', '+91 98112 34567', 7),
    ('a0000000-0000-0000-0000-000000000003', 'ZenVogue Lifestyle Goods', 'contact@zenvogue.com', '+91 99234 56789', 4)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    contact_email = EXCLUDED.contact_email,
    phone = EXCLUDED.phone,
    average_lead_time_days = EXCLUDED.average_lead_time_days;

-- -----------------------------------------------------------------------------
-- 3. PRODUCTS
-- -----------------------------------------------------------------------------
INSERT INTO public.products (id, supplier_id, sku, title, category, cost_price, selling_price, current_stock, safety_stock_threshold)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'KB-MECH-01', 'RGB Mechanical Gaming Keyboard', 'Peripherals', 2200, 3499, 45, 10),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'MS-ERGO-02', 'Ergonomic Wireless Vertical Mouse', 'Peripherals', 950, 1799, 32, 8),
    ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'DK-TYPEC-03', '7-in-1 Type-C Aluminum Hub', 'Accessories', 1600, 2899, 20, 5),
    ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'HP-ANC-04', 'Noise Cancelling Wireless Headphones', 'Audio', 3100, 4999, 25, 6),
    ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'CM-4K-05', 'Ultra-HD 4K Streaming Webcam', 'Peripherals', 1850, 3199, 14, 5),
    ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000003', 'MT-LEATH-06', 'Dual-Tone Leather Desk Mat', 'Office', 400, 899, 55, 15),
    ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000003', 'ST-MAG-07', 'Magnetic Foldable Phone Stand', 'Accessories', 650, 1299, 40, 10),
    ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000003', 'CB-FAST-08', 'Braided 100W Fast-Charge Cable', 'Cables', 180, 499, 85, 20)
ON CONFLICT (id) DO UPDATE SET
    supplier_id = EXCLUDED.supplier_id,
    sku = EXCLUDED.sku,
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    cost_price = EXCLUDED.cost_price,
    selling_price = EXCLUDED.selling_price,
    current_stock = EXCLUDED.current_stock,
    safety_stock_threshold = EXCLUDED.safety_stock_threshold;

-- -----------------------------------------------------------------------------
-- 4. ORDERS (11 Oct 2026 to 24 Oct 2026)
-- -----------------------------------------------------------------------------
INSERT INTO public.orders (id, customer_name, customer_email, order_status, ordered_at, delivered_at)
VALUES
    -- 11 Oct (Delivered)
    ('c0000000-0000-0000-0000-000000000001', 'Rahul Sharma', 'rahul.s@outlook.com', 'DELIVERED', '2026-10-11 10:15:00+05:30', '2026-10-15 14:00:00+05:30'),
    -- 12 Oct (Delivered)
    ('c0000000-0000-0000-0000-000000000002', 'Priya Patel', 'priya.p@gmail.com', 'DELIVERED', '2026-10-12 11:30:00+05:30', '2026-10-16 16:45:00+05:30'),
    -- 13 Oct (Delivered)
    ('c0000000-0000-0000-0000-000000000003', 'Amit Verma', 'amit.v@yahoo.com', 'DELIVERED', '2026-10-13 14:20:00+05:30', '2026-10-17 12:30:00+05:30'),
    -- 14 Oct (Delivered)
    ('c0000000-0000-0000-0000-000000000004', 'Sneha Kulkarni', 'sneha.k@hotmail.com', 'DELIVERED', '2026-10-14 09:45:00+05:30', '2026-10-18 15:10:00+05:30'),
    -- 15 Oct (Cancelled Order - demonstrates exclusion from Total Sales & Stock Gain)
    ('c0000000-0000-0000-0000-000000000005', 'Vikram Malhotra', 'vikram.m@gmail.com', 'CANCELLED', '2026-10-15 16:00:00+05:30', NULL),
    -- 16 Oct (Delivered)
    ('c0000000-0000-0000-0000-000000000006', 'Rohan Gupta', 'rohan.g@gmail.com', 'DELIVERED', '2026-10-16 13:10:00+05:30', '2026-10-20 17:00:00+05:30'),
    -- 17 Oct (Delivered)
    ('c0000000-0000-0000-0000-000000000007', 'Ananya Roy', 'ananya.roy@live.com', 'DELIVERED', '2026-10-17 15:40:00+05:30', '2026-10-21 11:20:00+05:30'),
    -- 18 Oct (Delivered)
    ('c0000000-0000-0000-0000-000000000008', 'Karthik Subramanian', 'karthik.s@gmail.com', 'DELIVERED', '2026-10-18 17:25:00+05:30', '2026-10-22 13:50:00+05:30'),
    -- 19 Oct (Monday of this week - Dispatched)
    ('c0000000-0000-0000-0000-000000000009', 'Deepak Nair', 'deepak.nair@corp.in', 'DISPATCHED', '2026-10-19 10:00:00+05:30', NULL),
    -- 20 Oct (Tuesday of this week - Dispatched)
    ('c0000000-0000-0000-0000-000000000010', 'Meera Joshi', 'meera.j@gmail.com', 'DISPATCHED', '2026-10-20 12:15:00+05:30', NULL),
    -- 21 Oct (Wednesday of this week - Processing)
    ('c0000000-0000-0000-0000-000000000011', 'Siddharth Jain', 'sid.jain@tech.com', 'PROCESSING', '2026-10-21 14:50:00+05:30', NULL),
    -- 22 Oct (Thursday of this week - Processing)
    ('c0000000-0000-0000-0000-000000000012', 'Pooja Hegde', 'pooja.h@yahoo.com', 'PROCESSING', '2026-10-22 16:30:00+05:30', NULL),
    -- 23 Oct (Friday of this week - Pending)
    ('c0000000-0000-0000-0000-000000000013', 'Arjun Kapoor', 'arjun.k@gmail.com', 'PENDING', '2026-10-23 11:20:00+05:30', NULL),
    -- 24 Oct (Today - Pending / Dispatch Queue)
    ('c0000000-0000-0000-0000-000000000014', 'Ritu Saxena', 'ritu.saxena@gmail.com', 'PENDING', '2026-10-24 09:30:00+05:30', NULL),
    ('c0000000-0000-0000-0000-000000000015', 'Naveen Choudhary', 'naveen.c@outlook.com', 'PROCESSING', '2026-10-24 10:15:00+05:30', NULL)
ON CONFLICT (id) DO UPDATE SET
    customer_name = EXCLUDED.customer_name,
    customer_email = EXCLUDED.customer_email,
    order_status = EXCLUDED.order_status,
    ordered_at = EXCLUDED.ordered_at,
    delivered_at = EXCLUDED.delivered_at;

-- -----------------------------------------------------------------------------
-- 5. ORDER ITEMS (Line items with correct product linkages & subtotals)
-- -----------------------------------------------------------------------------
INSERT INTO public.order_items (id, order_id, product_id, quantity, unit_price, subtotal)
VALUES
    -- Items for Order 1 (11 Oct): Keyboard (1) + Desk Mat (1) -> Total: 4,398
    ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 1, 3499, 3499),
    ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000006', 1, 899, 899),

    -- Items for Order 2 (12 Oct): Headphones (1) -> Total: 4,999
    ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000004', 1, 4999, 4999),

    -- Items for Order 3 (13 Oct): Mouse (2) + USB Hub (1) -> Total: 6,497
    ('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 2, 1799, 3598),
    ('d0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 1, 2899, 2899),

    -- Items for Order 4 (14 Oct): Webcam 4K (1) + Phone Stand (1) -> Total: 4,498
    ('d0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000005', 1, 3199, 3199),
    ('d0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000007', 1, 1299, 1299),

    -- Items for Order 5 (15 Oct - CANCELLED): Keyboard (1) -> Total: 3,499 (Excluded from dashboard revenue!)
    ('d0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 1, 3499, 3499),

    -- Items for Order 6 (16 Oct): Fast-Charge Cable (3) -> Total: 1,497
    ('d0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000008', 3, 499, 1497),

    -- Items for Order 7 (17 Oct): Vertical Mouse (1) + Desk Mat (1) -> Total: 2,698
    ('d0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000002', 1, 1799, 1799),
    ('d0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000006', 1, 899, 899),

    -- Items for Order 8 (18 Oct): Headphones (1) + Cable (2) -> Total: 5,997
    ('d0000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000004', 1, 4999, 4999),
    ('d0000000-0000-0000-0000-000000000013', 'c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000008', 2, 499, 998),

    -- Items for Order 9 (19 Oct - Monday): Type-C Hub (2) -> Total: 5,798
    ('d0000000-0000-0000-0000-000000000014', 'c0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000003', 2, 2899, 5798),

    -- Items for Order 10 (20 Oct - Tuesday): Keyboard (1) + Mouse (1) -> Total: 5,298
    ('d0000000-0000-0000-0000-000000000015', 'c0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000001', 1, 3499, 3499),
    ('d0000000-0000-0000-0000-000000000016', 'c0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000002', 1, 1799, 1799),

    -- Items for Order 11 (21 Oct - Wednesday): Webcam 4K (1) -> Total: 3,199
    ('d0000000-0000-0000-0000-000000000017', 'c0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000005', 1, 3199, 3199),

    -- Items for Order 12 (22 Oct - Thursday): Phone Stand (2) + Desk Mat (1) -> Total: 3,497
    ('d0000000-0000-0000-0000-000000000018', 'c0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000007', 2, 1299, 2598),
    ('d0000000-0000-0000-0000-000000000019', 'c0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000006', 1, 899, 899),

    -- Items for Order 13 (23 Oct - Friday): Headphones (1) + Fast Cable (1) -> Total: 5,498
    ('d0000000-0000-0000-0000-000000000020', 'c0000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000004', 1, 4999, 4999),
    ('d0000000-0000-0000-0000-000000000021', 'c0000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000008', 1, 499, 499),

    -- Items for Order 14 (24 Oct - Saturday / Today): Keyboard (1) -> Total: 3,499
    ('d0000000-0000-0000-0000-000000000022', 'c0000000-0000-0000-0000-000000000014', 'b0000000-0000-0000-0000-000000000001', 1, 3499, 3499),

    -- Items for Order 15 (24 Oct - Saturday / Today): Mouse (1) + Desk Mat (1) -> Total: 2,698
    ('d0000000-0000-0000-0000-000000000023', 'c0000000-0000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000002', 1, 1799, 1799),
    ('d0000000-0000-0000-0000-000000000024', 'c0000000-0000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000006', 1, 899, 899)
ON CONFLICT (id) DO UPDATE SET
    order_id = EXCLUDED.order_id,
    product_id = EXCLUDED.product_id,
    quantity = EXCLUDED.quantity,
    unit_price = EXCLUDED.unit_price,
    subtotal = EXCLUDED.subtotal;
