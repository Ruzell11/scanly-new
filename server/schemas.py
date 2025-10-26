from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


# ============================================
# COMPANY SCHEMAS
# ============================================

class CompanyCreate(BaseModel):
    name: str
    email: EmailStr
    description: Optional[str] = None
    industry: Optional[str] = None


class CompanyResponse(BaseModel):
    id: int
    name: str
    email: str
    description: Optional[str]
    industry: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================
# USER SCHEMAS
# ============================================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str  # 'admin', 'employer', 'applicant'
    company_id: Optional[int] = None


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    company_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================
# JOB SCHEMAS
# ============================================

class JobPostCreate(BaseModel):
    title: str
    description: str
    requirements: str
    location: str
    salary_range: Optional[str] = None
    employment_type: str  # 'full-time', 'part-time', 'contract'


class JobPostUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    location: Optional[str] = None
    salary_range: Optional[str] = None
    employment_type: Optional[str] = None
    status: Optional[str] = None  # 'active', 'closed'


class JobPostResponse(BaseModel):
    id: int
    title: str
    description: str
    requirements: str
    location: str
    salary_range: Optional[str]
    employment_type: str
    status: str
    company_id: int
    created_by: int
    apply_link: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class PublicJobResponse(BaseModel):
    """Public job details for anonymous applicants"""
    id: int
    title: str
    description: str
    requirements: str
    location: str
    salary_range: Optional[str]
    employment_type: str
    company_name: str
    company_industry: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================
# APPLICATION/CANDIDATE SCHEMAS
# ============================================

class ApplicationSubmit(BaseModel):
    """Schema for anonymous applicants to submit applications"""
    applicant_name: str = Field(..., min_length=2, max_length=255)
    applicant_email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    location: Optional[str] = Field(None, max_length=100)


    # Application Materials
    cover_letter: Optional[str] = Field(None, max_length=2000)
    # resume will be uploaded separately as a file


class ApplicationSubmitResponse(BaseModel):
    """Response after successful application submission"""
    message: str
    application_id: int
    job_title: str
    company_name: str
    ai_score: Optional[float]
    status: str
    applied_at: datetime

    class Config:
        from_attributes = True


class ApplicationResponse(BaseModel):
    """Full application response for employers"""
    id: int
    job_id: int
    applicant_name: str
    applicant_email: str
    resume_url: str
    ai_score: Optional[float]
    ai_feedback: Optional[str]
    status: str
    employer_notes: Optional[str]
    applied_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class CandidateListResponse(BaseModel):
    """Simplified candidate info for list view"""
    id: int
    full_name: str
    email: str

    job_id: int
    job_title: str
    status: str
    ai_score: Optional[float]
    applied_at: datetime


    class Config:
        from_attributes = True


class CandidateDetailResponse(BaseModel):
    """Detailed candidate info for detail view"""
    id: int

    # Personal Info
    full_name: str
    email: str




    # Application Info
    job_id: int
    job_title: str
    resume_url: str

    # AI Analysis
    ai_score: Optional[float]
    ai_feedback: Optional[str]


    # Status & Timeline
    status: str
    applied_at: datetime
    updated_at: Optional[datetime]

    employer_notes: Optional[str]

    # Company Info
    company_name: str
    company_id: int

    class Config:
        from_attributes = True


class ApplicationStatusUpdate(BaseModel):
    """Schema for updating application status"""
    status: str = Field(..., pattern="^(pending|reviewing|shortlisted|rejected|hired)$")
    notes: Optional[str] = Field(None, max_length=1000)


class BulkStatusUpdate(BaseModel):
    """Schema for bulk updating multiple applications"""
    application_ids: List[int]
    status: str = Field(..., pattern="^(pending|reviewing|shortlisted|rejected|hired)$")
    notes: Optional[str] = None


class CandidateStatsResponse(BaseModel):
    """Statistics for candidate dashboard"""
    total_applications: int
    pending: int
    reviewing: int
    shortlisted: int
    rejected: int
    hired: int
    avg_ai_score: Optional[float]
    recent_applications: int  # Last 7 days

    class Config:
        from_attributes = True


# ============================================
# AUTH SCHEMAS
# ============================================

class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


# ============================================
# DASHBOARD SCHEMAS
# ============================================

class DashboardAnalytics(BaseModel):
    total_companies: int
    total_users: int
    total_jobs: int
    total_applications: int
    active_jobs: int
    pending_applications: int


class EmployerDashboard(BaseModel):
    """Employer-specific dashboard stats"""
    total_jobs: int
    active_jobs: int
    total_applications: int
    pending_applications: int
    reviewing_applications: int
    shortlisted_applications: int
    rejected_applications: int
    hired_applications: int
    recent_applications: int  # Last 7 days
    avg_ai_score: Optional[float]