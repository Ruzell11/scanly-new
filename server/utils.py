import os
import re
import google.generativeai as genai
from config import settings
from docx import Document
import pdfplumber

genai.configure(api_key=settings.GEMINI_API_KEY)


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


def ai_candidate_scoring(job_description: str, resume_text: str, filename: str) -> dict:
    """AI-based scoring using Gemini with better context and filename awareness."""
    try:
        model = genai.GenerativeModel("gemini-2.0-flash")

        prompt = f"""
You are an expert recruiter evaluating a candidate's resume.

---

### Job Description:
{job_description}

---

### Resume Filename:
{filename}

---

### Resume Extracted Text:
{resume_text}

---

### Evaluation Instructions:
1. Assess technical and soft skills relevant to the job.
2. Score based on experience, education, and project alignment.
3. Note resume structure quality and missing key details.

---

### Output Format:
Score: [0–100]

Feedback:
* **Key Strengths:**
    * (3–5 points)
* **Areas of Concern:**
    * (3–5 points)
* **Overall Recommendation:** (Highly Recommended / Recommended / Maybe / Not Recommended)
* **Rationale:** (short paragraph)
"""

        response = model.generate_content(prompt)
        result = response.text.strip()

        score = 50
        match = re.search(r"Score:\s*([0-9]+)", result)
        if match:
            score = float(match.group(1))
            score = min(max(score, 0), 100)

        return {"score": score, "feedback": result}

    except Exception as e:
        return {"score": 50, "feedback": f"AI analysis unavailable: {str(e)}"}
