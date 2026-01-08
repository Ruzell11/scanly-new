import os
import re
from openai import OpenAI
from config import settings
from docx import Document
import pdfplumber

client = OpenAI(api_key=settings.OPENAI_API_KEY)


def extract_text_from_resume(file_path: str) -> str:
    """Extract readable text from PDF or DOCX resumes."""
    ext = os.path.splitext(file_path)[1].lower()

    try:
        if ext == ".pdf":
            text = ""
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    text += page.extract_text() or ""
            return text.strip() or "No readable text extracted from PDF"

        elif ext in [".docx"]:
            doc = Document(file_path)
            text = "\n".join([p.text for p in doc.paragraphs])
            return text.strip() or "No readable text extracted from DOCX"

        else:
            # fallback for txt or unknown types
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read().strip()

    except Exception as e:
        return f"Error extracting resume text: {str(e)}"


def generate_apply_link(job_id: int) -> str:
    return f"{settings.FRONTEND_LINK}/apply/{job_id}"


def ai_candidate_scoring(
    job_description: str,
    resume_text: str,
    filename: str,
    required_documents: dict = None,
    weight_config: dict = None
) -> dict:
    """
    AI-based scoring using OpenAI with document validation.
    
    Args:
        job_description: The job posting description
        resume_text: Extracted text from resume
        filename: Original filename
        required_documents: Dict specifying required docs, e.g.:
            {
                "coe": True,  # Certificate of Employment required
                "diploma": True,  # Diploma required
                "certifications": False  # Optional certifications
            }
        weight_config: Dict for scoring weights, e.g.:
            {
                "skills": 0.35,
                "experience": 0.25,
                "education": 0.20,
                "documents": 0.15,
                "presentation": 0.05
            }
    
    Returns:
        Dict with score, feedback, and document validation status
    """
    try:
        # Default configurations - all documents optional
        if required_documents is None:
            required_documents = {
                "coe": False,
                "diploma": False,
                "certifications": False
            }
        
        # Ensure all documents are optional by default
        required_documents.setdefault("coe", False)
        required_documents.setdefault("diploma", False)
        required_documents.setdefault("certifications", False)
        
        if weight_config is None:
            weight_config = {
                "skills": 0.35,
                "experience": 0.25,
                "education": 0.20,
                "documents": 0.15,
                "presentation": 0.05
            }

        # Build document requirements string
        doc_requirements = []
        if required_documents.get("coe"):
            doc_requirements.append("Certificate of Employment (COE)")
        if required_documents.get("diploma"):
            doc_requirements.append("Diploma or Educational Certificate")
        if required_documents.get("certifications"):
            doc_requirements.append("Professional Certifications")
        
        doc_req_text = ", ".join(doc_requirements) if doc_requirements else "None specified"

        prompt = f"""
You are an expert recruiter evaluating a candidate's resume with specific document requirements.

---

### Job Description:
{job_description}

---

### Resume Filename:
{filename}

---

### Required Documents:
{doc_req_text}

---

### Scoring Weights:
- Technical & Soft Skills: {weight_config['skills']*100}%
- Work Experience: {weight_config['experience']*100}%
- Education Background: {weight_config['education']*100}%
- Document Completeness: {weight_config['documents']*100}%
- Resume Presentation: {weight_config['presentation']*100}%

---

### Resume Extracted Text:
{resume_text}

---

### Evaluation Instructions:

1. **Skills Assessment ({weight_config['skills']*100}%):**
   - Match technical skills with job requirements
   - Evaluate soft skills and competencies
   - Consider proficiency levels mentioned

2. **Experience Analysis ({weight_config['experience']*100}%):**
   - Relevant work experience duration
   - Project complexity and achievements
   - Industry alignment

3. **Education Verification ({weight_config['education']*100}%):**
   - Degree relevance to position
   - Institution credibility (if mentioned)
   - Additional training/courses

4. **Document Completeness ({weight_config['documents']*100}%):**
   - Check if COE is mentioned or referenced: {"REQUIRED" if required_documents.get("coe") else "Optional (Bonus if present)"}
   - Check if Diploma/degree is mentioned: {"REQUIRED" if required_documents.get("diploma") else "Optional (Bonus if present)"}
   - Check if certifications are listed: {"REQUIRED" if required_documents.get("certifications") else "Optional (Bonus if present)"}
   - Note: Deduct points ONLY for missing REQUIRED documents. Award bonus points if optional documents are present.

5. **Resume Quality ({weight_config['presentation']*100}%):**
   - Structure and formatting
   - Clarity and professionalism
   - Completeness of information

---

### Output Format (STRICT - Output EXACTLY once, no repetition):

Score: [0-100]

Document Status:
* COE: [Found/Not Found/Not Required]
* Diploma: [Found/Not Found/Not Required]
* Certifications: [Found/Not Found/Not Required]

Detailed Breakdown:
* Skills Score: [0-100] - Brief justification
* Experience Score: [0-100] - Brief justification
* Education Score: [0-100] - Brief justification
* Documents Score: [0-100] - Brief justification
* Presentation Score: [0-100] - Brief justification

Key Strengths:
* (List 3-5 specific strengths)

Areas of Concern:
* (List 3-5 specific concerns or gaps)

Overall Recommendation: [Highly Recommended / Recommended / Maybe / Not Recommended]

Rationale:
(2-3 sentence summary explaining the overall score and recommendation)

IMPORTANT: Output this format ONCE only. Do not repeat any sections.
"""

        response = client.chat.completions.create(
            model="gpt-4o",  # or "gpt-4o-mini" for faster/cheaper option
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert technical recruiter with experience in candidate evaluation and ATS systems."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3,  # Lower temperature for more consistent scoring
            max_tokens=1500
        )

        result = response.choices[0].message.content.strip()

        # Extract overall score
        score = 50
        match = re.search(r"Score:\s*([0-9]+)", result)
        if match:
            score = float(match.group(1))
            score = min(max(score, 0), 100)

        # Extract document status
        doc_status = {
            "coe": "Not Required",
            "diploma": "Not Required",
            "certifications": "Not Required"
        }
        
        coe_match = re.search(r"COE:\s*\[?([^\]]+)\]?", result, re.IGNORECASE)
        if coe_match:
            doc_status["coe"] = coe_match.group(1).strip()
        
        diploma_match = re.search(r"Diploma:\s*\[?([^\]]+)\]?", result, re.IGNORECASE)
        if diploma_match:
            doc_status["diploma"] = diploma_match.group(1).strip()
        
        cert_match = re.search(r"Certifications:\s*\[?([^\]]+)\]?", result, re.IGNORECASE)
        if cert_match:
            doc_status["certifications"] = cert_match.group(1).strip()

        # Check for missing required documents
        missing_docs = []
        if required_documents.get("coe") and "Not Found" in doc_status["coe"]:
            missing_docs.append("Certificate of Employment")
        if required_documents.get("diploma") and "Not Found" in doc_status["diploma"]:
            missing_docs.append("Diploma")
        if required_documents.get("certifications") and "Not Found" in doc_status["certifications"]:
            missing_docs.append("Certifications")

        return {
            "score": score,
            "feedback": result,
            "document_status": doc_status,
            "missing_required_documents": missing_docs,
            "document_compliance": len(missing_docs) == 0
        }

    except Exception as e:
        return {
            "score": 50,
            "feedback": f"AI analysis unavailable: {str(e)}",
            "document_status": {},
            "missing_required_documents": [],
            "document_compliance": False
        }