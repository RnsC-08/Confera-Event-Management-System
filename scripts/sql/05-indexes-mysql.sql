-- ============================================================
-- Script 05: Indexes (MySQL)
-- Confera Event Management System
-- ============================================================

USE confera_event_management;

CREATE INDEX idx_users_active ON users (is_active);

CREATE INDEX idx_clients_full_name ON clients (full_name);
CREATE INDEX idx_clients_email ON clients (email);
CREATE INDEX idx_clients_phone ON clients (phone);

CREATE INDEX idx_event_halls_status ON event_halls (status);
CREATE INDEX idx_event_halls_capacity ON event_halls (capacity);

CREATE INDEX idx_service_packages_active ON service_packages (is_active);

CREATE INDEX idx_event_services_category ON event_services (category);
CREATE INDEX idx_event_services_active ON event_services (is_active);

CREATE INDEX idx_events_type ON events (event_type);
CREATE INDEX idx_events_participant_count ON events (participant_count);

CREATE INDEX idx_equipment_status ON equipment (status);
CREATE INDEX idx_equipment_category ON equipment (category);

CREATE INDEX idx_bookings_hall_schedule
    ON event_bookings (event_hall_id, event_date, start_time, end_time);
CREATE INDEX idx_bookings_status ON event_bookings (booking_status);
CREATE INDEX idx_bookings_event_date ON event_bookings (event_date);
CREATE INDEX idx_be_status ON booking_equipment (assignment_status);

CREATE INDEX idx_staff_assignments_status ON staff_assignments (assignment_status);

CREATE INDEX idx_invoices_status ON invoices (invoice_status);
CREATE INDEX idx_invoices_date ON invoices (invoice_date);

CREATE INDEX idx_payments_date ON payments (payment_date);
CREATE INDEX idx_payments_method ON payments (payment_method);

CREATE INDEX idx_reports_type ON reports (report_type);
CREATE INDEX idx_reports_generated_at ON reports (generated_at);

SELECT 'MySQL indexes created successfully.' AS message;
