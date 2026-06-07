# Employee Vault Upgrade for GlobalWork Admin Dashboard — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Upgrade the existing GlobalWork Pro Admin Dashboard from HR/ops management into a real Employee Vault with documents, assets, access checklists, audit logs, and stronger security.

**Current Context:** Existing repo `/root/WORKPGHPRO` already has employee profiles, admin console, role permissions, attendance/history, leave approval, payroll basics, organization/team management, login logs, and MKT dashboard. Missing vault-grade modules are document storage, field-level permission/audit, asset tracking, onboarding/offboarding, and access inventory.

**Architecture:** Keep the current React/Vercel/Supabase structure. Add new typed modules and Supabase tables rather than overloading `users`. Sensitive files should live in Supabase Storage with signed URLs and audit logs. Add backend API routes for privileged mutations so sensitive actions do not rely on client-only logic.

**Tech Stack:** React + TypeScript, current `types.ts`, existing components in `/root/WORKPGHPRO/components`, Vercel API routes under `/root/WORKPGHPRO/api`, Supabase tables/storage.

---

## Phase 0 — Preflight / Safety

### Task 0.1: Confirm current data model and Supabase tables

**Objective:** Identify current tables, client sync behavior, and which data is cloud-first.

**Files to inspect:**
- `/root/WORKPGHPRO/types.ts`
- `/root/WORKPGHPRO/services/syncService.ts`
- `/root/WORKPGHPRO/services/supabase.ts`
- `/root/WORKPGHPRO/api/*.ts`
- Supabase dashboard / SQL schema if accessible

**Checks:**
- Current user fields: name, position, department, employeeId, joinDate, company, avatar, role, teamId, face fields, leaveBalances.
- Current modules: AdminConsole, Organization, PermissionManager, PayrollManager.
- Confirm whether RLS policies are safe before adding sensitive data.

**Verification:** Produce a short schema note before coding.

---

## Phase 1 — Employee Profile Expansion

### Task 1.1: Extend TypeScript user/profile types

**Objective:** Add HR fields without touching document/payroll security yet.

**Modify:**
- `/root/WORKPGHPRO/types.ts`

**Add fields to `UserProfile` / related member type:**
- `phone?: string`
- `personalEmail?: string`
- `workEmail?: string`
- `address?: string`
- `birthDate?: string`
- `employmentStatus?: 'ACTIVE' | 'PROBATION' | 'RESIGNED' | 'SUSPENDED'`
- `probationEndDate?: string`
- `resignDate?: string`
- `managerId?: string`
- `emergencyContact?: { name: string; relation?: string; phone: string }`
- `hrNotes?: string`

**Verification:** TypeScript compile passes.

### Task 1.2: Map new fields through Supabase sync

**Objective:** Ensure new profile fields persist cloud-first.

**Modify:**
- `/root/WORKPGHPRO/services/syncService.ts`
- Supabase `users` table migration

**Add DB columns:**
- `phone`, `personal_email`, `work_email`, `address`, `birth_date`, `employment_status`, `probation_end_date`, `resign_date`, `manager_id`, `emergency_contact`, `hr_notes`

**Verification:** Existing users still load; new fields remain optional.

### Task 1.3: Add profile edit UI in Admin/Organization

**Objective:** Make admins edit the new fields.

**Modify:**
- `/root/WORKPGHPRO/components/Organization.tsx`
- Possibly split a new component: `/root/WORKPGHPRO/components/EmployeeProfileEditor.tsx`

**UX:** Add grouped sections:
- Basic
- Employment
- Contact
- Emergency
- HR internal notes

**Verification:** Update one test employee locally/staging; refresh page; values persist.

---

## Phase 2 — Document Vault

### Task 2.1: Add document data model

**Objective:** Represent documents with expiry and version metadata.

**Modify:**
- `/root/WORKPGHPRO/types.ts`

**Create interface:**
- `EmployeeDocument`
  - `id`
  - `employeeId`
  - `type: 'ID_CARD' | 'PASSPORT' | 'WORK_PERMIT' | 'CONTRACT' | 'NDA' | 'TAX' | 'SOCIAL_SECURITY' | 'OTHER'`
  - `title`
  - `storagePath`
  - `fileName`
  - `mimeType`
  - `sizeBytes`
  - `version`
  - `expiresAt?`
  - `uploadedBy`
  - `uploadedAt`
  - `status: 'ACTIVE' | 'EXPIRED' | 'REVOKED'`
  - `notes?`

### Task 2.2: Create Supabase tables/storage

**Objective:** Store metadata in DB and files in protected bucket.

**Supabase:**
- Table `employee_documents`
- Storage bucket `employee-documents`
- Policies:
  - Admin/HR can upload/manage
  - Employee can view allowed self docs if desired
  - Finance does not automatically see documents

**Important:** Signed URL only, short expiry. No public bucket.

### Task 2.3: Add backend API routes for document actions

**Objective:** Avoid client-only privileged document actions.

**Create:**
- `/root/WORKPGHPRO/api/documents-list.ts`
- `/root/WORKPGHPRO/api/documents-sign-upload.ts`
- `/root/WORKPGHPRO/api/documents-sign-download.ts`
- `/root/WORKPGHPRO/api/documents-delete.ts` or soft-delete endpoint

**Each action must write audit log.**

### Task 2.4: Add Document Vault UI

**Objective:** Let admin manage documents per employee.

**Create:**
- `/root/WORKPGHPRO/components/EmployeeDocumentVault.tsx`

**Wire into:**
- `/root/WORKPGHPRO/components/Organization.tsx` or AdminConsole employee detail panel

**UI features:**
- Upload file
- Select type
- Expiry date
- Document list
- Download/open via signed URL
- Version display
- Expiry warning badge
- Soft delete/revoke

**Verification:** Upload a dummy PDF/image to staging, refresh, download via signed URL, confirm audit row exists.

---

## Phase 3 — Audit Log Foundation

### Task 3.1: Define audit event model

**Objective:** Capture sensitive actions across admin dashboard.

**Add:**
- `AuditEvent` interface in `/root/WORKPGHPRO/types.ts`
- Supabase table `audit_logs`

**Fields:**
- `id`
- `actor_user_id`
- `actor_name`
- `action`
- `target_type`
- `target_id`
- `target_label`
- `before_json?`
- `after_json?`
- `metadata?`
- `ip?`
- `user_agent?`
- `created_at`

### Task 3.2: Add server helper for audit writes

**Objective:** Centralize audit logging.

**Create:**
- `/root/WORKPGHPRO/api/_audit.ts`

**Use in API routes:**
- PIN change
- Document actions
- Payroll actions
- Permission/role actions where backend route exists

### Task 3.3: Add Audit Log screen

**Objective:** Give admins a searchable read-only audit log.

**Create:**
- `/root/WORKPGHPRO/components/AuditLogViewer.tsx`

**Modify:**
- `/root/WORKPGHPRO/types.ts` permission keys add `audit`
- `/root/WORKPGHPRO/components/PermissionManager.tsx` add Audit permission
- `/root/WORKPGHPRO/components/Sidebar.tsx` add Audit menu item for admins/authorized roles
- `/root/WORKPGHPRO/App.tsx` route state/rendering

**Filters:**
- actor
- target employee
- action type
- date range

**Verification:** Trigger login/document/payroll action; audit appears.

---

## Phase 4 — Asset Tracking

### Task 4.1: Add asset model/table

**Objective:** Track company property assigned to employees.

**Add interface/table:** `CompanyAsset`
- `id`
- `assetType: 'LAPTOP' | 'PHONE' | 'SIM' | 'KEYCARD' | 'OTHER'`
- `name`
- `serialNumber?`
- `assignedTo?`
- `assignedAt?`
- `returnedAt?`
- `conditionOnAssign?`
- `conditionOnReturn?`
- `status: 'AVAILABLE' | 'ASSIGNED' | 'RETURNED' | 'LOST' | 'DAMAGED'`
- `notes?`

### Task 4.2: Add Asset UI

**Create:**
- `/root/WORKPGHPRO/components/AssetManager.tsx`

**Wire into Admin/Sidebar:**
- Add permission `assets`
- Add Admin Hub card or separate menu item

**Features:**
- Add asset
- Assign to employee
- Mark returned
- Status filter
- Export list

**Verification:** Assign an asset to employee, return it, check audit.

---

## Phase 5 — Access Inventory + Onboarding/Offboarding

### Task 5.1: Add access/account inventory model

**Objective:** Track external systems each employee has access to.

**Add interface/table:** `EmployeeSystemAccess`
- `id`
- `employeeId`
- `systemName`
- `accountIdentifier`
- `role`
- `status: 'REQUESTED' | 'ACTIVE' | 'REVOKED'`
- `grantedAt?`
- `grantedBy?`
- `revokedAt?`
- `revokedBy?`
- `notes?`

**Never store plaintext passwords.** Store only metadata/status.

### Task 5.2: Add onboarding/offboarding checklist templates

**Add interface/table:** `EmployeeChecklistItem`
- `id`
- `employeeId`
- `phase: 'ONBOARDING' | 'OFFBOARDING'`
- `title`
- `category: 'DOCUMENT' | 'ACCESS' | 'ASSET' | 'PAYROLL' | 'HR' | 'OTHER'`
- `status: 'PENDING' | 'DONE' | 'SKIPPED'`
- `dueDate?`
- `completedAt?`
- `completedBy?`

### Task 5.3: Add Onboarding/Offboarding UI

**Create:**
- `/root/WORKPGHPRO/components/EmployeeLifecycleChecklist.tsx`
- `/root/WORKPGHPRO/components/AccessInventory.tsx`

**UX:** In employee detail show tabs:
- Profile
- Documents
- Assets
- Access
- Checklist
- Audit

**Verification:** Create new employee → checklist auto-created. Mark resigned → offboarding checklist appears.

---

## Phase 6 — Dashboard Alerts

### Task 6.1: Add Admin Dashboard risk cards

**Objective:** Make the Admin Dashboard show what needs attention.

**Modify:**
- `/root/WORKPGHPRO/components/AdminConsole.tsx`

**Add cards:**
- Documents expiring in 30 days
- Missing required documents
- Probation ending soon
- Offboarding pending
- Assets not returned
- Access not revoked after resignation
- Payroll pending
- Pending approvals

### Task 6.2: Add filters and quick links

**Objective:** Admin can click risk card and land on the relevant employee/list.

**Modify/Create:**
- Add query-like state or local filters in relevant components

**Verification:** Seed dummy expiring doc/asset; card count matches list.

---

## Phase 7 — Security Hardening

### Task 7.1: Strengthen permission model

**Objective:** Move beyond page-level permissions.

**Add field-level permission keys:**
- `employee_sensitive_view`
- `employee_sensitive_edit`
- `documents_view`
- `documents_upload`
- `documents_download`
- `payroll_view`
- `payroll_edit`
- `audit_view`
- `assets_manage`
- `access_manage`

**Modify:**
- `/root/WORKPGHPRO/types.ts`
- `/root/WORKPGHPRO/components/PermissionManager.tsx`
- `/root/WORKPGHPRO/utils/permissions.ts`

### Task 7.2: Review PIN and admin auth

**Objective:** Ensure sensitive admin actions do not rely only on frontend state.

**Inspect/Modify:**
- `/root/WORKPGHPRO/api/verify-pin.ts`
- `/root/WORKPGHPRO/api/change-pin.ts`
- Login/session handling in `/root/WORKPGHPRO/App.tsx`

**Requirements:**
- Hash PIN/server-side where possible
- Avoid exposing PIN to client
- Add admin re-auth before document/payroll/export actions if feasible

### Task 7.3: RLS and data access review

**Objective:** Ensure Supabase policies match vault sensitivity.

**Check:**
- `users`
- `payroll_records`
- `compensation_settings`
- `employee_documents`
- `audit_logs`
- `company_assets`
- `employee_system_access`

**Verification:** Non-admin cannot fetch sensitive rows via client key.

---

## Phase 8 — Tests / Validation

### Task 8.1: Type and build validation

**Run:**
```bash
cd /root/WORKPGHPRO
npm run build
```

**Expected:** Build passes. No TypeScript errors.

### Task 8.2: Manual smoke test checklist

**Test as Admin:**
- Add/edit employee expanded profile
- Upload/download/revoke document
- Assign/return asset
- Add/revoke external access
- Create onboarding/offboarding checklist item
- Process payroll
- View audit logs

**Test as Employee/Manager:**
- Cannot see restricted docs/payroll/audit
- Can see allowed own profile data
- Menu permissions match role

### Task 8.3: Browser QA

**Use browser dogfood pass:**
- Desktop and mobile
- Console errors after navigation/actions
- Refresh persistence
- Permission boundary checks
- No raw secrets in console/network visible to normal users

---

## Recommended Delivery Order

1. **Profile expansion** — low risk, immediately useful.
2. **Audit log foundation** — needed before sensitive vault actions.
3. **Document Vault** — core vault feature.
4. **Asset Tracking** — operational value, moderate complexity.
5. **Access Inventory + Offboarding** — reduces real security risk.
6. **Dashboard alerts** — makes the system proactive.
7. **Security/RLS hardening** — run continuously, final pass before production.

---

## Risks / Tradeoffs

- **Sensitive data risk:** Document Vault and payroll need stricter permissions than current menu-level controls.
- **Supabase RLS complexity:** Must be verified with real roles, not only UI hiding.
- **Storage security:** Documents must not be in public buckets.
- **Audit volume:** Audit logs should be append-only and searchable, but not editable from UI.
- **Scope creep:** Do not build performance reviews or full payroll automation in phase 1 unless explicitly requested.

---

## Open Questions

1. Which roles should exist besides ADMIN/EMPLOYEE/MANAGER/OPERATOR?
2. Should employees see/download their own documents, or HR-only?
3. Which documents are required for every employee?
4. Should asset/access/offboarding checklists notify Telegram?
5. Do we want 2FA/admin re-auth now, or after vault MVP?

---

## MVP Definition

A usable Employee Vault MVP is complete when:

- Admin can open one employee and see Profile / Documents / Assets / Access / Checklist / Audit.
- Admin can upload a document with expiry and download via signed URL.
- Admin can assign/return one asset.
- Admin can mark access granted/revoked.
- Audit logs record sensitive actions.
- Non-admin users cannot access restricted screens or data.
- Build passes and production smoke test passes.
