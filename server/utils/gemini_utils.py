# ============================================================
# utils/gemini_utils.py — All Gemini AI interactions
# ============================================================
# Google Gemini API is free to use (up to rate limits).
# We use it for: chat, summarization, key point extraction.
# ============================================================

import google.generativeai as genai
import os


def init_gemini():
    """Initialize Gemini with API key from environment."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in environment variables")
    genai.configure(api_key=api_key)


def get_model():
    """Return the Gemini model instance."""
    # gemini-1.5-flash is fast and free-tier friendly
    return genai.GenerativeModel("gemini-flash-lite-latest")


def chat_with_document(document_context: str, question: str, chat_history: list) -> str:
    """
    Answer a user question based on the document context.
    
    Args:
        document_context: Relevant text extracted from the PDF
        question: User's question
        chat_history: Previous messages for conversation continuity
    
    Returns:
        AI-generated answer string
    """
    model = get_model()

    # Build conversation history for Gemini
    # Format: alternating user/model messages
    history = []
    for msg in chat_history[:-1]:  # exclude the current question
        if msg["role"] == "user":
            history.append({"role": "user", "parts": [msg["content"]]})
        elif msg["role"] == "assistant":
            history.append({"role": "model", "parts": [msg["content"]]})

    # System instruction baked into first user message
    system_prompt = f"""You are SamChat, an intelligent document assistant. 
You help users understand and analyze PDF documents.

DOCUMENT CONTEXT:
{document_context}

INSTRUCTIONS:
- Answer questions based ONLY on the document content above
- If the answer is not in the document, say "I couldn't find that information in the document"
- Be concise, accurate, and helpful
- Reference specific parts of the document when relevant
- Maintain conversation context from chat history
"""
    # Start chat session with history
    chat = model.start_chat(history=history)

    # Send the question with document context
    full_prompt = f"{system_prompt}\n\nUser Question: {question}"
    response = chat.send_message(full_prompt)

    return response.text


def summarize_document(text: str) -> str:
    """
    Generate a comprehensive summary of the document.
    """
    model = get_model()

    prompt = f"""Please provide a comprehensive summary of the following document.

Structure your summary as:
1. **Overview** (2-3 sentences about what this document is)
2. **Main Topics** (bullet points of key subjects covered)
3. **Key Findings/Points** (most important information)
4. **Conclusion** (what the document concludes or recommends)

DOCUMENT:
{text[:8000]}  # Limit to avoid token overflow

Keep the summary clear, professional, and well-structured."""

    response = model.generate_content(prompt)
    return response.text


def extract_key_points(text: str) -> str:
    """
    Extract key points from the document as a clean bullet list.
    """
    model = get_model()

    prompt = f"""Extract the most important key points from this document.

Format your response as:
- A clean numbered list of key points
- Each point should be 1-2 sentences max
- Focus on facts, decisions, conclusions, and important data
- Extract 8-12 key points maximum

DOCUMENT:
{text[:8000]}"""

    response = model.generate_content(prompt)
    return response.text


def analyze_multiple_docs(docs_context: str, question: str) -> str:
    """
    Answer questions that span across multiple uploaded documents.
    """
    model = get_model()

    prompt = f"""You are SamChat analyzing multiple documents simultaneously.

{docs_context}

User Question: {question}

Instructions:
- Reference which document your answer comes from (e.g., "In Document 1...")
- Compare and contrast information across documents if relevant
- If the answer is not in any document, say so clearly"""

    response = model.generate_content(prompt)
    return response.text
