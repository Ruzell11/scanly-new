# ============================================
# FILE: routers/applicant.py (Refactored)
# ============================================

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import EmailStr
from typing import Optional, List
import json
import os
from datetime import datetime

from database import get_db
from models import Job, Application, Company
from schemas import PublicJobResponse, ApplicationSubmitResponse
from utils import ai_candidate_scoring

router = APIRouter(tags=["Applicant"])


@router.get("/jobs/{job_id}/public", response_model=PublicJobResponse)
def get_public_job_details(job_id: int, db: Session = Depends(get_db)):
    """
    Get public job details for anonymous applicants
    No authentication required
    """
    job = db.query(Job).filter(Job.id == job_id, Job.status == "active").first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or no longer active")

    company = db.query(Company).filter(Company.id == job.company_id).first()

    return {
        "id": job.id,
        "title": job.title,
        "description": job.description,
        "requirements": job.requirements,
        "location": job.location,
        "salary_range": job.salary_range,
        "employment_type": job.employment_type,
        "company_name": company.name if company else "Unknown Company",
        "company_industry": company.industry if company else None,
        "created_at": job.created_at
    }


@router.post("/apply/{job_id}", response_model=ApplicationSubmitResponse)
async def submit_application(
    job_id: int,
    applicant_name: str = Form(...),
    applicant_email: EmailStr = Form(...),
    resume: UploadFile = File(...),
    phone: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    experience_years: Optional[int] = Form(None),
    education: Optional[str] = Form(None),
    skills: Optional[str] = Form(None),
    linkedin_url: Optional[str] = Form(None),
    portfolio_url: Optional[str] = Form(None),
    cover_letter: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Submit a job application - NO AUTHENTICATION REQUIRED
    Anonymous applicants can apply without creating an account
    """
    # Verify job exists
    job = db.query(Job).filter(Job.id == job_id, Job.status == "active").first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or closed")

    company = db.query(Company).filter(Company.id == job.company_id).first()

    # Prevent duplicate applications
    existing_application = db.query(Application).filter(
        Application.job_id == job_id,
        Application.applicant_email == applicant_email
    ).first()

    if existing_application:
        raise HTTPException(status_code=400, detail="You have already applied for this position")

    # Validate resume file type
    if not resume.filename.lower().endswith(('.pdf', '.doc', '.docx')):
        raise HTTPException(status_code=400, detail="Resume must be in PDF, DOC, or DOCX format")

    # Read and save resume locally
    resume_content = await resume.read()
    upload_dir = "uploads/resumes"
    os.makedirs(upload_dir, exist_ok=True)

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe_email = applicant_email.replace('@', '_at_').replace('.', '_')
    safe_filename = f"{job_id}_{safe_email}_{timestamp}_{resume.filename}"
    file_path = os.path.join(upload_dir, safe_filename)

    with open(file_path, "wb") as f:
        f.write(resume_content)

    resume_url = f"/{upload_dir}/{safe_filename}"

    # Extract readable text from the resume
    from utils import extract_text_from_resume, ai_candidate_scoring  # ✅ make sure both exist
    resume_text = extract_text_from_resume(file_path)

    # Parse skills (accept JSON array or comma-separated)
    skills_list = None
    if skills:
        try:
            skills_list = json.loads(skills)
        except Exception:
            skills_list = [s.strip() for s in skills.split(',') if s.strip()]

    # Prepare job context
    job_description = f"""
Job Title: {job.title}
Location: {job.location}
Employment Type: {job.employment_type}

Description:
{job.description}

Requirements:
{job.requirements}
"""

    # Prepare candidate context
    candidate_profile = f"""
Candidate Name: {applicant_name}
Email: {applicant_email}
Phone: {phone or 'Not provided'}
Location: {location or 'Not specified'}
Experience: {experience_years or 0} years
Education: {education or 'Not specified'}
Skills: {', '.join(skills_list) if skills_list else 'Not specified'}
LinkedIn: {linkedin_url or 'Not provided'}
Portfolio: {portfolio_url or 'Not provided'}

Resume Content:
{resume_text[:3000]}

Cover Letter:
{cover_letter or 'Not provided'}
"""

    # Run AI scoring with resume filename
    try:
        ai_result = ai_candidate_scoring(job_description, resume_text, resume.filename)
        ai_score = ai_result.get("score", 0)
        ai_feedback = ai_result.get("feedback", "")
    except Exception as e:
        print(f"AI scoring error: {e}")
        ai_score = None
        ai_feedback = "AI analysis unavailable"

    # Determine initial status
    if ai_score is not None and ai_score >= 80:
        initial_status = "shortlisted"
    elif ai_score is not None and ai_score >= 60:
        initial_status = "reviewing"
    else:
        initial_status = "pending"

    # Save application
    application = Application(
        job_id=job_id,
        applicant_name=applicant_name,
        applicant_email=applicant_email,
        resume_url=resume_url,
        ai_score=ai_score,
        ai_feedback=ai_feedback,
        status=initial_status,
        applied_at=datetime.utcnow()
    )

    db.add(application)
    db.commit()
    db.refresh(application)

    return ApplicationSubmitResponse(
        message="Application submitted successfully! We'll review your application and get back to you soon.",
        application_id=application.id,
        job_title=job.title,
        company_name=company.name if company else "Unknown Company",
        ai_score=ai_score,
        status=initial_status,
        applied_at=application.applied_at
    )


@router.get("/jobs/search", response_model=List[PublicJobResponse])
def search_public_jobs(
    query: Optional[str] = None,
    location: Optional[str] = None,
    employment_type: Optional[str] = None,
    company_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Search for active jobs - NO AUTHENTICATION REQUIRED
    """
    jobs_query = db.query(Job).filter(Job.status == "active")

    if query:
        search_term = f"%{query}%"
        jobs_query = jobs_query.filter(
            (Job.title.ilike(search_term)) |
            (Job.description.ilike(search_term)) |
            (Job.requirements.ilike(search_term))
        )

    if location:
        jobs_query = jobs_query.filter(Job.location.ilike(f"%{location}%"))

    if employment_type:
        jobs_query = jobs_query.filter(Job.employment_type == employment_type)

    jobs = jobs_query.all()
    result = []

    for job in jobs:
        company = db.query(Company).filter(Company.id == job.company_id).first()
        if company_name and company:
            if company_name.lower() not in company.name.lower():
                continue
        result.append({
            "id": job.id,
            "title": job.title,
            "description": job.description,
            "requirements": job.requirements,
            "location": job.location,
            "salary_range": job.salary_range,
            "employment_type": job.employment_type,
            "company_name": company.name if company else "Unknown Company",
            "company_industry": company.industry if company else None,
            "created_at": job.created_at
        })

    return result


@router.get("/application/check/{job_id}/{email}")
def check_application_status(job_id: int, email: EmailStr, db: Session = Depends(get_db)):
    """
    Check if an email has already applied for a job
    NO AUTHENTICATION REQUIRED
    """
    application = db.query(Application).filter(
        Application.job_id == job_id,
        Application.applicant_email == email
    ).first()

    if not application:
        return {"has_applied": False, "message": "No application found"}

    return {
        "has_applied": True,
        "application_id": application.id,
        "status": application.status,
        "applied_at": application.applied_at,
        "message": "You have already applied for this position"
    }
