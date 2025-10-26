# init_db.py
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine, SessionLocal
from models import Base, User
from auth import get_password_hash


def init_database():
    """Initialize database with tables and default admin user"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✓ Tables created successfully")

    db = SessionLocal()

    try:
        # Check if admin exists
        admin = db.query(User).filter(User.email == "admin@example.com").first()
        if not admin:
            admin_user = User(
                email="admin@example.com",
                password=get_password_hash("admin123"),
                full_name="System Administrator",
                role="admin"
            )
            db.add(admin_user)
            db.commit()
            print("✓ Admin user created successfully")
            print("  Email: admin@example.com")
            print("  Password: admin123")
        else:
            print("✓ Admin user already exists")

    except Exception as e:
        print(f"✗ Error: {e}")
        db.rollback()
    finally:
        db.close()

    print("\nDatabase initialization complete!")
    print("You can now run the application with: python main.py")


if __name__ == "__main__":
    init_database()