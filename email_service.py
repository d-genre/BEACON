import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Tuple

logger = logging.getLogger("email_service")

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None


def get_smtp_config() -> dict:
    """Reloads .env variables and returns current SMTP configuration dict."""
    if load_dotenv:
        load_dotenv(override=True)

    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com").strip()
    smtp_port_str = os.getenv("SMTP_PORT", "587").strip()
    try:
        smtp_port = int(smtp_port_str)
    except ValueError:
        smtp_port = 587

    smtp_username = os.getenv("SMTP_USERNAME", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "").strip()
    smtp_from_email = os.getenv("SMTP_FROM_EMAIL", "").strip() or smtp_username or "noreply@saranathan.ac.in"
    smtp_from_name = os.getenv("SMTP_FROM_NAME", "FreshersHub Campus Portal").strip()

    return {
        "server": smtp_server,
        "port": smtp_port,
        "username": smtp_username,
        "password": smtp_password,
        "from_email": smtp_from_email,
        "from_name": smtp_from_name,
    }


def is_smtp_configured() -> bool:
    """Checks whether valid SMTP credentials are configured in .env."""
    config = get_smtp_config()
    username = config["username"]
    password = config["password"]

    if not username or not password:
        return False
    if "your-email@gmail.com" in username.lower() or "your-app-password" in password.lower():
        return False
    return True


def send_otp_email(recipient_email: str, reset_code: str, user_name: str = "Student") -> Tuple[bool, str]:
    """
    Sends a 6-digit OTP verification email to the user for password reset.
    Returns (success: bool, status_reason: str).
    """
    config = get_smtp_config()

    if not is_smtp_configured():
        msg = (
            "SMTP credentials are not configured in your .env file. "
            "Please add your real SMTP_USERNAME and SMTP_PASSWORD to send emails."
        )
        print(f"[EMAIL SERVICE WARNING] {msg} (Target: {recipient_email}, OTP: {reset_code})")
        logger.warning(msg)
        return False, msg

    display_name = user_name.strip() if user_name else "Student"
    subject = f"[FreshersHub] Your Password Reset OTP Code: {reset_code}"

    # Plaintext Body Fallback
    text_content = f"""Hello {display_name},

You requested a password reset for your Saranathan College FreshersHub account.

Your 6-Digit OTP Verification Code is:
{reset_code}

This code is valid for 10 minutes. Please do NOT share this code with anyone.

If you did not request a password reset, please ignore this message.

Regards,
FreshersHub Campus Team
Saranathan College of Engineering
"""

    # HTML Email Template with Modern Dark Theme Styling
    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset OTP - FreshersHub</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #f8fafc;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 40px 10px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" max-width="520" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #1e293b; border: 1px solid #334155; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
                    
                    <!-- Header Banner -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px; text-align: center;">
                            <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">FreshersHub</h1>
                            <p style="margin: 6px 0 0 0; font-size: 13px; color: #c7d2fe; text-transform: uppercase; tracking: 1px; font-weight: 600;">Saranathan College Campus Portal</p>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 32px 30px;">
                            <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #ffffff;">Password Reset Request</h2>
                            <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                                Hello <strong style="color: #e2e8f0;">{display_name}</strong>,<br>
                                We received a request to reset your password for your FreshersHub campus account. Use the 6-digit OTP code below to complete your verification:
                            </p>

                            <!-- OTP Code Box -->
                            <div style="background-color: #0f172a; border: 2px dashed #6366f1; border-radius: 14px; padding: 20px; text-align: center; margin-bottom: 24px;">
                                <span style="font-size: 11px; font-weight: 700; color: #818cf8; text-transform: uppercase; letter-spacing: 1.5px; display: block; margin-bottom: 8px;">Verification Code</span>
                                <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 900; color: #f59e0b; letter-spacing: 8px;">{reset_code}</span>
                            </div>

                            <p style="margin: 0 0 20px 0; font-size: 13px; line-height: 1.5; color: #cbd5e1; background-color: rgba(99, 102, 241, 0.1); border-left: 3px solid #6366f1; padding: 10px 14px; border-radius: 6px;">
                                ⏱️ <strong>Note:</strong> This verification code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.
                            </p>

                            <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #64748b;">
                                If you did not request a password reset, you can safely ignore this email. Your current password will remain unchanged.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #0f172a; border-top: 1px solid #334155; padding: 20px 30px; text-align: center;">
                            <p style="margin: 0; font-size: 12px; color: #64748b;">
                                &copy; {os.getenv("CAMPUS_YEAR", "2026")} FreshersHub &bull; Saranathan College of Engineering
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""

    # Build MIME Message
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = f"{config['from_name']} <{config['from_email']}>"
    message["To"] = recipient_email

    part_text = MIMEText(text_content, "plain", "utf-8")
    part_html = MIMEText(html_content, "html", "utf-8")
    message.attach(part_text)
    message.attach(part_html)

    try:
        server = None
        try:
            if config["port"] == 465:
                server = smtplib.SMTP_SSL(config["server"], config["port"], timeout=6)
            else:
                server = smtplib.SMTP(config["server"], config["port"], timeout=6)
                server.starttls()
            server.login(config["username"], config["password"])
        except Exception as primary_err:
            fallback_port = 465 if config["port"] != 465 else 587
            print(f"[EMAIL SERVICE WARNING] SMTP primary port {config['port']} failed: {primary_err}. Trying fallback port {fallback_port}...")
            if fallback_port == 465:
                server = smtplib.SMTP_SSL(config["server"], fallback_port, timeout=6)
            else:
                server = smtplib.SMTP(config["server"], fallback_port, timeout=6)
                server.starttls()
            server.login(config["username"], config["password"])

        server.sendmail(config["from_email"], [recipient_email], message.as_string())
        server.quit()
        success_msg = f"Successfully dispatched OTP email to {recipient_email}"
        print(f"[EMAIL SERVICE SUCCESS] {success_msg}")
        logger.info(success_msg)
        return True, success_msg
    except Exception as e:
        err_msg = f"Failed to dispatch OTP email to {recipient_email}: {str(e)}"
        print(f"[EMAIL SERVICE ERROR] {err_msg}")
        logger.error(err_msg)
        return False, err_msg


def send_registration_otp_email(recipient_email: str, otp_code: str, user_name: str = "Student") -> Tuple[bool, str]:
    """
    Sends a 6-digit OTP verification email to a newly registered user.
    Returns (success: bool, status_reason: str).
    """
    config = get_smtp_config()

    if not is_smtp_configured():
        msg = (
            "SMTP credentials are not configured in your .env file. "
            "Please add your real SMTP_USERNAME and SMTP_PASSWORD to send emails."
        )
        print(f"[EMAIL SERVICE WARNING] {msg} (Target: {recipient_email}, OTP: {otp_code})")
        logger.warning(msg)
        return False, msg

    display_name = user_name.strip() if user_name else "Student"
    subject = f"[FreshersHub] Verify Your Account OTP Code: {otp_code}"

    # Plaintext Body Fallback
    text_content = f"""Hello {display_name},

Thank you for registering at FreshersHub!

Your 6-Digit Registration OTP Verification Code is:
{otp_code}

This code is valid for 10 minutes. Please enter this code on the registration page to verify and activate your account.

Regards,
FreshersHub Campus Team
Saranathan College of Engineering
"""

    # HTML Email Template
    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Verification OTP - FreshersHub</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #f8fafc;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 40px 10px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" max-width="520" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #1e293b; border: 1px solid #334155; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
                    
                    <!-- Header Banner -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px; text-align: center;">
                            <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">FreshersHub</h1>
                            <p style="margin: 6px 0 0 0; font-size: 13px; color: #c7d2fe; text-transform: uppercase; tracking: 1px; font-weight: 600;">Saranathan College Campus Portal</p>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 32px 30px;">
                            <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #ffffff;">Verify Your Account</h2>
                            <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                                Hello <strong style="color: #e2e8f0;">{display_name}</strong>,<br>
                                Thank you for registering at FreshersHub! To activate your account and start pair-programming, messaging, and building your campus career, verify your email using this 6-digit OTP code:
                            </p>

                            <!-- OTP Code Box -->
                            <div style="background-color: #0f172a; border: 2px dashed #6366f1; border-radius: 14px; padding: 20px; text-align: center; margin-bottom: 24px;">
                                <span style="font-size: 11px; font-weight: 700; color: #818cf8; text-transform: uppercase; letter-spacing: 1.5px; display: block; margin-bottom: 8px;">Verification Code</span>
                                <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 900; color: #f59e0b; letter-spacing: 8px;">{otp_code}</span>
                            </div>

                            <p style="margin: 0 0 20px 0; font-size: 13px; line-height: 1.5; color: #cbd5e1; background-color: rgba(99, 102, 241, 0.1); border-left: 3px solid #6366f1; padding: 10px 14px; border-radius: 6px;">
                                ⏱️ <strong>Note:</strong> This verification code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #0f172a; border-top: 1px solid #334155; padding: 20px 30px; text-align: center;">
                            <p style="margin: 0; font-size: 12px; color: #64748b;">
                                &copy; {os.getenv("CAMPUS_YEAR", "2026")} FreshersHub &bull; Saranathan College of Engineering
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""

    # Build MIME Message
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = f"{config['from_name']} <{config['from_email']}>"
    message["To"] = recipient_email

    part_text = MIMEText(text_content, "plain", "utf-8")
    part_html = MIMEText(html_content, "html", "utf-8")
    message.attach(part_text)
    message.attach(part_html)

    try:
        server = None
        try:
            if config["port"] == 465:
                server = smtplib.SMTP_SSL(config["server"], config["port"], timeout=6)
            else:
                server = smtplib.SMTP(config["server"], config["port"], timeout=6)
                server.starttls()
            server.login(config["username"], config["password"])
        except Exception as primary_err:
            fallback_port = 465 if config["port"] != 465 else 587
            print(f"[EMAIL SERVICE WARNING] Registration SMTP primary port {config['port']} failed: {primary_err}. Trying fallback port {fallback_port}...")
            if fallback_port == 465:
                server = smtplib.SMTP_SSL(config["server"], fallback_port, timeout=6)
            else:
                server = smtplib.SMTP(config["server"], fallback_port, timeout=6)
                server.starttls()
            server.login(config["username"], config["password"])

        server.sendmail(config["from_email"], [recipient_email], message.as_string())
        server.quit()
        success_msg = f"Successfully dispatched Registration OTP email to {recipient_email}"
        print(f"[EMAIL SERVICE SUCCESS] {success_msg}")
        logger.info(success_msg)
        return True, success_msg
    except Exception as e:
        err_msg = f"Failed to dispatch Registration OTP email to {recipient_email}: {str(e)}"
        print(f"[EMAIL SERVICE ERROR] {err_msg}")
        logger.error(err_msg)
        return False, err_msg

