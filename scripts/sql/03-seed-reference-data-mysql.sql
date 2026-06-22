-- ============================================================
-- Script 03: Seed Reference Data (MySQL)
-- Confera Event Management System
-- ============================================================

USE confera_event_management;

INSERT INTO roles (name, description, is_active)
VALUES
    ('Administrator', 'Manages users, halls, prices, services, and reports.', 1),
    ('Event Coordinator', 'Creates bookings, registers clients, and handles billing.', 1),
    ('Operational Staff', 'Updates hall readiness, equipment usage, and task progress.', 1);

INSERT INTO users (role_id, username, password_hash, full_name, email, phone, is_active)
VALUES
    (1, 'admin.confera', 'scrypt$16384$8$1$00a6711337a2d820de86fd7be1d7743d$fe7fe6a8bcad332b38547fa0b48b261cacbfa6075b5a3adf3fa1ab0c7d7113241f34289bb4c74a2679c8a867b092233700f69166f285324c405247472d074b22', 'Confera Admin', 'admin@confera.local', '+355690000001', 1),
    (2, 'elira.coordinator', 'scrypt$16384$8$1$3ef656669a698926e230aac0b90c481f$5f672e93257babae62096770716b02037c98a976a7036a400029f820128370ec6c17319e281107e1a34714fee10994b77f7169ab1ebf35c3e0ba3b57758784dc', 'Elira Coordinator', 'coordinator@confera.local', '+355690000002', 1),
    (3, 'staff.confera', 'scrypt$16384$8$1$df558bdc6931c408d97a4bdb735f4281$cb44fd246bee8a6b468e7a64ee4cc0f4ec0574eee54e17db8083ca7641846b2003295f4bf9e94c69438884ec227c65893c5d063fc7f2bdbb9c40d3d8d2d29085', 'Confera Operational Staff', 'staff@confera.local', '+355690000003', 1);

INSERT INTO event_halls (name, code, capacity, base_price, status, location_description, is_active)
VALUES
    ('Grand Hall', 'GH-01', 250, 1200.00, 'Available', 'Main indoor ceremonial hall', 1),
    ('Skyline Hall', 'SH-01', 120, 800.00, 'Available', 'Upper level event hall with city view', 1),
    ('Garden Terrace', 'GT-01', 90, 650.00, 'Available', 'Outdoor terrace for receptions', 1);

INSERT INTO service_packages (name, description, price, is_active)
VALUES
    ('Classic Package', 'Standard seating, basic decor, and coordination support.', 500.00, 1),
    ('Premium Package', 'Enhanced decor, AV support, and catering coordination.', 950.00, 1),
    ('Corporate Package', 'Conference seating, projector support, and refreshment setup.', 700.00, 1);

INSERT INTO event_services (name, category, unit_price, pricing_model, unit_label, description, is_active)
VALUES
    ('Catering Buffet', 'Catering', 25.00, 'PerGuest', 'guest', 'Buffet catering service per attendee.', 1),
    ('Floral Decoration', 'Decoration', 300.00, 'Flat', NULL, 'Standard floral decoration set.', 1),
    ('Projector Setup', 'AudioVisual', 150.00, 'Flat', NULL, 'Projector and screen setup.', 1),
    ('Sound Technician', 'AudioVisual', 60.00, 'PerHour', 'hour', 'On-site sound technician support.', 1),
    ('Chair Reconfiguration', 'Seating', 2.50, 'PerUnit', 'chair', 'Custom seating arrangement service.', 1);

INSERT INTO service_package_items (service_package_id, event_service_id, default_quantity, notes)
VALUES
    (1, 2, 1.00, 'Classic package includes basic decoration.'),
    (2, 2, 1.00, 'Premium package includes premium floral decoration.'),
    (2, 3, 1.00, 'Premium package includes projector setup if needed.'),
    (3, 3, 1.00, 'Corporate package includes projector setup.');

INSERT INTO equipment (name, category, quantity_total, quantity_available, unit_cost, status, is_active)
VALUES
    ('Projector', 'AudioVisual', 4, 4, 90.00, 'Available', 1),
    ('Wireless Microphone', 'AudioVisual', 10, 10, 25.00, 'Available', 1),
    ('Round Table', 'Furniture', 20, 20, 15.00, 'Available', 1),
    ('Banquet Chair', 'Furniture', 300, 300, 2.00, 'Available', 1),
    ('LED Light Bar', 'Lighting', 12, 12, 20.00, 'Available', 1);

SELECT 'Reference data seeded successfully.' AS message;
