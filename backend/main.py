from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect, Depends, APIRouter, Header
from fastapi.middleware.cors import CORSMiddleware
from auth import create_jwt_token
from config import ADMIN_USERNAME, ADMIN_PASSWORD, JWT_SECRET_KEY, JWT_ALGORITHM
from typing import List
from datetime import datetime
import os, json, jwt, uuid

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

# --- API Router ---
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
        return {}
    with open(file, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(file, data):
    with open(file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

# --- JWT Verification ---
def verify_jwt_token(authorization: str = Header(None)):
    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")

    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# --- Authentication ---
@api_router.post("/login")
def login(username: str, password: str):
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
    # Return the file as-is since it already has "to" and "from"
    return load_json(USERS_FILE)

# --- Admin Endpoint (JSON) ---
@api_router.post("/letters")
async def post_letter(request: Request, token: str = Depends(verify_jwt_token)):
    data = await request.json()

    letters = load_json(LETTERS_FILE)
    new_letter = {
        "id": str(uuid.uuid4()),
        "to": data.get("to", []),
        "from": data.get("from", ""),
        "cc": data.get("cc", []),
        "bcc": data.get("bcc", []),
        "subject": data.get("subject", ""),
        "body": data.get("body", ""),
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
            await websocket.receive_text()  # keep alive
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# --- Mount API ---
app.include_router(api_router)
