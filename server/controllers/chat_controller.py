# ============================================================
# controllers/chat_controller.py — All AI chat operations
# ============================================================

from flask import request, jsonify
from utils.gemini_utils import (
    chat_with_document,
    summarize_document,
    extract_key_points,
    analyze_multiple_docs
)
from utils.pdf_utils import get_relevant_chunks
from controllers.pdf_controller import get_document_store


def chat():
    """
    POST /api/chat
    Body: { doc_id, message, mode }
    mode: "chat" | "multi"
    
    Sends a message and gets AI response based on document content.
    """
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data provided"}), 400

    doc_id  = data.get("doc_id")
    message = data.get("message", "").strip()
    mode    = data.get("mode", "chat")  # "chat" or "multi"

    if not message:
        return jsonify({"error": "Message cannot be empty"}), 400

    document_store = get_document_store()

    # ── Multi-document mode ──────────────────────────────────
    if mode == "multi":
        if len(document_store) == 0:
            return jsonify({"error": "No documents uploaded"}), 400

        # Build context from ALL documents
        docs_context = ""
        for i, (did, doc) in enumerate(document_store.items(), 1):
            relevant = get_relevant_chunks(doc["chunks"], message)
            docs_context += f"\n\n=== DOCUMENT {i}: {doc['filename']} ===\n{relevant}"

        try:
            response = analyze_multiple_docs(docs_context, message)
            return jsonify({"response": response, "mode": "multi"}), 200
        except Exception as e:
            return jsonify({"error": f"AI error: {str(e)}"}), 500

    # ── Single document mode ─────────────────────────────────
    if not doc_id:
        return jsonify({"error": "doc_id is required for single document chat"}), 400

    if doc_id not in document_store:
        return jsonify({"error": "Document not found. Please re-upload."}), 404

    doc = document_store[doc_id]

    # Get relevant chunks for this question
    relevant_context = get_relevant_chunks(doc["chunks"], message)

    # Add user message to history
    doc["chat_history"].append({"role": "user", "content": message})

    try:
        response = chat_with_document(
            document_context=relevant_context,
            question=message,
            chat_history=doc["chat_history"]
        )

        # Add AI response to history
        doc["chat_history"].append({"role": "assistant", "content": response})

        return jsonify({
            "response":     response,
            "mode":         "single",
            "doc_filename": doc["filename"]
        }), 200

    except Exception as e:
        return jsonify({"error": f"AI error: {str(e)}"}), 500


def summarize():
    """
    POST /api/chat/summarize
    Body: { doc_id }
    Returns a structured summary of the document.
    """
    data = request.get_json()
    doc_id = data.get("doc_id") if data else None

    if not doc_id:
        return jsonify({"error": "doc_id is required"}), 400

    document_store = get_document_store()

    if doc_id not in document_store:
        return jsonify({"error": "Document not found"}), 404

    doc = document_store[doc_id]

    try:
        summary = summarize_document(doc["full_text"])
        return jsonify({
            "summary":  summary,
            "filename": doc["filename"]
        }), 200
    except Exception as e:
        return jsonify({"error": f"AI error: {str(e)}"}), 500


def key_points():
    """
    POST /api/chat/keypoints
    Body: { doc_id }
    Returns bullet-point key highlights from the document.
    """
    data = request.get_json()
    doc_id = data.get("doc_id") if data else None

    if not doc_id:
        return jsonify({"error": "doc_id is required"}), 400

    document_store = get_document_store()

    if doc_id not in document_store:
        return jsonify({"error": "Document not found"}), 404

    doc = document_store[doc_id]

    try:
        points = extract_key_points(doc["full_text"])
        return jsonify({
            "key_points": points,
            "filename":   doc["filename"]
        }), 200
    except Exception as e:
        return jsonify({"error": f"AI error: {str(e)}"}), 500


def get_history():
    """
    GET /api/chat/history/<doc_id>
    Returns full chat history for a document.
    """
    from controllers.pdf_controller import get_document_store
    document_store = get_document_store()

    doc_id = request.view_args.get("doc_id")

    if doc_id not in document_store:
        return jsonify({"error": "Document not found"}), 404

    history = document_store[doc_id]["chat_history"]
    return jsonify({"history": history, "count": len(history)}), 200


def clear_history():
    """
    DELETE /api/chat/history/<doc_id>
    Clears the chat history for a document.
    """
    from controllers.pdf_controller import get_document_store
    document_store = get_document_store()

    doc_id = request.view_args.get("doc_id")

    if doc_id not in document_store:
        return jsonify({"error": "Document not found"}), 404

    document_store[doc_id]["chat_history"] = []
    return jsonify({"success": True, "message": "Chat history cleared"}), 200


def export_chat():
    """
    POST /api/chat/export
    Body: { doc_id }
    Returns the full chat as plain text for download.
    """
    data = request.get_json()
    doc_id = data.get("doc_id") if data else None

    document_store = get_document_store()

    if not doc_id or doc_id not in document_store:
        return jsonify({"error": "Document not found"}), 404

    doc = document_store[doc_id]
    history = doc["chat_history"]

    if not history:
        return jsonify({"error": "No chat history to export"}), 400

    # Build plain text export
    lines = [
        f"SamChat — Conversation Export",
        f"Document: {doc['filename']}",
        f"Pages: {doc['page_count']}",
        "=" * 50,
        ""
    ]

    for msg in history:
        role = "You" if msg["role"] == "user" else "SamChat"
        lines.append(f"{role}:")
        lines.append(msg["content"])
        lines.append("")

    export_text = "\n".join(lines)
    return jsonify({"export": export_text, "filename": doc["filename"]}), 200
