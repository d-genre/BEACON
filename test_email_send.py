import os
import sys

# Add current dir to path to import backend modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from email_service import send_registration_otp_email

# test with the user's email or a dummy email?
# let's test with the SMTP username itself to see if it can email itself
test_email = "yelloowwmf@gmail.com"
print(f"Testing sending OTP to {test_email}...")

success, msg = send_registration_otp_email(test_email, "123456", "Test User")
print(f"Success: {success}")
print(f"Message: {msg}")
