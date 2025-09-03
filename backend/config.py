from dotenv import load_dotenv
import os

load_dotenv()

ADMIN_USERNAME = os.getenv("T4T_ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("T4T_ADMIN_PASSWORD", "supersecret123")
JWT_SECRET_KEY = os.getenv("T4T_JWT_SECRET_KEY", "supersecretjwtkey")
JWT_ALGORITHM = os.getenv("T4T_JWT_ALGORITHM", "HS256")
JWT_EXPIRATION_SECONDS = int(os.getenv("T4T_JWT_EXPIRATION_SECONDS", 3600))