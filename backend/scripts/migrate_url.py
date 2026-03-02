from sqlalchemy import text
from database import engine, SessionLocal

def rename_url_columns():
    print("Running migration to rename 'image_url' to 'url' and 'document_url' to 'url'...")
    db = SessionLocal()
    try:
        db.execute(text("ALTER TABLE land_photos RENAME COLUMN image_url TO url;"))
        print("Migration complete: 'image_url' renamed to 'url' in land_photos.")
        
        db.execute(text("ALTER TABLE land_documents RENAME COLUMN document_url TO url;"))
        print("Migration complete: 'document_url' renamed to 'url' in land_documents.")
        
        db.commit()
    except Exception as e:
        print(f"Error during migration (this can be ignored if columns were already renamed): {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    rename_url_columns()
