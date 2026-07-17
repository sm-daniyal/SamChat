# ============================================================
# controllers/pdf_controller.py — PDF upload and management
# ============================================================

import os
import uuid
from flask import request, jsonify, current_app
from werkzeug.utils import secure_filename
from utils.pdf_utils import extract_text_from_pdf, chunk_text

# In-memory store for uploaded documents
# Key: doc_id, Value: { filename, text, chunks, page_count }
# In production this would be Redis or a database
document_store = {}

ALLOWED_EXTENSIONS = {"pdf"}


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def upload_pdf():
    """
    POST /api/pdf/upload
    Accepts a PDF file, extracts text, stores in memory.
    Returns a doc_id used for all future operations on this doc.
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Only PDF files are supported"}), 400

    # Check file size
    max_mb = int(os.getenv("MAX_FILE_SIZE_MB", 20))
    file.seek(0, 2)  # seek to end
    file_size_mb = file.tell() / (1024 * 1024)
    file.seek(0)     # seek back to start

    if file_size_mb > max_mb:
        return jsonify({"error": f"File too large. Maximum size is {max_mb} MB"}), 400

    # Save temporarily
    filename = secure_filename(file.filename)
    upload_folder = os.path.join(current_app.root_path, "uploads")
    os.makedirs(upload_folder, exist_ok=True)
    file_path = os.path.join(upload_folder, filename)
    file.save(file_path)

    # Extract text
    result = extract_text_from_pdf(file_path)

    # Clean up temp file
    os.remove(file_path)

    if not result["success"]:
        return jsonify({"error": f"Failed to parse PDF: {result['error']}"}), 500

    if not result["full_text"].strip():
        return jsonify({"error": "PDF appears to be empty or image-based (scanned PDF not supported yet)"}), 400

    # Store in memory with a unique ID
    doc_id = str(uuid.uuid4())
    document_store[doc_id] = {
        "doc_id":     doc_id,
        "filename":   result["filename"],
        "full_text":  result["full_text"],
        "chunks":     chunk_text(result["full_text"]),
        "page_count": result["page_count"],
        "char_count": result["total_chars"],
        "chat_history": []  # stores conversation per document
    }

    return jsonify({
        "success":    True,
        "doc_id":     doc_id,
        "filename":   result["filename"],
        "page_count": result["page_count"],
        "char_count": result["total_chars"],
        "message":    f"Successfully loaded {result['page_count']} pages"
    }), 201


def get_documents():
    """
    GET /api/pdf/documents
    Returns list of all uploaded documents in current session.
    """
    docs = [
        {
            "doc_id":     doc["doc_id"],
            "filename":   doc["filename"],
            "page_count": doc["page_count"],
            "char_count": doc["char_count"],
        }
        for doc in document_store.values()
    ]
    return jsonify({"documents": docs, "count": len(docs)}), 200


def delete_document(doc_id: str):
    """
    DELETE /api/pdf/documents/<doc_id>
    Remove a document from the session.
    """
    if doc_id not in document_store:
        return jsonify({"error": "Document not found"}), 404

    filename = document_store[doc_id]["filename"]
    del document_store[doc_id]

    return jsonify({"success": True, "message": f"Removed {filename}"}), 200


def get_document_store():
    """Expose store to other controllers."""
    return document_store
