import logging
from sqlalchemy import text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)

def run_migrations(engine: Engine):
    """
    Safely applies additive migrations to existing tables (e.g., PostgreSQL or SQLite).
    Uses IF NOT EXISTS / idempotent ALTER TABLE commands to ensure existing databases
    are updated without data loss.
    """
    dialect_name = engine.dialect.name
    try:
        with engine.connect() as conn:
            with conn.begin():
                if dialect_name == "postgresql":
                    # tickets table additions
                    conn.execute(text("ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assignment_mode VARCHAR(20) DEFAULT NULL;"))
                    
                    # ticket_history table alterations & additions
                    conn.execute(text("ALTER TABLE ticket_history ALTER COLUMN changed_by_id DROP NOT NULL;"))
                    conn.execute(text("ALTER TABLE ticket_history ADD COLUMN IF NOT EXISTS action_type VARCHAR(50) DEFAULT NULL;"))
                    conn.execute(text("ALTER TABLE ticket_history ADD COLUMN IF NOT EXISTS previous_priority VARCHAR(50) DEFAULT NULL;"))
                    conn.execute(text("ALTER TABLE ticket_history ADD COLUMN IF NOT EXISTS new_priority VARCHAR(50) DEFAULT NULL;"))
                    conn.execute(text("ALTER TABLE ticket_history ADD COLUMN IF NOT EXISTS previous_assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL;"))
                    conn.execute(text("ALTER TABLE ticket_history ADD COLUMN IF NOT EXISTS new_assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL;"))
                elif dialect_name == "sqlite":
                    # For SQLite, check if column exists before adding
                    res = conn.execute(text("PRAGMA table_info(tickets);")).fetchall()
                    cols = [r[1] for r in res]
                    if "assignment_mode" not in cols:
                        conn.execute(text("ALTER TABLE tickets ADD COLUMN assignment_mode VARCHAR(20) DEFAULT NULL;"))
                    
                    hist_res = conn.execute(text("PRAGMA table_info(ticket_history);")).fetchall()
                    hist_cols = [r[1] for r in hist_res]
                    for col_name, col_type in [
                        ("action_type", "VARCHAR(50)"),
                        ("previous_priority", "VARCHAR(50)"),
                        ("new_priority", "VARCHAR(50)"),
                        ("previous_assignee_id", "INTEGER"),
                        ("new_assignee_id", "INTEGER"),
                    ]:
                        if col_name not in hist_cols:
                            conn.execute(text(f"ALTER TABLE ticket_history ADD COLUMN {col_name} {col_type} DEFAULT NULL;"))
    except Exception as exc:
        logger.warning(f"Database migration check encountered non-fatal error: {exc}")
