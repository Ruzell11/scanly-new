"""
SIMPLIFIED Forgot Password Implementation
Just sends a new password directly - user can change it later if they want
No temporary password tracking, no expiration, no extra database fields needed!
"""

from fastapi import Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from database import get_db
from models import User
from config import settings
import secrets
import string
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Use bcrypt with proper configuration
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    # Ensure password doesn't exceed bcrypt's 72 byte limit
    if len(password.encode('utf-8')) > 72:
        password = password[:72]
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

def check_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

def check_employer(current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "employer"]:
        raise HTTPException(status_code=403, detail="Employer access required")
    return current_user


# ============================================
# SIMPLIFIED FORGOT PASSWORD
# ============================================

def generate_new_password(length: int = 12) -> str:
    """Generate a secure new password"""
    characters = string.ascii_letters + string.digits + "!@#$%^&*"
    # Ensure at least one of each type
    password = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice("!@#$%^&*")
    ]
    # Fill the rest randomly
    password += [secrets.choice(characters) for _ in range(length - 4)]
    # Shuffle the password
    secrets.SystemRandom().shuffle(password)
    return ''.join(password)


def send_new_password_email(email: str, new_password: str, user_name: str = "User"):
    """Send new password via email"""
    try:
        # Get email configuration from settings
        smtp_server = settings.SMTP_SERVER
        smtp_port = settings.SMTP_PORT
        smtp_username = settings.SMTP_USERNAME
        smtp_password = settings.SMTP_PASSWORD
        from_email = settings.FROM_EMAIL
        from_name = settings.FROM_NAME
        frontend_url = settings.FRONTEND_URL
        
        # Validate email configuration
        if not all([smtp_username, smtp_password, from_email]):
            print("ERROR: Email configuration is incomplete.")
            return False

        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = "Your New Password - Password Reset"
        message["From"] = f"{from_name} <{from_email}>"
        message["To"] = email

        # Simple, clean HTML email
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
                    border-bottom: 3px solid #4ECDC4;
                    margin-bottom: 30px;
                }}
                h1 {{
                    color: #2C2C2C;
                    margin: 0;
                    font-size: 28px;
                }}
                .password-box {{
                    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                    padding: 20px;
                    border-radius: 8px;
                    text-align: center;
                    font-size: 28px;
                    font-weight: bold;
                    letter-spacing: 3px;
                    margin: 30px 0;
                    font-family: 'Courier New', Monaco, monospace;
                    border: 2px dashed #4ECDC4;
                    color: #2C2C2C;
                }}
                .button {{
                    display: inline-block;
                    padding: 14px 28px;
                    background: linear-gradient(135deg, #2C2C2C 0%, #3F5357 100%);
                    color: white !important;
                    text-decoration: none;
                    border-radius: 8px;
                    margin: 20px 0;
                    font-weight: 600;
                }}
                .footer {{
                    text-align: center;
                    margin-top: 40px;
                    padding-top: 30px;
                    border-top: 2px solid #e9ecef;
                    color: #6c757d;
                    font-size: 13px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="content">
                    <div class="header">
                        <h1>🔐 Password Reset</h1>
                    </div>
                    
                    <p style="font-size: 16px;">Hi <strong>{user_name}</strong>,</p>
                    
                    <p style="font-size: 16px;">Your password has been reset. Here is your new password:</p>
                    
                    <div class="password-box">
                        {new_password}
                    </div>
                    
                    <p style="background-color: #e7f3ff; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 4px;">
                        💡 <strong>Tip:</strong> You can change this password to something more memorable after logging in. 
                        Just go to your account settings!
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{frontend_url}/login" class="button">Login Now</a>
                    </div>
                    
                    <p style="margin-top: 30px;">If you didn't request this password reset, please contact our support team immediately.</p>
                    
                    <p style="margin-top: 30px;">Best regards,<br>
                    <strong>{from_name} Team</strong></p>
                    
                    <div class="footer">
                        <p>This is an automated message, please do not reply to this email.</p>
                        <p>&copy; 2025 {from_name}. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

        # Plain text version
        text_body = f"""
Password Reset

Hi {user_name},

Your password has been reset. Here is your new password:

{new_password}

Tip: You can change this password to something more memorable after logging in.

Login here: {frontend_url}/login

If you didn't request this password reset, please contact our support team immediately.

Best regards,
{from_name} Team
        """

        # Attach both versions
        part1 = MIMEText(text_body, "plain")
        part2 = MIMEText(html_body, "html")
        message.attach(part1)
        message.attach(part2)

        # Send email
        print(f"📧 Sending password reset email to {email}...")
        
        try:
            server = smtplib.SMTP(smtp_server, smtp_port, timeout=30)
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.send_message(message)
            server.quit()
            
            print(f"✅ Password reset email sent successfully to {email}")
            return True
            
        except Exception as e:
            print(f"❌ SMTP Error: {str(e)}")
            return False
        
    except Exception as e:
        print(f"❌ Error sending email: {str(e)}")
        return False


def handle_forgot_password(email: str, db: Session, background_tasks: BackgroundTasks):
    """
    SIMPLIFIED forgot password - just updates the password directly
    No temporary password, no expiration, no extra database fields needed
    """
    try:
        # Find user by email
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            # Security: Don't reveal if email exists
            return {
                "message": "If this email exists in our system, you will receive a new password.",
                "success": True
            }
        
        # Generate new password
        new_password = generate_new_password()
        
        print(f"🔑 Generated new password for {email}: {new_password}")
        
        # Hash the new password
        hashed_password = get_password_hash(new_password)
        
        # Update user's password directly - that's it!
        user.password = hashed_password  # or user.hashed_password if that's your field name
        
        db.commit()
        db.refresh(user)
        
        print(f"✅ Password updated in database for {email}")
        
        # Get user's name
        user_name = getattr(user, 'name', getattr(user, 'full_name', 'User'))
        
        # Send email in background
        background_tasks.add_task(
            send_new_password_email,
            email=email,
            new_password=new_password,
            user_name=user_name
        )
        
        return {
            "message": "A new password has been sent to your email address.",
            "success": True
        }
        
    except Exception as e:
        print(f"❌ Error in handle_forgot_password_simple: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while resetting your password. Please try again."
        )


def change_user_password_simple(current_password: str, new_password: str, current_user: User, db: Session):
    """
    Simple password change - for users who want to change their password
    """
    try:
        # Check which field your User model uses
        user_password_hash = getattr(current_user, 'password', None) or getattr(current_user, 'hashed_password', None)
        
        if not user_password_hash:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="User password field not found"
            )
        
        # Verify current password
        if not verify_password(current_password, user_password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Validate new password strength
        if len(new_password) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be at least 8 characters long"
            )
        
        # Update to new password
        new_hash = get_password_hash(new_password)
        
        # Set to the correct field
        if hasattr(current_user, 'password'):
            current_user.password = new_hash
        elif hasattr(current_user, 'hashed_password'):
            current_user.hashed_password = new_hash
        
        db.commit()
        
        print(f"✅ Password changed successfully for {current_user.email}")
        
        return {
            "message": "Password changed successfully",
            "success": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error changing password: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change password. Please try again."
        )