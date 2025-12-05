# ============================================
# FILE: routers/employer.py (WITH EMAIL ENDPOINT)
# ============================================
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, asc
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr

from database import get_db
from models import Job, Application, User, Company
from schemas import (
    JobPostCreate, JobPostUpdate, JobPostResponse,
    ApplicationResponse, CandidateListResponse, CandidateDetailResponse,
    ApplicationStatusUpdate, CandidateStatsResponse, BulkStatusUpdate, ApplicationWithApplicant
)
from auth import check_employer
from utils import generate_apply_link
from config import settings
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

router = APIRouter(prefix="/employer", tags=["Employer"])


# ============================================
# EMAIL SCHEMAS
# ============================================

class SendEmailRequest(BaseModel):
    subject: str
    message: str
    recipient_email: EmailStr
    recipient_name: str


class SendEmailResponse(BaseModel):
    success: bool
    message: str


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
        db: Session = Depends(get_db),
        status: Optional[str] = None
):
     """Get all jobs for the current employer (including suspended)"""
     query = db.query(Job).filter(Job.company_id == current_user.company_id)
    
     if status:
        query = query.filter(Job.status == status)
    
     jobs = query.order_by(Job.created_at.desc()).all()
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
    """Employer can update their jobs, but cannot change suspended status"""
    job = db.query(Job).filter(
        Job.id == job_id,
        Job.company_id == current_user.company_id
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Prevent employer from unsuspending jobs
    if job.status == "suspended" and job_update.status != "suspended":
        raise HTTPException(
            status_code=403, 
            detail="Cannot modify suspended jobs. Please contact support."
        )
    
    # Prevent employer from setting status to suspended (only admin can)
    if job_update.status == "suspended":
        raise HTTPException(
            status_code=403,
            detail="You cannot suspend jobs yourself. Contact support if needed."
        )
    
    # Update job fields
    for field, value in job_update.dict(exclude_unset=True).items():
        setattr(job, field, value)
    
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
# CANDIDATES/APPLICATION ENDPOINTS
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
    """Get detailed information about a specific candidate/application"""
    application = db.query(Application).filter(Application.id == candidate_id).first()

    if not application:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Verify the application belongs to a job in user's company
    job = db.query(Job).filter(
        Job.id == application.job_id,
        Job.company_id == current_user.company_id
    ).first()

    if not job:
        raise HTTPException(status_code=403, detail="Not authorized to view this candidate")

    return {
        "id": application.id,
        "full_name": application.applicant_name,
        "email": application.applicant_email,
        "phone": application.applicant_phone,
        "resume_url": application.resume_url,
        "cover_letter": application.cover_letter,
        "status": application.status,
        "applied_at": application.applied_at,
        "job_id": application.job_id,
        "job_title": job.title,
        "experience_years": application.experience_years,
        "education": application.education,
        "location": application.location,
        "skills": application.skills,
        "ai_score": application.ai_score,
        "ai_summary": application.ai_analysis
    }


@router.put("/candidates/{candidate_id}/status", response_model=dict)
def update_candidate_status(
        candidate_id: int,
        status_update: ApplicationStatusUpdate,
        current_user: User = Depends(check_employer),
        db: Session = Depends(get_db)
):
    """Update the status of a candidate/application"""
    application = db.query(Application).filter(Application.id == candidate_id).first()

    if not application:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Verify the application belongs to a job in user's company
    job = db.query(Job).filter(
        Job.id == application.job_id,
        Job.company_id == current_user.company_id
    ).first()

    if not job:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Update status
    application.status = status_update.status
    application.updated_at = datetime.utcnow()

    # Update notes if provided
    if status_update.notes:
        application.employer_notes = status_update.notes

    db.commit()

    return {
        "message": "Status updated successfully",
        "status": application.status,
        "candidate_id": candidate_id
    }


@router.post("/candidates/bulk-update", response_model=dict)
def bulk_update_candidates(
        bulk_update: BulkStatusUpdate,
        current_user: User = Depends(check_employer),
        db: Session = Depends(get_db)
):
    """Update status for multiple candidates at once"""
    if not bulk_update.candidate_ids:
        raise HTTPException(status_code=400, detail="No candidate IDs provided")

    # Get all applications
    applications = db.query(Application).filter(
        Application.id.in_(bulk_update.candidate_ids)
    ).all()

    if not applications:
        raise HTTPException(status_code=404, detail="No candidates found")

    # Verify all applications belong to jobs in user's company
    job_ids = [app.job_id for app in applications]
    jobs = db.query(Job).filter(
        Job.id.in_(job_ids),
        Job.company_id == current_user.company_id
    ).all()

    if len(jobs) != len(set(job_ids)):
        raise HTTPException(status_code=403, detail="Not authorized to update some candidates")

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
# EMAIL ENDPOINT (NEW)
# ============================================

def send_custom_email_to_candidate(
    recipient_email: str,
    recipient_name: str,
    subject: str,
    message: str,
    sender_name: str,
    sender_email: str
):
    """Send custom email to candidate"""
    try:
        # Get email configuration
        smtp_server = settings.SMTP_SERVER
        smtp_port = settings.SMTP_PORT
        smtp_username = settings.SMTP_USERNAME
        smtp_password = settings.SMTP_PASSWORD
        from_email = settings.FROM_EMAIL
        from_name = settings.FROM_NAME
        
        # Validate email configuration
        if not all([smtp_username, smtp_password, from_email]):
            print("ERROR: Email configuration is incomplete")
            return False

        # Create message
        email_message = MIMEMultipart("alternative")
        email_message["Subject"] = subject
        email_message["From"] = f"{from_name} <{from_email}>"
        email_message["To"] = recipient_email
        email_message["Reply-To"] = sender_email  # Allow candidate to reply directly to employer

        # Create HTML email
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    margin: 0;
                    padding: 0;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f5f5f5;
                }}
                .content {{
                    background-color: white;
                    padding: 40px;
                    border-radius: 12px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }}
                .header {{
                    text-align: center;
                    padding-bottom: 30px;
                    border-bottom: 3px solid #3F5357;
                    margin-bottom: 30px;
                }}
                h1 {{
                    color: #2C2C2C;
                    margin: 0;
                    font-size: 24px;
                    font-weight: 600;
                }}
                .message-content {{
                    background-color: #f8f9fa;
                    padding: 20px;
                    border-radius: 8px;
                    margin: 20px 0;
                    white-space: pre-line;
                    border-left: 4px solid #3F5357;
                }}
                .footer {{
                    text-align: center;
                    margin-top: 40px;
                    padding-top: 30px;
                    border-top: 2px solid #e9ecef;
                    color: #6c757d;
                    font-size: 13px;
                }}
                .signature {{
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e9ecef;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="content">
                    <div class="header">
                        <h1>{subject}</h1>
                    </div>
                    
                    <p style="font-size: 16px;">Dear {recipient_name},</p>
                    
                    <div class="message-content">
                        {message}
                    </div>
                    
                    <div class="signature">
                        <p style="margin: 5px 0;"><strong>{sender_name}</strong></p>
                        <p style="margin: 5px 0; color: #666;">{sender_email}</p>
                        <p style="margin: 5px 0; color: #666;">{from_name}</p>
                    </div>
                    
                    <div class="footer">
                        <p>This email was sent from {from_name} recruitment system.</p>
                        <p>&copy; 2025 {from_name}. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

        # Plain text version
        text_body = f"""
{subject}

Dear {recipient_name},

{message}

---
{sender_name}
{sender_email}
{from_name}

---
This email was sent from {from_name} recruitment system.
© 2025 {from_name}. All rights reserved.
        """

        # Attach both versions
        part1 = MIMEText(text_body, "plain")
        part2 = MIMEText(html_body, "html")
        email_message.attach(part1)
        email_message.attach(part2)

        # Send email
        print(f"📧 Sending custom email to {recipient_email}...")
        
        try:
            server = smtplib.SMTP(smtp_server, smtp_port, timeout=30)
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.send_message(email_message)
            server.quit()
            
            print(f"✅ Custom email sent successfully to {recipient_email}")
            return True
            
        except Exception as e:
            print(f"❌ SMTP Error: {str(e)}")
            return False
        
    except Exception as e:
        print(f"❌ Error sending custom email: {str(e)}")
        return False


@router.post("/candidates/{candidate_id}/send-email", response_model=SendEmailResponse)
async def send_email_to_candidate(
    candidate_id: int,
    request: SendEmailRequest,
    current_user: User = Depends(check_employer),
    db: Session = Depends(get_db)
):
    """
    Send a custom email to a candidate
    Requires employer or admin role
    """
    try:
        # Verify candidate exists and belongs to user's company
        application = db.query(Application).filter(Application.id == candidate_id).first()
        
        if not application:
            raise HTTPException(status_code=404, detail="Candidate not found")

        # Verify the application belongs to a job in user's company
        job = db.query(Job).filter(
            Job.id == application.job_id,
            Job.company_id == current_user.company_id
        ).first()

        if not job:
            raise HTTPException(status_code=403, detail="Not authorized to email this candidate")

        # Get sender info
        sender_name = getattr(current_user, 'full_name', getattr(current_user, 'name', 'HR Manager'))
        sender_email = current_user.email

        # Send email
        email_sent = send_custom_email_to_candidate(
            recipient_email=request.recipient_email,
            recipient_name=request.recipient_name,
            subject=request.subject,
            message=request.message,
            sender_name=sender_name,
            sender_email=sender_email
        )

        if not email_sent:
            raise HTTPException(
                status_code=500,
                detail="Failed to send email. Please check email configuration."
            )

        return SendEmailResponse(
            success=True,
            message="Email sent successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in send_email_to_candidate: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while sending the email"
        )


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

@router.get("/jobs/{job_id}/applications", response_model=List[ApplicationWithApplicant])
def get_job_applications(
    job_id: int,
    current_user: User = Depends(check_employer),
    db: Session = Depends(get_db),
    status: Optional[str] = None
):
    """Get all applications for a specific job"""
    # Verify job belongs to employer's company
    job = db.query(Job).filter(
        Job.id == job_id,
        Job.company_id == current_user.company_id
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    query = db.query(Application).filter(Application.job_id == job_id)
    
    if status:
        query = query.filter(Application.status == status)
    
    applications = query.order_by(Application.applied_at.desc()).all()
    
    # Return with applicant details
    return [
        {
            **app.__dict__,
            "applicant_name": app.user.full_name,
            "applicant_email": app.user.email,
            "job_title": app.job.title
        }
        for app in applications
    ]

@router.patch("/applications/{application_id}/status")
def update_application_status(
    application_id: int,
    status: str,  # Query parameter
    current_user: User = Depends(check_employer),
    db: Session = Depends(get_db)
):
    """Update application status"""
    application = db.query(Application).join(Job).filter(
        Application.id == application_id,
        Job.company_id == current_user.company_id
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    if status not in ["pending", "shortlisted", "rejected", "hired"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    application.status = status
    db.commit()
    db.refresh(application)
    
    return {"message": "Application status updated successfully", "status": status}