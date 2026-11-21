# AI Usage Documentation

This document describes how AI tools were used to build OpsHub and how the AI assistant feature works.

## AI in Development

We used AI coding tools (Claude Code, Cursor) throughout development:

- **Spec writing**: described modules in plain English, AI generated initial TypeScript interfaces and Prisma schema
- **Code generation**: AI produced route handlers, React components, and test scaffolds
- **Review process**: every AI-generated block was reviewed for correctness, security (SQL injection, auth bypass, data leakage), and style before merging
- **Test verification**: all generated code has corresponding tests that pass independently

### How we verified AI output

1. Read every generated function; checked edge cases (negative stock, role escalation, expired tokens)
2. Ran `npm run typecheck` and `npm run lint` after each generation
3. Wrote tests for business rules (leave balance, stock non-negative, task state transitions) and confirmed they catch regressions
4. Manual testing of each role's view to ensure data scoping works

## AI Assistant Feature

### Architecture

The AI assistant uses Google Gemini with function calling to answer natural language questions about the user's data.

### Tools (read-only, role-scoped)

| Tool | Roles | Description |
|------|-------|-------------|
| `get_my_leave_balance` | All | Returns the authenticated user's leave balance by type |
| `list_my_tasks` | All | Returns the user's assigned tasks with status and priority |
| `search_inventory` | All | Searches inventory items by name, SKU or category |
| `list_low_stock_items` | MANAGER, ADMIN | Items below their reorder level |
| `get_pending_approvals` | MANAGER, ADMIN | Leave requests awaiting the user's decision |

### Safety

- **No SQL generation**: tools call Prisma with parameterised queries only
- **No write operations**: the assistant cannot modify any data
- **Role enforcement**: each tool checks the caller's role before executing
- **Input sanitisation**: tool arguments validated with Zod before use
- **Rate limiting**: 10 AI requests per user per minute
- **Audit trail**: every AI query and response logged in AuditLog
- **Graceful fallback**: if Gemini is unavailable, the assistant returns a friendly error
