# One-Page Process Plan: Leave Approvals

> **Exercise**: Pick one manual process in any company and describe how you would build it as software, including one step where AI helps.

## The Manual Process Today

1. Employee emails their manager: "I'd like to take 3 days off next week"
2. Manager checks a shared spreadsheet to see remaining leave balance
3. Manager replies by email: approved or rejected
4. HR updates the spreadsheet manually
5. If approved, HR emails the team to inform them

**Problems**: lost emails, stale spreadsheets, no audit trail, no visibility for the employee.

## How We Built It in OpsHub

### Database Design

- `LeaveType` table: Annual (20 days), Sick (10 days), Casual (5 days)
- `LeaveRequest` table: status state machine (PENDING → APPROVED / REJECTED; PENDING → CANCELLED by requester)
- Balance = `leaveType.defaultDays − SUM(approved requests this year)`

### Workflow

1. **Employee** opens the Leave module → clicks "Apply" → picks type, dates, reason → submits
2. Server validates: dates in the future, sufficient balance, no overlapping approved leave
3. **Manager** sees pending requests for their direct reports → clicks Approve or Reject with an optional note
4. Server transitions status, records who decided and when, logs to AuditLog
5. Real-time Socket.IO notification to the employee: "Your leave was approved by [Manager]"

### Access Rules

- Employee sees only their own requests
- Manager sees their direct reports' requests and can decide
- Admin sees all requests across the company

### The AI Step

The AI assistant can answer:
- *"How many sick days do I have left?"* → calls `get_my_leave_balance`, filters to Sick type
- *"Who has pending leave requests?"* (manager) → calls `get_pending_approvals`, summarises

This replaces the manual step of opening a spreadsheet and counting rows. The AI reads from the same database, respects the same role rules, and cannot modify data.

### What Changed

| Before | After |
|--------|-------|
| Email thread | Structured form with validation |
| Shared spreadsheet | Real-time balance from the database |
| Manual HR update | Automatic on approval |
| No audit trail | Every action logged with who, when, what changed |
| No visibility | Employee sees status in real time |
