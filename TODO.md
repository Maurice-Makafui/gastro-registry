- [x] Enumerate/inspect all Alembic migrations that Alembic loads
- [x] Verify revision chain integrity (revision/down_revision/branch_labels/depends_on)
- [ ] Fix any remaining Git diff markers and syntax issues in migrations
- [ ] Fix PostgreSQL ENUM handling so each ENUM type is created exactly once (guarded)
- [ ] Replace any `index=True` in Alembic table definitions with explicit `op.create_index` and ensure downgrades drop indexes
- [ ] Run verification: `alembic upgrade head` and `alembic downgrade base` on a clean PostgreSQL
- [ ] Ensure Docker backend startup runs migrations successfully without restart loop

