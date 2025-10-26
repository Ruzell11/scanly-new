# routers/admin.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from database import get_db
from models import Company, User, Job, Application
from schemas import CompanyCreate, CompanyResponse, UserCreate, UserResponse, DashboardAnalytics
from auth import check_admin, get_password_hash

router = APIRouter(prefix="/admin", tags=["Admin"])


# ============================================
# COMPANY ENDPOINTS
# ============================================

@router.post("/companies", response_model=CompanyResponse)
def create_company(
        company: CompanyCreate,
        current_user: User = Depends(check_admin),
        db: Session = Depends(get_db)
):
    db_company = Company(**company.dict())
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company


@router.get("/companies", response_model=List[CompanyResponse])
def list_companies(
        current_user: User = Depends(check_admin),
        db: Session = Depends(get_db)
):
    companies = db.query(Company).all()
    return companies


@router.get("/companies/{company_id}", response_model=CompanyResponse)
def get_company(
        company_id: int,
        current_user: User = Depends(check_admin),
        db: Session = Depends(get_db)
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.put("/companies/{company_id}", response_model=CompanyResponse)
def update_company(
        company_id: int,
        company_update: CompanyCreate,
        current_user: User = Depends(check_admin),
        db: Session = Depends(get_db)
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Update company fields
    update_data = company_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(company, key, value)

    db.commit()
    db.refresh(company)
    return company


@router.delete("/companies/{company_id}")
def delete_company(
        company_id: int,
        current_user: User = Depends(check_admin),
        db: Session = Depends(get_db)
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Check if company has users
    users_count = db.query(User).filter(User.company_id == company_id).count()
    if users_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete company. {users_count} user(s) are associated with this company."
        )

    # Check if company has jobs
    jobs_count = db.query(Job).filter(Job.company_id == company_id).count()
    if jobs_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete company. {jobs_count} job(s) are associated with this company."
        )

    db.delete(company)
    db.commit()

    return {"message": "Company deleted successfully"}


# ============================================
# USER ENDPOINTS
# ============================================

# Pydantic model for user update (password optional)
class UserUpdate(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    company_id: Optional[int] = None


@router.post("/users", response_model=UserResponse)
def create_user(
        user: UserCreate,
        current_user: User = Depends(check_admin),
        db: Session = Depends(get_db)
):
    # Check if company exists if company_id provided
    if user.company_id:
        company = db.query(Company).filter(Company.id == user.company_id).first()
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")

    # Check if user already exists
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    user_dict = user.dict()
    user_dict["password"] = get_password_hash(user.password)

    db_user = User(**user_dict)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user


@router.get("/users", response_model=List[UserResponse])
def list_users(
        current_user: User = Depends(check_admin),
        db: Session = Depends(get_db)
):
    users = db.query(User).all()
    return users


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(
        user_id: int,
        current_user: User = Depends(check_admin),
        db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
        user_id: int,
        user_update: UserUpdate,
        current_user: User = Depends(get_db),
        db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if email is being changed and already exists
    if user_update.email and user_update.email != user.email:
        existing = db.query(User).filter(User.email == user_update.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already exists")

    # Check if company exists if company_id provided
    if user_update.company_id:
        company = db.query(Company).filter(Company.id == user_update.company_id).first()
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")

    # Update user fields
    update_data = user_update.dict(exclude_unset=True)

    # Handle password separately (hash it if provided)
    if 'password' in update_data and update_data['password']:
        update_data['password'] = get_password_hash(update_data['password'])
    elif 'password' in update_data and not update_data['password']:
        # Remove password from update if it's empty (keep existing password)
        del update_data['password']

    for key, value in update_data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}")
def delete_user(
        user_id: int,
        current_user: User = Depends(check_admin),
        db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent deleting yourself
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    db.delete(user)
    db.commit()

    return {"message": "User deleted successfully"}


# ============================================
# DASHBOARD ANALYTICS
# ============================================

@router.get("/dashboard", response_model=DashboardAnalytics)
def get_dashboard_analytics(
        current_user: User = Depends(check_admin),
        db: Session = Depends(get_db)
):
    total_companies = db.query(Company).count()
    total_users = db.query(User).count()
    total_jobs = db.query(Job).count()
    total_applications = db.query(Application).count()
    active_jobs = db.query(Job).filter(Job.status == "active").count()
    pending_applications = db.query(Application).filter(Application.status == "pending").count()

    return {
        "total_companies": total_companies,
        "total_users": total_users,
        "total_jobs": total_jobs,
        "total_applications": total_applications,
        "active_jobs": active_jobs,
        "pending_applications": pending_applications
    }