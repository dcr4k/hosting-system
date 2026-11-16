# Security Specification — Digit4lKey StayOS Multi-Tenant SaaS

## 1. Data Invariants
1. **Strict Tenant Isolation**: Every operational document (`accommodations`, `units`, `availability`, `rate_plans`, `reservations`, `guests`, `payments`, `audit_logs`) MUST carry a valid `tenantId` (`^[a-zA-Z0-9_\-]+$`, max 128 chars).
2. **Schema & Volumetric Enforcement**: Every string field is strictly bounded by `.size() <= MAX` and every document creation checks `keys().hasAll(...)` and `keys().hasOnly(...)`.
3. **Role-Based Access Control (RBAC)**:
   - `platform_admin`: Bootstrapped via verified email (`digit4lkey@gmail.com`) or `/users/$(request.auth.uid)` role lookup.
   - `tenant_owner` / `tenant_manager` / `tenant_staff`: Verified against `/users/$(request.auth.uid).data.tenantId == tenantId`.
   - Demo Environment (`demo-*` tenant IDs): Isolated from real production tenants; allows interactive demonstration and restoration while enforcing full schema validation.
4. **PII Protection (LGPD)**: `guests` and `users` collections enforce strict schema validation and prevent unauthorized cross-tenant leakage.

## 2. The "Dirty Dozen" Payloads (Rejected with PERMISSION_DENIED)
1. **Shadow Field Injection on Tenant**: `{ id: "t1", ..., isSuperAdmin: true }` -> Rejected by `hasOnly()`.
2. **Oversized ID Poisoning**: Document path `{tenantId}` with 500 chars -> Rejected by `isValidId()`.
3. **Cross-Tenant Accommodation Write**: Authenticated user of `tenant-a` writing to `tenant-b` -> Rejected by `canManageTenant()`.
4. **Unverified Admin Email Spoof**: Token with `email == 'digit4lkey@gmail.com'` and `email_verified == false` -> Rejected by `isPlatformAdmin()`.
5. **Invalid Reservation Status**: Creating reservation with `status: 'hacked'` -> Rejected by `isValidReservation()`.
6. **Negative Price Injection**: Creating accommodation with `basePrice: -500` -> Rejected by `data.basePrice >= 0`.
7. **Immutable Field Mutation**: Updating `tenantId` or `createdAt` on an existing reservation -> Rejected by immutability gate.
8. **Malformed Date on Availability Slot**: Creating slot with `date: '2026/99/99'` -> Rejected by regex `^[0-9]{4}-[0-9]{2}-[0-9]{2}$`.
9. **Audit Log Deletion**: Attempting `delete` on `/audit_logs/{logId}` -> Rejected (`allow delete: if false`).
10. **Audit Log Mutation**: Attempting `update` on `/audit_logs/{logId}` -> Rejected (`allow update: if false`).
11. **Self-Privilege Escalation on User Profile**: User creating profile with `role: 'platform_admin'` without verified admin email -> Rejected.
12. **Blanket Unbounded Description**: Sending a 50,000-character string in `description` -> Rejected by `.size() <= 2000`.
