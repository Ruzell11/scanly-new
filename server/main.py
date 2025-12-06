from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta

from database import engine, get_db
from models import Base
from schemas import Token
from auth import verify_password, create_access_token
from models import User
from routers import admin, employer, applicant, auth
import os
from fastapi.staticfiles import StaticFiles

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Job Application System API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# Serve resumes
# ============================================
RESUME_FOLDER = "uploads/resumes"
os.makedirs(RESUME_FOLDER, exist_ok=True)
app.mount("/uploads/resumes", StaticFiles(directory=RESUME_FOLDER), name="resumes")

# Include routers
app.include_router(admin.router)
app.include_router(employer.router)
app.include_router(applicant.router)
app.include_router(auth.router)
