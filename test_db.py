import os
from sqlalchemy import create_engine

url = "postgresql://postgres.nkurzookkcupkimtkwfr:Beacon2026!!!@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"

try:
    engine = create_engine(url)
    connection = engine.connect()
    print("SUCCESS")
    connection.close()
except Exception as e:
    print(f"FAILED: {e}")
