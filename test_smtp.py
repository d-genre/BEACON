import os
import smtplib
from dotenv import load_dotenv

load_dotenv(override=True)
smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
smtp_port = int(os.getenv("SMTP_PORT", "587"))
smtp_username = os.getenv("SMTP_USERNAME")
smtp_password = os.getenv("SMTP_PASSWORD")

print(f"Connecting to {smtp_server}:{smtp_port} with user {smtp_username}")
try:
    server = smtplib.SMTP(smtp_server, smtp_port, timeout=10)
    server.set_debuglevel(1)
    server.starttls()
    server.login(smtp_username, smtp_password)
    print("Login successful!")
    server.quit()
except Exception as e:
    print(f"Error: {e}")
