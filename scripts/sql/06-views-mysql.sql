-- ============================================================
-- Script 06: Views (MySQL)
-- Confera Event Management System
-- ============================================================

USE confera_event_management;

DROP VIEW IF EXISTS vw_event_booking_details;
CREATE VIEW vw_event_booking_details AS
SELECT
    eb.event_booking_id,
    eb.booking_reference,
    eb.event_date,
    eb.start_time,
    eb.end_time,
    eb.booking_status,
    eb.hall_base_price,
    eb.package_price,
    eb.discount_amount,
    c.client_id,
    c.full_name AS client_name,
    c.organization_name,
    e.event_id,
    e.title AS event_title,
    e.event_type,
    e.participant_count,
    eh.event_hall_id,
    eh.name AS hall_name,
    eh.status AS hall_status,
    sp.service_package_id,
    sp.name AS package_name,
    u.user_id AS created_by_user_id,
    u.full_name AS created_by_name
FROM event_bookings eb
INNER JOIN clients c ON eb.client_id = c.client_id
INNER JOIN events e ON eb.event_id = e.event_id
INNER JOIN event_halls eh ON eb.event_hall_id = eh.event_hall_id
LEFT JOIN service_packages sp ON eb.service_package_id = sp.service_package_id
INNER JOIN users u ON eb.created_by_user_id = u.user_id;

DROP VIEW IF EXISTS vw_invoice_details;
CREATE VIEW vw_invoice_details AS
SELECT
    i.invoice_id,
    i.invoice_number,
    i.invoice_date,
    i.hall_amount,
    i.package_amount,
    i.services_amount,
    i.equipment_amount,
    i.discount_amount,
    i.subtotal,
    i.tax_amount,
    i.total_amount,
    i.paid_amount,
    i.invoice_status,
    eb.booking_reference,
    eb.event_date,
    e.title AS event_title,
    c.full_name AS client_name,
    eh.name AS hall_name,
    IFNULL((
        SELECT SUM(p.amount)
        FROM payments p
        WHERE p.invoice_id = i.invoice_id
          AND p.status = 'Completed'
    ), 0.00) AS total_paid_from_payments
FROM invoices i
INNER JOIN event_bookings eb ON i.event_booking_id = eb.event_booking_id
INNER JOIN events e ON eb.event_id = e.event_id
INNER JOIN clients c ON eb.client_id = c.client_id
INNER JOIN event_halls eh ON eb.event_hall_id = eh.event_hall_id;

DROP VIEW IF EXISTS vw_equipment_status;
CREATE VIEW vw_equipment_status AS
SELECT
    eq.equipment_id,
    eq.name,
    eq.category,
    eq.quantity_total,
    eq.quantity_available,
    eq.status,
    eq.unit_cost,
    CASE
        WHEN eq.quantity_available = 0 THEN 'OutOfStock'
        WHEN eq.quantity_available < eq.quantity_total THEN 'PartiallyAllocated'
        ELSE 'Available'
    END AS availability_summary
FROM equipment eq;

DROP VIEW IF EXISTS vw_dashboard_stats;
CREATE VIEW vw_dashboard_stats AS
SELECT
    (SELECT COUNT(*) FROM event_halls) AS total_halls,
    (SELECT COUNT(*) FROM event_halls WHERE status = 'Available') AS available_halls,
    (SELECT COUNT(*) FROM event_halls WHERE status = 'Reserved') AS reserved_halls,
    (SELECT COUNT(*) FROM event_halls WHERE status = 'Under maintenance') AS maintenance_halls,
    (SELECT COUNT(*) FROM event_bookings WHERE booking_status = 'Confirmed') AS confirmed_bookings,
    (SELECT COUNT(*) FROM event_bookings WHERE booking_status = 'Draft') AS draft_bookings,
    (SELECT COUNT(*) FROM event_bookings WHERE booking_status = 'Completed') AS completed_bookings,
    (SELECT IFNULL(SUM(total_amount), 0.00) FROM invoices WHERE invoice_status = 'Paid') AS paid_revenue,
    (SELECT IFNULL(SUM(total_amount - paid_amount), 0.00) FROM invoices WHERE invoice_status IN ('Unpaid', 'Partial')) AS outstanding_revenue,
    (SELECT COUNT(*) FROM equipment WHERE quantity_available < quantity_total) AS allocated_equipment_items;

SELECT 'MySQL views created successfully.' AS message;
