# Confera Migration Notes

## Old Hotel Tables to New Confera Tables

| Old SQL Server table | New MySQL table(s) | Notes |
|---|---|---|
| `Users` | `roles`, `users` | Roles are split into their own lookup table. |
| `Customers` | `clients` | Guest/customer becomes client or event organizer. |
| `Rooms` | `event_halls` | Room inventory becomes event halls/venues. |
| `Reservations` | `events`, `event_bookings` | Booking shell is separated from event details. |
| `Services` | `event_services` | Hotel services become event services. |
| none | `service_packages`, `service_package_items` | New package support for bundled services. |
| `InventoryItems` | `equipment` | Inventory becomes event equipment. |
| `ServiceUsages` | `event_booking_services` | Services are attached directly to bookings. |
| none | `booking_equipment` | Many-to-many booking/equipment assignment table. |
| none | `staff_assignments` | Many-to-many booking/staff assignment table. |
| `Invoices` | `invoices` | Converted from stay-based billing to event-based billing. |
| `Payments` | `payments` | Same concept, new invoice model. |
| SQL views | `vw_*` MySQL views plus `reports` | Reporting layer is recreated for Confera. |

## SQL Server to MySQL Conversion Notes

- `IDENTITY(1,1)` becomes `AUTO_INCREMENT`.
- `NVARCHAR` becomes `VARCHAR` or `TEXT`.
- `BIT` becomes `TINYINT(1)`.
- `DATETIME2` becomes `DATETIME`.
- `GETDATE()` becomes `CURRENT_TIMESTAMP` or `NOW()`.
- `TOP n` becomes `LIMIT n`.
- `OUTPUT INSERTED.*` becomes `LAST_INSERT_ID()` plus a follow-up `SELECT`.
- SQL Server bracket notation like `[hotel].[Rooms]` becomes plain MySQL table naming like `event_halls`.
- `ISNULL()` becomes `IFNULL()` or `COALESCE()`.
- `DATEDIFF(day, a, b)` becomes `TIMESTAMPDIFF(DAY, a, b)` where day-based logic is still needed.
- `TRY_CAST()` must be replaced with validated input handling plus `CAST()` only where safe.
- `CREATE OR ALTER VIEW` becomes `DROP VIEW IF EXISTS ...; CREATE VIEW ...`.
- SQL Server filtered/included indexes must be redesigned as regular MySQL indexes.
- `SET IDENTITY_INSERT` is not carried forward; MySQL seeding should rely on generated IDs unless explicit IDs are truly required.

## Out-of-Scope Hotel and Restaurant Concepts

These concepts from the old system are intentionally not migrated into the Confera core schema:

- Restaurant table reservations
- Table layout/status as a separate hospitality module
- Hotel room occupancy and overnight stay logic
- Guest check-in / check-out as stay lifecycle states
- Room service as a hotel-only concept
- Linen/toiletry stock categories that are specific to hotel housekeeping

The replacement domain is centered on event halls, time-slot bookings, packages, equipment, staff assignment, and event billing.

## Double-Booking Validation Rule

Confera must prevent overlapping active bookings for the same hall on the same date.

Active blocking statuses:

- `Confirmed`

Non-blocking statuses:

- `Draft`
- `Cancelled`
- `Completed`

Overlap rule:

- A new booking overlaps if `new_start_time < existing_end_time`
- And `new_end_time > existing_start_time`

Validation query pattern:

```sql
SELECT 1
FROM event_bookings eb
WHERE eb.event_hall_id = ?
  AND eb.event_date = ?
  AND eb.booking_status = 'Confirmed'
  AND eb.event_booking_id <> COALESCE(?, 0)
  AND ? < eb.end_time
  AND ? > eb.start_time
LIMIT 1;
```

Implementation note:

- This rule must be enforced later in backend transaction logic.
- MySQL cannot guarantee interval exclusion with a simple unique index alone.

## Invoice Calculation Logic

Each invoice is derived from one event booking.

Formula:

- `hall_amount` = booked hall base price snapshot
- `package_amount` = selected package price snapshot
- `services_amount` = sum of `event_booking_services.line_total`
- `equipment_amount` = sum of `booking_equipment.line_total`
- `discount_amount` = booking-level discount
- `subtotal` = `hall_amount + package_amount + services_amount + equipment_amount - discount_amount`
- `tax_amount` = currently seeded as `0.00` until tax policy is defined
- `total_amount` = `subtotal + tax_amount`
- `paid_amount` = sum of completed payments

Invoice status:

- `Unpaid` when `paid_amount = 0`
- `Partial` when `paid_amount > 0` and `paid_amount < total_amount`
- `Paid` when `paid_amount >= total_amount`

Snapshot rule:

- Hall, package, service, and equipment prices are stored on booking/invoice rows so later price list changes do not alter historical invoices.

## Next Implementation Steps

1. Validate these scripts against a local MySQL 8 instance.
2. Add backend database access for MySQL without changing domain behavior yet.
3. Replace hotel SQL queries with Confera table/query equivalents.
4. Implement server-side booking overlap validation in the booking create/update flow.
5. Rework invoice generation to use event-based totals instead of room-night calculations.
6. Replace hotel-specific mock data and UI labels only after the database and backend contract are stable.
