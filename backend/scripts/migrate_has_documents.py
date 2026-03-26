from sqlalchemy import text
from database import engine, SessionLocal

def add_has_documents_column():
    print("Running migration to add 'has_documents' column...")
    db = SessionLocal()
    try:
        db.execute(text("ALTER TABLE land_listings ADD COLUMN IF NOT EXISTS has_documents BOOLEAN DEFAULT FALSE;"))
        db.commit()
        print("Migration complete: 'has_documents' column added successfully.")
    except Exception as e:
        print(f"Error during migration: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_has_documents_column()
