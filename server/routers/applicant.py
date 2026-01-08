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
    coe: Optional[UploadFile] = File(None),
    diploma: Optional[UploadFile] = File(None),
    certifications: Optional[List[UploadFile]] = File(None),
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
    Supports optional document uploads: COE, Diploma, and Certifications
    """
    from utils import extract_text_from_resume, ai_candidate_scoring
    
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

    # Helper function to validate and save files
    async def save_document(file: UploadFile, doc_type: str) -> tuple[str, str]:
        """Save document and return (file_path, file_url)"""
        if not file.filename.lower().endswith(('.pdf', '.doc', '.docx')):
            raise HTTPException(
                status_code=400, 
                detail=f"{doc_type} must be in PDF, DOC, or DOCX format"
            )
        
        content = await file.read()
        upload_dir = f"uploads/{doc_type.lower()}"
        os.makedirs(upload_dir, exist_ok=True)

        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        safe_email = applicant_email.replace('@', '_at_').replace('.', '_')
        safe_filename = f"{job_id}_{safe_email}_{timestamp}_{file.filename}"
        file_path = os.path.join(upload_dir, safe_filename)

        with open(file_path, "wb") as f:
            f.write(content)

        return file_path, f"/{upload_dir}/{safe_filename}"

    # Save all documents and extract text
    documents = {
        'resume': {'file': resume, 'type': 'resumes', 'required': True},
        'coe': {'file': coe, 'type': 'coe', 'required': False},
        'diploma': {'file': diploma, 'type': 'diploma', 'required': False},
    }
    
    doc_data = {}
    
    # Process single file documents
    for doc_name, doc_info in documents.items():
        file = doc_info['file']
        if file and file.filename:
            file_path, file_url = await save_document(file, doc_info['type'])
            doc_data[doc_name] = {
                'path': file_path,
                'url': file_url,
                'text': extract_text_from_resume(file_path)
            }
        elif doc_info['required']:
            raise HTTPException(status_code=400, detail=f"{doc_name.title()} is required")
        else:
            doc_data[doc_name] = {'path': None, 'url': None, 'text': ''}

    # Process certifications (multiple files)
    doc_data['certifications'] = {'paths': [], 'urls': [], 'texts': []}
    if certifications:
        for cert_file in certifications:
            if cert_file and cert_file.filename:
                cert_path, cert_url = await save_document(cert_file, 'certifications')
                doc_data['certifications']['paths'].append(cert_path)
                doc_data['certifications']['urls'].append(cert_url)
                doc_data['certifications']['texts'].append(extract_text_from_resume(cert_path))

    # Parse skills
    skills_list = None
    if skills:
        try:
            skills_list = json.loads(skills)
        except Exception:
            skills_list = [s.strip() for s in skills.split(',') if s.strip()]

    # Build job description
    job_description = f"""
Job Title: {job.title}
Location: {job.location}
Employment Type: {job.employment_type}

Description:
{job.description}

Requirements:
{job.requirements}
"""

    # Build comprehensive resume text with all documents
    all_documents_sections = [
        ("RESUME", doc_data['resume']['text']),
        ("CERTIFICATE OF EMPLOYMENT", doc_data['coe']['text']),
        ("DIPLOMA/EDUCATIONAL CERTIFICATE", doc_data['diploma']['text']),
        ("PROFESSIONAL CERTIFICATIONS", "\n\n---\n\n".join(doc_data['certifications']['texts']))
    ]
    
    all_documents_text = "\n\n".join(
        f"=== {title} ===\n{text}" 
        for title, text in all_documents_sections if text
    )

    # Configure AI scoring
    required_documents = {
        "coe": False,
        "diploma": False,
        "certifications": False
    }

    weight_config = {
        "skills": 0.35,
        "experience": 0.25,
        "education": 0.20,
        "documents": 0.15,
        "presentation": 0.05
    }

    # Run AI scoring
    try:
        ai_result = ai_candidate_scoring(
            job_description=job_description,
            resume_text=all_documents_text,
            filename=resume.filename,
            required_documents=required_documents,
            weight_config=weight_config
        )
        
        ai_score = ai_result.get("score", 0)
        ai_feedback = ai_result.get("feedback", "")
        document_status = ai_result.get("document_status", {})
        missing_docs = ai_result.get("missing_required_documents", [])
        document_compliance = ai_result.get("document_compliance", True)
        
        # Note: AI feedback already includes document status from the AI analysis
        # No need to append it again here
        
    except Exception as e:
        print(f"AI scoring error: {e}")
        ai_score = None
        ai_feedback = f"AI analysis unavailable: {str(e)}"
        document_compliance = False

    # Determine initial status
    if ai_score is not None:
        if not document_compliance:
            initial_status = "pending"
        elif ai_score >= 80:
            initial_status = "shortlisted"
        elif ai_score >= 60:
            initial_status = "reviewing"
        else:
            initial_status = "pending"
    else:
        initial_status = "pending"

    # Save application
    application = Application(
        job_id=job_id,
        applicant_name=applicant_name,
        applicant_email=applicant_email,
        resume_url=doc_data['resume']['url'],
        ai_score=ai_score,
        ai_feedback=ai_feedback,
        status=initial_status,
        applied_at=datetime.utcnow()
    )

    db.add(application)
    db.commit()
    db.refresh(application)

    # Build response message
    response_parts = ["Application submitted successfully! We'll review your application and get back to you soon."]
    
    uploaded_docs = []
    if doc_data['coe']['url']:
        uploaded_docs.append("✓ Certificate of Employment")
    if doc_data['diploma']['url']:
        uploaded_docs.append("✓ Diploma/Educational Certificate")
    if doc_data['certifications']['urls']:
        uploaded_docs.append(f"✓ {len(doc_data['certifications']['urls'])} Professional Certification(s)")
    
    if uploaded_docs:
        response_parts.append("\n\nDocuments received:")
        response_parts.extend([f"\n{doc}" for doc in uploaded_docs])
    
    if ai_score and ai_score >= 70:
        response_parts.append("\n\nYour application shows strong alignment with our requirements!")

    return ApplicationSubmitResponse(
        message="".join(response_parts),
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
