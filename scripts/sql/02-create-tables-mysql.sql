-- ============================================================
-- Script 02: Create Tables (MySQL)
-- Confera Event Management System
-- ============================================================

USE confera_event_management;

SET NAMES utf8mb4;

CREATE TABLE roles (
    role_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    description VARCHAR(255) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_roles PRIMARY KEY (role_id),
    CONSTRAINT uq_roles_name UNIQUE (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
    user_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    role_id BIGINT UNSIGNED NOT NULL,
    username VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NULL,
    phone VARCHAR(30) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    last_login_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_users PRIMARY KEY (user_id),
    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE clients (
    client_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    client_type VARCHAR(30) NOT NULL DEFAULT 'Individual',
    full_name VARCHAR(150) NOT NULL,
    organization_name VARCHAR(150) NULL,
    email VARCHAR(150) NULL,
    phone VARCHAR(30) NULL,
    address_line VARCHAR(255) NULL,
    tax_id VARCHAR(50) NULL,
    notes TEXT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_clients PRIMARY KEY (client_id),
    CONSTRAINT ck_clients_type CHECK (client_type IN ('Individual', 'Company', 'Organization'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE event_halls (
    event_hall_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NULL,
    capacity INT UNSIGNED NOT NULL DEFAULT 0,
    base_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'Available',
    location_description VARCHAR(255) NULL,
    maintenance_notes TEXT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_event_halls PRIMARY KEY (event_hall_id),
    CONSTRAINT uq_event_halls_name UNIQUE (name),
    CONSTRAINT uq_event_halls_code UNIQUE (code),
    CONSTRAINT ck_event_halls_status CHECK (status IN ('Available', 'Reserved', 'In preparation', 'In use', 'Completed', 'Under maintenance'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE service_packages (
    service_package_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_service_packages PRIMARY KEY (service_package_id),
    CONSTRAINT uq_service_packages_name UNIQUE (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE event_services (
    event_service_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(50) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    pricing_model VARCHAR(30) NOT NULL DEFAULT 'Flat',
    unit_label VARCHAR(50) NULL,
    description TEXT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_event_services PRIMARY KEY (event_service_id),
    CONSTRAINT uq_event_services_name UNIQUE (name),
    CONSTRAINT ck_event_services_pricing_model CHECK (pricing_model IN ('Flat', 'PerUnit', 'PerGuest', 'PerHour'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE service_package_items (
    service_package_item_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    service_package_id BIGINT UNSIGNED NOT NULL,
    event_service_id BIGINT UNSIGNED NOT NULL,
    default_quantity DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    notes VARCHAR(255) NULL,
    CONSTRAINT pk_service_package_items PRIMARY KEY (service_package_item_id),
    CONSTRAINT uq_spi_package_service UNIQUE (service_package_id, event_service_id),
    CONSTRAINT fk_spi_package FOREIGN KEY (service_package_id) REFERENCES service_packages(service_package_id),
    CONSTRAINT fk_spi_service FOREIGN KEY (event_service_id) REFERENCES event_services(event_service_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE events (
    event_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    title VARCHAR(150) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    participant_count INT UNSIGNED NOT NULL DEFAULT 0,
    description TEXT NULL,
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_events PRIMARY KEY (event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE equipment (
    equipment_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(50) NOT NULL,
    quantity_total INT UNSIGNED NOT NULL DEFAULT 0,
    quantity_available INT UNSIGNED NOT NULL DEFAULT 0,
    unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'Available',
    notes TEXT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_equipment PRIMARY KEY (equipment_id),
    CONSTRAINT uq_equipment_name UNIQUE (name),
    CONSTRAINT ck_equipment_status CHECK (status IN ('Available', 'Assigned', 'Maintenance', 'Unavailable')),
    CONSTRAINT ck_equipment_quantity CHECK (quantity_available <= quantity_total)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE event_bookings (
    event_booking_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    booking_reference VARCHAR(50) NOT NULL,
    client_id BIGINT UNSIGNED NOT NULL,
    event_id BIGINT UNSIGNED NOT NULL,
    event_hall_id BIGINT UNSIGNED NOT NULL,
    service_package_id BIGINT UNSIGNED NULL,
    created_by_user_id BIGINT UNSIGNED NOT NULL,
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    booking_status VARCHAR(30) NOT NULL DEFAULT 'Draft',
    hall_status_snapshot VARCHAR(30) NULL,
    hall_base_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    package_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    notes TEXT NULL,
    cancelled_at DATETIME NULL,
    completed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_event_bookings PRIMARY KEY (event_booking_id),
    CONSTRAINT uq_event_bookings_reference UNIQUE (booking_reference),
    CONSTRAINT fk_event_bookings_client FOREIGN KEY (client_id) REFERENCES clients(client_id),
    CONSTRAINT fk_event_bookings_event FOREIGN KEY (event_id) REFERENCES events(event_id),
    CONSTRAINT fk_event_bookings_hall FOREIGN KEY (event_hall_id) REFERENCES event_halls(event_hall_id),
    CONSTRAINT fk_event_bookings_package FOREIGN KEY (service_package_id) REFERENCES service_packages(service_package_id),
    CONSTRAINT fk_event_bookings_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(user_id),
    CONSTRAINT ck_event_bookings_status CHECK (booking_status IN ('Draft', 'Confirmed', 'Cancelled', 'Completed')),
    CONSTRAINT ck_event_bookings_hall_snapshot CHECK (hall_status_snapshot IS NULL OR hall_status_snapshot IN ('Available', 'Reserved', 'In preparation', 'In use', 'Completed', 'Under maintenance')),
    CONSTRAINT ck_event_bookings_time CHECK (end_time > start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE event_booking_services (
    event_booking_service_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_booking_id BIGINT UNSIGNED NOT NULL,
    event_service_id BIGINT UNSIGNED NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    line_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    notes VARCHAR(255) NULL,
    CONSTRAINT pk_event_booking_services PRIMARY KEY (event_booking_service_id),
    CONSTRAINT uq_booking_service UNIQUE (event_booking_id, event_service_id),
    CONSTRAINT fk_ebs_booking FOREIGN KEY (event_booking_id) REFERENCES event_bookings(event_booking_id),
    CONSTRAINT fk_ebs_service FOREIGN KEY (event_service_id) REFERENCES event_services(event_service_id),
    CONSTRAINT ck_event_booking_services_quantity CHECK (quantity > 0),
    CONSTRAINT ck_event_booking_services_unit_price CHECK (unit_price >= 0),
    CONSTRAINT ck_event_booking_services_line_total CHECK (line_total >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE booking_equipment (
    booking_equipment_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_booking_id BIGINT UNSIGNED NOT NULL,
    equipment_id BIGINT UNSIGNED NOT NULL,
    quantity_assigned INT UNSIGNED NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    line_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    assignment_status VARCHAR(30) NOT NULL DEFAULT 'Assigned',
    notes VARCHAR(255) NULL,
    CONSTRAINT pk_booking_equipment PRIMARY KEY (booking_equipment_id),
    CONSTRAINT uq_booking_equipment UNIQUE (event_booking_id, equipment_id),
    CONSTRAINT fk_be_booking FOREIGN KEY (event_booking_id) REFERENCES event_bookings(event_booking_id),
    CONSTRAINT fk_be_equipment FOREIGN KEY (equipment_id) REFERENCES equipment(equipment_id),
    CONSTRAINT ck_booking_equipment_status CHECK (assignment_status IN ('Assigned', 'Released', 'Cancelled')),
    CONSTRAINT ck_booking_equipment_quantity CHECK (quantity_assigned > 0),
    CONSTRAINT ck_booking_equipment_unit_price CHECK (unit_price >= 0),
    CONSTRAINT ck_booking_equipment_line_total CHECK (line_total >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE staff_assignments (
    staff_assignment_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_booking_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    assignment_role VARCHAR(50) NOT NULL,
    task_description VARCHAR(255) NULL,
    assignment_status VARCHAR(30) NOT NULL DEFAULT 'Assigned',
    assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,
    notes TEXT NULL,
    CONSTRAINT pk_staff_assignments PRIMARY KEY (staff_assignment_id),
    CONSTRAINT fk_staff_assignments_booking FOREIGN KEY (event_booking_id) REFERENCES event_bookings(event_booking_id),
    CONSTRAINT fk_staff_assignments_user FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT ck_staff_assignments_status CHECK (assignment_status IN ('Assigned', 'InProgress', 'Completed', 'Cancelled'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE invoices (
    invoice_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_booking_id BIGINT UNSIGNED NOT NULL,
    invoice_number VARCHAR(50) NOT NULL,
    invoice_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    hall_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    package_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    services_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    equipment_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    invoice_status VARCHAR(20) NOT NULL DEFAULT 'Unpaid',
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_invoices PRIMARY KEY (invoice_id),
    CONSTRAINT uq_invoices_invoice_number UNIQUE (invoice_number),
    CONSTRAINT uq_invoices_booking UNIQUE (event_booking_id),
    CONSTRAINT fk_invoices_booking FOREIGN KEY (event_booking_id) REFERENCES event_bookings(event_booking_id),
    CONSTRAINT ck_invoices_status CHECK (invoice_status IN ('Unpaid', 'Partial', 'Paid')),
    CONSTRAINT ck_invoices_amounts CHECK (
        hall_amount >= 0 AND
        package_amount >= 0 AND
        services_amount >= 0 AND
        equipment_amount >= 0 AND
        discount_amount >= 0 AND
        subtotal >= 0 AND
        tax_amount >= 0 AND
        total_amount >= 0 AND
        paid_amount >= 0
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payments (
    payment_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    invoice_id BIGINT UNSIGNED NOT NULL,
    payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(20) NOT NULL DEFAULT 'Cash',
    reference_number VARCHAR(100) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Completed',
    recorded_by_user_id BIGINT UNSIGNED NULL,
    notes VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_payments PRIMARY KEY (payment_id),
    CONSTRAINT fk_payments_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id),
    CONSTRAINT fk_payments_recorded_by FOREIGN KEY (recorded_by_user_id) REFERENCES users(user_id),
    CONSTRAINT ck_payments_method CHECK (payment_method IN ('Cash', 'Card', 'Transfer', 'Other')),
    CONSTRAINT ck_payments_status CHECK (status IN ('Pending', 'Completed', 'Failed', 'Refunded')),
    CONSTRAINT ck_payments_amount CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE reports (
    report_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    report_type VARCHAR(50) NOT NULL,
    generated_by_user_id BIGINT UNSIGNED NOT NULL,
    parameters_json JSON NULL,
    generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    file_path VARCHAR(255) NULL,
    notes VARCHAR(255) NULL,
    CONSTRAINT pk_reports PRIMARY KEY (report_id),
    CONSTRAINT fk_reports_generated_by FOREIGN KEY (generated_by_user_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'All Confera MySQL tables created successfully.' AS message;
