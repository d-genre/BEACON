import requests

payload = {
    "name": "Test Student",
    "email": "test12345@saranathan.ac.in",
    "password": "password123",
    "department": "Computer Science & Engineering",
    "role": "STUDENT"
}

try:
    response = requests.post("http://127.0.0.1:8000/auth/register", json=payload)
    print(response.status_code)
    print(response.json())
except Exception as e:
    print("Error:", e)
