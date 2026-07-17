# ============================================================
# routes/routes.py — All API route definitions
# ============================================================

from flask import Blueprint
from controllers.pdf_controller import upload_pdf, get_documents, delete_document
from controllers.chat_controller import (
    chat, summarize, key_points,
    get_history, clear_history, export_chat
)

# Blueprint groups related routes together
pdf_bp  = Blueprint("pdf",  __name__, url_prefix="/api/pdf")
chat_bp = Blueprint("chat", __name__, url_prefix="/api/chat")

# ── PDF Routes ──────────────────────────────────────────────
pdf_bp.add_url_rule("/upload",              view_func=upload_pdf,      methods=["POST"])
pdf_bp.add_url_rule("/documents",           view_func=get_documents,   methods=["GET"])
pdf_bp.add_url_rule("/documents/<doc_id>",  view_func=delete_document, methods=["DELETE"])

# ── Chat Routes ─────────────────────────────────────────────
chat_bp.add_url_rule("/",                    view_func=chat,         methods=["POST"])
chat_bp.add_url_rule("/summarize",           view_func=summarize,    methods=["POST"])
chat_bp.add_url_rule("/keypoints",           view_func=key_points,   methods=["POST"])
chat_bp.add_url_rule("/history/<doc_id>",    view_func=get_history,  methods=["GET"])
chat_bp.add_url_rule("/history/<doc_id>",    view_func=clear_history,methods=["DELETE"])
chat_bp.add_url_rule("/export",              view_func=export_chat,  methods=["POST"])
