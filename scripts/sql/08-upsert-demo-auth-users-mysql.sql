-- Local academic demo accounts. Password for all three: Confera123!
-- Run this once against an existing Confera database after the roles seed.
USE confera_event_management;

INSERT INTO users (role_id, username, password_hash, full_name, email, phone, is_active)
VALUES
  ((SELECT role_id FROM roles WHERE name = 'Administrator'), 'admin.confera', 'scrypt$16384$8$1$00a6711337a2d820de86fd7be1d7743d$fe7fe6a8bcad332b38547fa0b48b261cacbfa6075b5a3adf3fa1ab0c7d7113241f34289bb4c74a2679c8a867b092233700f69166f285324c405247472d074b22', 'Confera Admin', 'admin@confera.local', '+355690000001', 1),
  ((SELECT role_id FROM roles WHERE name = 'Event Coordinator'), 'elira.coordinator', 'scrypt$16384$8$1$3ef656669a698926e230aac0b90c481f$5f672e93257babae62096770716b02037c98a976a7036a400029f820128370ec6c17319e281107e1a34714fee10994b77f7169ab1ebf35c3e0ba3b57758784dc', 'Elira Coordinator', 'coordinator@confera.local', '+355690000002', 1),
  ((SELECT role_id FROM roles WHERE name = 'Operational Staff'), 'staff.confera', 'scrypt$16384$8$1$df558bdc6931c408d97a4bdb735f4281$cb44fd246bee8a6b468e7a64ee4cc0f4ec0574eee54e17db8083ca7641846b2003295f4bf9e94c69438884ec227c65893c5d063fc7f2bdbb9c40d3d8d2d29085', 'Confera Operational Staff', 'staff@confera.local', '+355690000003', 1)
ON DUPLICATE KEY UPDATE
  role_id = VALUES(role_id),
  username = VALUES(username),
  password_hash = VALUES(password_hash),
  full_name = VALUES(full_name),
  is_active = 1;

SELECT email, full_name, is_active FROM users
WHERE email IN ('admin@confera.local', 'coordinator@confera.local', 'staff@confera.local');
