from dotenv import load_dotenv
import os

load_dotenv()

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "supersecret123")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "supersecretjwtkey")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION_SECONDS = int(os.getenv("JWT_EXPIRATION_SECONDS", 3600))
DISCORD_WEBHOOKS = os.getenv("DISCORD_WEBHOOKS", "").split(",") if os.getenv("DISCORD_WEBHOOKS") else []