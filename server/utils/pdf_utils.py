# ============================================================
# utils/pdf_utils.py — PDF text extraction using PyMuPDF
# ============================================================
# PyMuPDF (imported as fitz) is one of the fastest and most
# accurate PDF parsers available in Python.
# ============================================================

import fitz  # PyMuPDF
import os


def extract_text_from_pdf(file_path: str) -> dict:
    """
    Extract all text from a PDF file, page by page.
    Returns a dict with full text, page count, and per-page content.
    """
    try:
        doc = fitz.open(file_path)
        pages = []
        full_text = ""

        for page_num in range(len(doc)):
            page = doc[page_num]
            # extract_text() gets all text blocks in reading order
            text = page.get_text("text").strip()
            pages.append({
                "page": page_num + 1,
                "text": text,
                "char_count": len(text)
            })
            full_text += f"\n--- Page {page_num + 1} ---\n{text}\n"

        doc.close()

        return {
            "success": True,
            "full_text": full_text.strip(),
            "page_count": len(pages),
            "pages": pages,
            "total_chars": len(full_text),
            "filename": os.path.basename(file_path)
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


def chunk_text(text: str, chunk_size: int = 3000, overlap: int = 200) -> list:
    """
    Split long text into overlapping chunks for better AI context.
    Overlap ensures context isn't lost between chunks.
    
    Why chunk? Gemini has a context window limit — very long PDFs
    need to be split into manageable pieces.
    """
    if len(text) <= chunk_size:
        return [text]

    chunks = []
    start = 0

    while start < len(text):
        end = start + chunk_size
        # Try to break at a sentence boundary
        if end < len(text):
            # Look for last period or newline within the chunk
            break_point = text.rfind('. ', start, end)
            if break_point == -1:
                break_point = text.rfind('\n', start, end)
            if break_point != -1 and break_point > start:
                end = break_point + 1

        chunks.append(text[start:end])
        start = end - overlap  # overlap for context continuity

    return chunks


def get_relevant_chunks(chunks: list, query: str, max_chunks: int = 3) -> str:
    """
    Simple keyword-based chunk relevance scoring.
    Returns the most relevant chunks joined together.
    
    In production apps this would use vector embeddings (RAG),
    but for a college project this keyword approach works well.
    """
    query_words = set(query.lower().split())

    scored = []
    for i, chunk in enumerate(chunks):
        chunk_words = set(chunk.lower().split())
        # Score = number of query words found in this chunk
        score = len(query_words.intersection(chunk_words))
        scored.append((score, i, chunk))

    # Sort by score descending, take top N chunks
    scored.sort(key=lambda x: x[0], reverse=True)
    top_chunks = [chunk for _, _, chunk in scored[:max_chunks]]

    return "\n\n".join(top_chunks)
