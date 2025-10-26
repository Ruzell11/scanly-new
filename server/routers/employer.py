# ============================================
# FILE: routers/employer.py (COMPLETE UPDATE)
# ============================================
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, asc
from typing import List, Optional
from datetime import datetime, timedelta

from database import get_db
from models import Job, Application, User, Company
from schemas import (
    JobPostCreate, JobPostUpdate, JobPostResponse,
    ApplicationResponse, CandidateListResponse, CandidateDetailResponse,
    ApplicationStatusUpdate, CandidateStatsResponse, BulkStatusUpdate
)
from auth import check_employer
from utils import generate_apply_link

router = APIRouter(prefix="/employer", tags=["Employer"])


# ============================================
# JOB ENDPOINTS
# ============================================

@router.post("/jobs", response_model=JobPostResponse)
def create_job_post(
        job: JobPostCreate,
        current_user: User = Depends(check_employer),
        db: Session = Depends(get_db)
):
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="User must be associated with a company")

    job_dict = job.dict()
    job_dict["company_id"] = current_user.company_id
    job_dict["created_by"] = current_user.id
    job_dict["status"] = "active"

    db_job = Job(**job_dict)
    db.add(db_job)
    db.commit()
    db.refresh(db_job)

    # Generate and update apply link
    apply_link = generate_apply_link(db_job.id)
    db_job.apply_link = apply_link
    db.commit()
    db.refresh(db_job)

    return db_job


@router.get("/jobs", response_model=List[JobPostResponse])
def list_my_jobs(
        current_user: User = Depends(check_employer),
        db: Session = Depends(get_db)
):
    if not current_user.company_id:
        return []

    jobs = db.query(Job).filter(Job.company_id == current_user.company_id).all()
    return jobs


@router.get("/jobs/{job_id}", response_model=JobPostResponse)
def get_job(
        job_id: int,
        current_user: User = Depends(check_employer),
        db: Session = Depends(get_db)
):
    job = db.query(Job).filter(
        Job.id == job_id,
        Job.company_id == current_user.company_id
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return job


@router.put("/jobs/{job_id}", response_model=JobPostResponse)
def update_job_post(
        job_id: int,
        job_update: JobPostUpdate,
        current_user: User = Depends(check_employer),
        db: Session = Depends(get_db)
):
    job = db.query(Job).filter(
        Job.id == job_id,
        Job.company_id == current_user.company_id
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    update_data = job_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(job, key, value)

    db.commit()
    db.refresh(job)

    return job


@router.delete("/jobs/{job_id}")
def delete_job_post(
        job_id: int,
        current_user: User = Depends(check_employer),
        db: Session = Depends(get_db)
):
    job = db.query(Job).filter(
        Job.id == job_id,
        Job.company_id == current_user.company_id
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    db.delete(job)
    db.commit()

    return {"message": "Job deleted successfully"}


# ============================================
# CANDIDATES/APPLICATION ENDPOINTS (NEW)
# ============================================

@router.get("/candidates", response_model=List[CandidateListResponse])
def get_all_candidates(
        status: Optional[str] = Query(None, pattern="^(pending|reviewing|shortlisted|rejected|hired)$"),
        job_id: Optional[int] = None,
        min_ai_score: Optional[float] = Query(None, ge=0, le=100),
        search: Optional[str] = None,
        sort_by: str = Query("applied_at", pattern="^(applied_at|ai_score|applicant_name)$"),
        sort_order: str = Query("desc", pattern="^(asc|desc)$"),
        current_user: User = Depends(check_employer),
        db: Session = Depends(get_db)
):
    """
    Get all candidates/applications for the employer's company
    This is the main endpoint for the candidates page
    """
    # Debug: Log the request
    print(f"[DEBUG] Fetching candidates for company_id: {current_user.company_id}")

    if not current_user.company_id:
        print("[DEBUG] No company_id found, returning empty list")
        return []

    # Get all job IDs for the company
    job_ids = db.query(Job.id).filter(Job.company_id == current_user.company_id).all()
    job_ids = [job[0] for job in job_ids]

    print(f"[DEBUG] Found {len(job_ids)} jobs for company: {job_ids}")

    if not job_ids:
        print("[DEBUG] No jobs found, returning empty list")
        return []

    # Check if there are any applications at all
    total_applications = db.query(Application).filter(Application.job_id.in_(job_ids)).count()
    print(f"[DEBUG] Total applications for these jobs: {total_applications}")

    # Base query with join to get job title
    query = db.query(
        Application.id,
        Application.applicant_name.label('full_name'),
        Application.applicant_email.label('email'),

        Application.job_id,
        Job.title.label('job_title'),
        Application.status,
        Application.ai_score,
        Application.applied_at,
    ).join(Job, Application.job_id == Job.id).filter(
        Application.job_id.in_(job_ids)
    )

    # Apply filters
    if status:
        print(f"[DEBUG] Filtering by status: {status}")
        query = query.filter(Application.status == status)

    if job_id:
        print(f"[DEBUG] Filtering by job_id: {job_id}")
        query = query.filter(Application.job_id == job_id)

    if min_ai_score is not None:
        print(f"[DEBUG] Filtering by min_ai_score: {min_ai_score}")
        query = query.filter(Application.ai_score >= min_ai_score)

    if search:
        print(f"[DEBUG] Searching for: {search}")
        search_term = f"%{search}%"
        query = query.filter(
            (Application.applicant_name.ilike(search_term)) |
            (Application.applicant_email.ilike(search_term)) |
            (Job.title.ilike(search_term))
        )

    # Apply sorting
    if sort_by == "applied_at":
        query = query.order_by(desc(Application.applied_at) if sort_order == "desc" else asc(Application.applied_at))
    elif sort_by == "ai_score":
        query = query.order_by(desc(Application.ai_score) if sort_order == "desc" else asc(Application.ai_score))
    elif sort_by == "applicant_name":
        query = query.order_by(
            desc(Application.applicant_name) if sort_order == "desc" else asc(Application.applicant_name))

    candidates = query.all()
    print(f"[DEBUG] Found {len(candidates)} candidates after filters")

    # Convert to list of dicts for response
    result = [
        {
            "id": c.id,
            "full_name": c.full_name,
            "email": c.email,
            "job_id": c.job_id,
            "job_title": c.job_title,
            "status": c.status,
            "ai_score": c.ai_score,
            "applied_at": c.applied_at,

        }
        for c in candidates
    ]

    print(f"[DEBUG] Returning {len(result)} candidates")
    return result

@router.get("/candidates/{candidate_id}", response_model=CandidateDetailResponse)
def get_candidate_details(
        candidate_id: int,
        current_user: User = Depends(check_employer),
        db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific candidate
    Used when clicking "View Details" on a candidate
    """
    # Verify the application belongs to a job in the employer's company
    application = db.query(Application).join(Job).filter(
        Application.id == candidate_id,
        Job.company_id == current_user.company_id
    ).options(joinedload(Application.job)).first()

    if not application:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Get company info
    company = db.query(Company).filter(Company.id == application.job.company_id).first()

    return {
        "id": application.id,
        "full_name": application.applicant_name,
        "email": application.applicant_email,

        "job_id": application.job_id,
        "job_title": application.job.title,
        "cover_letter": application.cover_letter,
        "resume_url": application.resume_url,
        "ai_score": application.ai_score,
        "ai_feedback": application.ai_feedback,

        "status": application.status,
        "applied_at": application.applied_at,
        "updated_at": application.updated_at,

        "employer_notes": application.employer_notes,
        "company_name": company.name if company else "Unknown",
        "company_id": application.job.company_id
    }


@router.put("/candidates/{candidate_id}/status")
def update_candidate_status(
    candidate_id: int,
    status_update: ApplicationStatusUpdate,
    current_user: User = Depends(check_employer),
    db: Session = Depends(get_db)
):
    """
    Update the status of a candidate's application.
    Called when employer changes status in the UI.
    """

    # Ensure the application belongs to a job under this employer's company
    application = db.query(Application).join(Job).filter(
        Application.id == candidate_id,
        Job.company_id == current_user.company_id
    ).first()

    if not application:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Track old status for audit or logging
    old_status = application.status

    # Update the status and feedback fields
    application.status = status_update.status
    application.ai_feedback = status_update.notes or application.ai_feedback
    application.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(application)

    return {
        "message": "Candidate status updated successfully",
        "candidate_id": candidate_id,
        "old_status": old_status,
        "new_status": application.status,
        "updated_at": application.updated_at
    }


@router.post("/candidates/bulk-status")
def bulk_update_status(
        bulk_update: BulkStatusUpdate,
        current_user: User = Depends(check_employer),
        db: Session = Depends(get_db)
):
    """
    Update status for multiple candidates at once
    Used for bulk actions in the UI
    """
    # Verify all applications belong to jobs in the employer's company
    applications = db.query(Application).join(Job).filter(
        Application.id.in_(bulk_update.application_ids),
        Job.company_id == current_user.company_id
    ).all()

    if len(applications) != len(bulk_update.application_ids):
        raise HTTPException(status_code=404, detail="Some candidates not found")

    updated_count = 0
    for application in applications:
        application.status = bulk_update.status
        application.updated_at = datetime.utcnow()
        if bulk_update.notes:
            application.employer_notes = bulk_update.notes
        updated_count += 1

    db.commit()

    return {
        "message": f"Updated {updated_count} applications",
        "updated_count": updated_count,
        "new_status": bulk_update.status
    }


@router.get("/candidates/stats", response_model=CandidateStatsResponse)
def get_candidate_stats(
        current_user: User = Depends(check_employer),
        db: Session = Depends(get_db)
):
    """
    Get statistics about candidates/applications
    Used for dashboard and overview metrics
    """
    if not current_user.company_id:
        return {
            "total_applications": 0,
            "pending": 0,
            "reviewing": 0,
            "shortlisted": 0,
            "rejected": 0,
            "hired": 0,
            "avg_ai_score": None,
            "recent_applications": 0
        }

    # Get all job IDs for the company
    job_ids = db.query(Job.id).filter(Job.company_id == current_user.company_id).all()
    job_ids = [job[0] for job in job_ids]

    if not job_ids:
        return {
            "total_applications": 0,
            "pending": 0,
            "reviewing": 0,
            "shortlisted": 0,
            "rejected": 0,
            "hired": 0,
            "avg_ai_score": None,
            "recent_applications": 0
        }

    # Get counts by status
    total_applications = db.query(Application).filter(Application.job_id.in_(job_ids)).count()
    pending = db.query(Application).filter(Application.job_id.in_(job_ids), Application.status == "pending").count()
    reviewing = db.query(Application).filter(Application.job_id.in_(job_ids), Application.status == "reviewing").count()
    shortlisted = db.query(Application).filter(Application.job_id.in_(job_ids), Application.status == "shortlisted").count()
    rejected = db.query(Application).filter(Application.job_id.in_(job_ids), Application.status == "rejected").count()
    hired = db.query(Application).filter(Application.job_id.in_(job_ids), Application.status == "hired").count()

    # Average AI score
    avg_score = db.query(func.avg(Application.ai_score)).filter(
        Application.job_id.in_(job_ids),
        Application.ai_score.isnot(None)
    ).scalar()

    # Recent applications (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_applications = db.query(Application).filter(
        Application.job_id.in_(job_ids),
        Application.applied_at >= seven_days_ago
    ).count()

    return {
        "total_applications": total_applications,
        "pending": pending,
        "reviewing": reviewing,
        "shortlisted": shortlisted,
        "rejected": rejected,
        "hired": hired,
        "avg_ai_score": round(avg_score, 2) if avg_score else None,
        "recent_applications": recent_applications
    }


# ============================================
# JOB-SPECIFIC APPLICATION ENDPOINTS
# ============================================

@router.get("/jobs/{job_id}/applications", response_model=List[ApplicationResponse])
def get_job_applications(
        job_id: int,
        current_user: User = Depends(check_employer),
        db: Session = Depends(get_db)
):
    """Get all applications for a specific job"""
    # Verify job belongs to user's company
    job = db.query(Job).filter(
        Job.id == job_id,
        Job.company_id == current_user.company_id
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    applications = db.query(Application).filter(Application.job_id == job_id).all()
    return applications


@router.get("/jobs/{job_id}/shortlisted", response_model=List[ApplicationResponse])
def get_shortlisted_candidates(
        job_id: int,
        min_score: float = 70.0,
        current_user: User = Depends(check_employer),
        db: Session = Depends(get_db)
):
    """Get shortlisted candidates for a specific job"""
    # Verify job belongs to user's company
    job = db.query(Job).filter(
        Job.id == job_id,
        Job.company_id == current_user.company_id
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    applications = db.query(Application).filter(
        Application.job_id == job_id,
        Application.ai_score >= min_score
    ).order_by(Application.ai_score.desc()).all()

    return applications


@router.patch("/applications/{application_id}/status")
def update_application_status(
        application_id: int,
        status: str,
        current_user: User = Depends(check_employer),
        db: Session = Depends(get_db)
):
    """Legacy endpoint - kept for backwards compatibility"""
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    # Verify job belongs to user's company
    job = db.query(Job).filter(
        Job.id == application.job_id,
        Job.company_id == current_user.company_id
    ).first()

    if not job:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Validate status - updated to include new statuses
    valid_statuses = ['pending', 'reviewing', 'shortlisted', 'rejected', 'hired']
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")

    application.status = status
    application.updated_at = datetime.utcnow()
    db.commit()

    return {"message": "Application status updated", "status": status}


# ============================================
# DASHBOARD/STATS
# ============================================

@router.get("/stats")
@router.get("/stats")
def get_employer_stats(
    current_user: User = Depends(check_employer),
    db: Session = Depends(get_db)
):
    """Get overall employer dashboard statistics, including hired count"""
    if not current_user.company_id:
        return {
            "total_jobs": 0,
            "active_jobs": 0,
            "total_applications": 0,
            "pending_applications": 0,
            "reviewing_applications": 0,
            "shortlisted_applications": 0,
            "hired_applications": 0
        }

    # Get all jobs for the company
    jobs = db.query(Job).filter(Job.company_id == current_user.company_id).all()
    job_ids = [job.id for job in jobs]

    total_jobs = len(jobs)
    active_jobs = len([job for job in jobs if job.status == "active"])

    # Initialize counts
    total_applications = 0
    pending_applications = 0
    reviewing_applications = 0
    shortlisted_applications = 0
    hired_applications = 0

    if job_ids:
        total_applications = db.query(Application).filter(Application.job_id.in_(job_ids)).count()
        pending_applications = db.query(Application).filter(
            Application.job_id.in_(job_ids),
            Application.status == "pending"
        ).count()
        reviewing_applications = db.query(Application).filter(
            Application.job_id.in_(job_ids),
            Application.status == "reviewing"
        ).count()
        shortlisted_applications = db.query(Application).filter(
            Application.job_id.in_(job_ids),
            Application.status == "shortlisted"
        ).count()
        hired_applications = db.query(Application).filter(
            Application.job_id.in_(job_ids),
            Application.status == "hired"
        ).count()

    return {
        "total_jobs": total_jobs,
        "active_jobs": active_jobs,
        "total_applications": total_applications,
        "pending_applications": pending_applications,
        "reviewing_applications": reviewing_applications,
        "shortlisted_applications": shortlisted_applications,
        "hired_applications": hired_applications
    }
