from fastapi import FastAPI, HTTPException, Form, WebSocket, WebSocketDisconnect, Depends, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from auth import create_jwt_token, verify_jwt_token
from config import ADMIN_USERNAME, ADMIN_PASSWORD
from typing import List
from datetime import datetime
import os, json
import uuid  # Make sure to install: pip install uuid7

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://trans4trans.win", "https://www.trans4trans.win"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(__file__)
LETTERS_FILE = os.path.join(BASE_DIR, "letters.json")
USERS_FILE = os.path.join(BASE_DIR, "users.json")

# Create API router
api_router = APIRouter(prefix="/api")

# WebSocket Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

manager = ConnectionManager()

# Helpers
def load_json(file):
    if not os.path.exists(file):
        return []
    with open(file, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(file, data):
    with open(file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

# --- Authentication --- (now using api_router)
@api_router.post("/login")
def login(username: str = Form(...), password: str = Form(...)):
    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        token = create_jwt_token()
        return {"access_token": token}
    raise HTTPException(status_code=403, detail="Invalid credentials")

# --- Public Endpoints --- (now using api_router)
@api_router.get("/letters")
def get_letters():
    return load_json(LETTERS_FILE)

@api_router.get("/letters/{letter_id}")
def get_letter(letter_id: str):
    letters = load_json(LETTERS_FILE)
    letter = next((l for l in letters if l.get("id") == letter_id), None)
    if not letter:
        raise HTTPException(status_code=404, detail="Letter not found")
    return letter

@api_router.get("/users")
def get_users():
    return load_json(USERS_FILE)

# --- Admin Endpoints (JWT required) --- (now using api_router)
@api_router.post("/letters")
async def post_letter(
    to: str = Form(...),
    from_: str = Form(...),
    cc: str = Form(""),
    bcc: str = Form(""),
    subject: str = Form(...),
    body: str = Form(...),
    token: str = Depends(verify_jwt_token)
):
    letters = load_json(LETTERS_FILE)
    new_letter = {
        "id": str(uuid7.uuid7()),  # Using uuid7
        "to": [email.strip() for email in to.split(",") if email.strip()],
        "from": from_.strip(),
        "cc": [email.strip() for email in cc.split(",") if email.strip()],
        "bcc": [email.strip() for email in bcc.split(",") if email.strip()],
        "subject": subject.strip(),
        "body": body.strip(),
        "timestamp": datetime.utcnow().isoformat(),
        "status": "unread"  # Add status for incoming mail tracking
    }
    letters.append(new_letter)
    save_json(LETTERS_FILE, letters)
    await manager.broadcast(new_letter)
    return {"message": "Letter saved successfully", "id": new_letter["id"]}

# --- WebSocket Endpoint --- (this stays at root level for nginx proxy)
@app.websocket("/ws/letters")
async def websocket_letters(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()  # keep alive
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Mount the API router
app.include_router(api_router)