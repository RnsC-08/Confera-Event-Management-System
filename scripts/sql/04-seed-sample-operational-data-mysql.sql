-- ============================================================
-- Script 04: Seed Sample Operational Data (MySQL)
-- Confera Event Management System
-- ============================================================

USE confera_event_management;

INSERT INTO clients (client_type, full_name, organization_name, email, phone, address_line, tax_id, notes, is_active)
VALUES
    ('Individual', 'Aurora Dimni', NULL, 'aurora@example.com', '+355691111111', 'Tirane, Albania', NULL, 'Wedding event organizer.', 1),
    ('Company', 'Leonora Licaj', 'BizEvents shpk', 'leonora@bizevents.al', '+355692222222', 'Durres, Albania', 'L12345678A', 'Corporate conference client.', 1),
    ('Organization', 'Gloria Gazi', 'Community Forum', 'gloria@forum.org', '+355693333333', 'Vlore, Albania', NULL, 'Public seminar organizer.', 1);

INSERT INTO events (title, event_type, participant_count, description, notes)
VALUES
    ('Aurora Wedding Reception', 'Wedding', 180, 'Formal wedding reception with dinner service.', 'Requires stage lighting and floral decoration.'),
    ('BizEvents Quarterly Summit', 'Conference', 110, 'Quarterly business summit with presentations.', 'Requires AV support and buffet lunch.'),
    ('Community Leadership Seminar', 'Seminar', 70, 'Leadership seminar with panel discussion.', 'Requires classroom-style seating.');

INSERT INTO event_bookings (
    booking_reference,
    client_id,
    event_id,
    event_hall_id,
    service_package_id,
    created_by_user_id,
    event_date,
    start_time,
    end_time,
    booking_status,
    hall_status_snapshot,
    hall_base_price,
    package_price,
    discount_amount,
    notes
)
VALUES
    ('CFR-2026-0001', 1, 1, 1, 2, 2, '2026-07-18', '17:00:00', '23:00:00', 'Confirmed', 'Reserved', 1200.00, 950.00, 100.00, 'Main wedding booking.'),
    ('CFR-2026-0002', 2, 2, 2, 3, 2, '2026-07-20', '09:00:00', '17:00:00', 'Confirmed', 'Reserved', 800.00, 700.00, 0.00, 'Corporate summit booking.'),
    ('CFR-2026-0003', 3, 3, 3, 1, 2, '2026-07-22', '10:00:00', '14:00:00', 'Draft', NULL, 650.00, 500.00, 0.00, 'Seminar pending final confirmation.');

INSERT INTO event_booking_services (event_booking_id, event_service_id, quantity, unit_price, line_total, notes)
VALUES
    (1, 1, 180.00, 25.00, 4500.00, 'Buffet for wedding guests.'),
    (1, 4, 6.00, 60.00, 360.00, 'Sound technician for full event duration.'),
    (2, 1, 110.00, 25.00, 2750.00, 'Buffet lunch for summit attendees.'),
    (2, 4, 8.00, 60.00, 480.00, 'Technician support for presentations.'),
    (3, 5, 70.00, 2.50, 175.00, 'Seating arrangement for seminar attendees.');

INSERT INTO booking_equipment (event_booking_id, equipment_id, quantity_assigned, unit_price, line_total, assignment_status, notes)
VALUES
    (1, 2, 4, 25.00, 100.00, 'Assigned', 'Microphones for speeches and performances.'),
    (1, 5, 6, 20.00, 120.00, 'Assigned', 'Ambient wedding lighting.'),
    (2, 1, 2, 90.00, 180.00, 'Assigned', 'Projectors for keynote sessions.'),
    (2, 2, 6, 25.00, 150.00, 'Assigned', 'Microphones for panel speakers.'),
    (3, 4, 70, 2.00, 140.00, 'Assigned', 'Seminar seating allocation.');

UPDATE event_halls
SET status = 'Reserved'
WHERE event_hall_id IN (1, 2);

UPDATE equipment
SET quantity_available = CASE equipment_id
    WHEN 1 THEN 2
    WHEN 2 THEN 0
    WHEN 4 THEN 230
    WHEN 5 THEN 6
    ELSE quantity_available
END,
status = CASE equipment_id
    WHEN 1 THEN 'Assigned'
    WHEN 2 THEN 'Assigned'
    WHEN 4 THEN 'Assigned'
    WHEN 5 THEN 'Assigned'
    ELSE status
END
WHERE equipment_id IN (1, 2, 4, 5);

INSERT INTO staff_assignments (event_booking_id, user_id, assignment_role, task_description, assignment_status, notes)
VALUES
    (1, 3, 'Setup', 'Prepare hall layout and lighting for reception.', 'Assigned', 'Arrive three hours before the event.'),
    (2, 3, 'AudioVisual', 'Coordinate projector and microphone setup.', 'Assigned', 'Test all AV equipment before opening.'),
    (3, 3, 'Seating', 'Prepare seminar chair layout.', 'Assigned', 'Pending final booking confirmation.');

INSERT INTO invoices (
    event_booking_id,
    invoice_number,
    invoice_date,
    hall_amount,
    package_amount,
    services_amount,
    equipment_amount,
    discount_amount,
    subtotal,
    tax_amount,
    total_amount,
    paid_amount,
    invoice_status,
    notes
)
VALUES
    (1, 'INV-CFR-0001', '2026-07-01 09:00:00', 1200.00, 950.00, 4860.00, 220.00, 100.00, 7130.00, 0.00, 7130.00, 3500.00, 'Partial', 'Wedding booking invoice.'),
    (2, 'INV-CFR-0002', '2026-07-02 10:00:00', 800.00, 700.00, 3230.00, 330.00, 0.00, 5060.00, 0.00, 5060.00, 0.00, 'Unpaid', 'Corporate summit invoice.');

INSERT INTO payments (invoice_id, payment_date, amount, payment_method, reference_number, status, recorded_by_user_id, notes)
VALUES
    (1, '2026-07-03 11:30:00', 2000.00, 'Transfer', 'BANK-TRX-1001', 'Completed', 2, 'Initial deposit received.'),
    (1, '2026-07-07 16:15:00', 1500.00, 'Card', 'POS-445566', 'Completed', 2, 'Second installment received.');

INSERT INTO reports (report_type, generated_by_user_id, parameters_json, generated_at, file_path, notes)
VALUES
    ('Bookings', 1, JSON_OBJECT('fromDate', '2026-07-01', 'toDate', '2026-07-31'), '2026-07-05 08:00:00', NULL, 'Monthly booking activity report.'),
    ('Payments', 1, JSON_OBJECT('invoiceStatus', 'Partial'), '2026-07-08 08:15:00', NULL, 'Outstanding balance review.');

SELECT 'Sample operational data seeded successfully.' AS message;
