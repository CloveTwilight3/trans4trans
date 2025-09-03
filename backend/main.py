from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import List
from auth import create_jwt_token, verify_jwt_token
from config import ADMIN_USERNAME, ADMIN_PASSWORD
from discord import send_discord_notification
import os, json, uuid

app = FastAPI()

# --- CORS ---
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

# --- Router ---
api_router = APIRouter(prefix="/api")

# --- WebSocket Manager ---
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

# --- JSON Helpers ---
def load_json(file):
    if not os.path.exists(file):
        return []
    with open(file, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(file, data):
    with open(file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

# --- Models ---
class LoginRequest(BaseModel):
    username: str
    password: str

class LetterRequest(BaseModel):
    to: List[str]
    from_: str
    cc: List[str] = []
    bcc: List[str] = []
    subject: str
    body: str

# --- Login ---
@api_router.post("/login")
def login(data: LoginRequest):
    if data.username == ADMIN_USERNAME and data.password == ADMIN_PASSWORD:
        token = create_jwt_token()
        return {"access_token": token}
    raise HTTPException(status_code=403, detail="Invalid credentials")

# --- Public Endpoints ---
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

# --- Post Letter (Protected) ---
@api_router.post("/letters")
async def post_letter(data: LetterRequest, token: str = Depends(verify_jwt_token)):
    letters = load_json(LETTERS_FILE)
    new_letter = {
        "id": str(uuid.uuid4()),
        "to": data.to,
        "from": data.from_,
        "cc": data.cc,
        "bcc": data.bcc,
        "subject": data.subject,
        "body": data.body,
        "timestamp": datetime.utcnow().isoformat(),
        "status": "unread"
    }
    letters.append(new_letter)
    save_json(LETTERS_FILE, letters)
    
    # Send to WebSocket clients
    await manager.broadcast(new_letter)
    
    # Send Discord notification
    try:
        await send_discord_notification(new_letter)
    except Exception as e:
        # Don't fail the request if Discord notification fails
        print(f"Discord notification failed: {e}")
    
    return {"message": "Letter saved successfully", "id": new_letter["id"]}

# --- WebSocket ---
@app.websocket("/ws/letters")
async def websocket_letters(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# --- Mount Router ---
app.include_router(api_router)