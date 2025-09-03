from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends, APIRouter, Body
from fastapi.middleware.cors import CORSMiddleware
from auth import create_jwt_token, verify_jwt_token
from config import ADMIN_USERNAME, ADMIN_PASSWORD
from typing import List
from datetime import datetime
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

# --- Paths ---
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

# --- Helpers ---
def load_json(file):
    if not os.path.exists(file):
        return [] if "letters" in file else {"to": [], "from": []}
    with open(file, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(file, data):
    with open(file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

# --- Login ---
@api_router.post("/login")
def login(username: str = Body(...), password: str = Body(...)):
    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
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

# --- Admin Endpoints (JWT required) ---
@api_router.post("/letters")
async def post_letter(
    payload: dict = Body(...),
    token: str = Depends(verify_jwt_token)
):
    letters = load_json(LETTERS_FILE)

    new_letter = {
        "id": str(uuid.uuid4()),
        "to": payload.get("to", []),
        "from": payload.get("from", ""),
        "cc": payload.get("cc", []),
        "bcc": payload.get("bcc", []),
        "subject": payload.get("subject", ""),
        "body": payload.get("body", ""),
        "timestamp": datetime.utcnow().isoformat(),
        "status": "unread"
    }

    letters.append(new_letter)
    save_json(LETTERS_FILE, letters)

    await manager.broadcast(new_letter)

    return {"message": "Letter saved successfully", "id": new_letter["id"]}

# --- WebSocket Endpoint ---
@app.websocket("/ws/letters")
async def websocket_letters(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# --- Mount API Router ---
app.include_router(api_router)
