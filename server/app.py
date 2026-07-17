# ============================================================
# app.py — Flask server entry point for SamChat
# ============================================================

from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from routes.routes import pdf_bp, chat_bp
from utils.gemini_utils import init_gemini
import os

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Allow React frontend (port 5173) to call this server
CORS(app, origins=["http://localhost:5173"])

# Register route blueprints
app.register_blueprint(pdf_bp)
app.register_blueprint(chat_bp)

# Health check route
@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "app": "SamChat"}), 200

# Initialize Gemini on startup
try:
    init_gemini()
    print("✅ Gemini AI initialized")
except Exception as e:
    print(f"⚠️  Gemini init failed: {e} — set GEMINI_API_KEY in .env")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print(f"🚀 SamChat server running on port {port}")
    app.run(debug=True, port=port)
