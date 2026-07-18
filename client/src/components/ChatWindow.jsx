// components/ChatWindow.jsx — SamChat v2 Retro-Military
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import api from "../api";
import { useDoc } from "../context/DocContext";
import "./ChatWindow.css";

// Large globe for empty state
const EmptyGlobe = () => (
  <svg className="chat-empty-globe" width="90" height="90" viewBox="0 0 90 90" fill="none">
    <circle cx="45" cy="45" r="42" stroke="#7ab648" strokeWidth="1" fill="none" opacity="0.3"/>
    <circle cx="45" cy="45" r="34" stroke="#7ab648" strokeWidth="1.2" fill="rgba(122,182,72,0.05)"/>
    <ellipse cx="45" cy="45" rx="34" ry="13" stroke="#7ab648" strokeWidth="0.8" fill="none" opacity="0.35"/>
    <ellipse cx="45" cy="45" rx="34" ry="22" stroke="#7ab648" strokeWidth="0.8" fill="none" opacity="0.25"/>
    <line x1="45" y1="11" x2="45" y2="79" stroke="#7ab648" strokeWidth="0.8" opacity="0.35"/>
    <line x1="11" y1="45" x2="79" y2="45" stroke="#7ab648" strokeWidth="0.8" opacity="0.35"/>
    <circle cx="45" cy="45" r="4" fill="#7ab648" opacity="0.9"/>
    <line x1="45" y1="37" x2="45" y2="42" stroke="#7ab648" strokeWidth="2"/>
    <line x1="45" y1="48" x2="45" y2="53" stroke="#7ab648" strokeWidth="2"/>
    <line x1="37" y1="45" x2="42" y2="45" stroke="#7ab648" strokeWidth="2"/>
    <line x1="48" y1="45" x2="53" y2="45" stroke="#7ab648" strokeWidth="2"/>
    <path d="M11 20 L11 11 L20 11" stroke="#7ab648" strokeWidth="1.2" fill="none" opacity="0.6"/>
    <path d="M70 11 L79 11 L79 20" stroke="#7ab648" strokeWidth="1.2" fill="none" opacity="0.6"/>
    <path d="M11 70 L11 79 L20 79" stroke="#7ab648" strokeWidth="1.2" fill="none" opacity="0.6"/>
    <path d="M70 79 L79 79 L79 70" stroke="#7ab648" strokeWidth="1.2" fill="none" opacity="0.6"/>
  </svg>
);

const ChatWindow = () => {
  const { activeDoc, isMultiMode, chatHistory, addMessage, clearChat } = useDoc();
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const bottomRef = useRef(null);

  const currentDocId = isMultiMode ? "__multi__" : activeDoc?.doc_id;
  const messages = currentDocId ? (chatHistory[currentDocId] || []) : [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    if (!activeDoc && !isMultiMode) return;

    const userMsg = { role: "user", content: input.trim() };
    addMessage(currentDocId, userMsg);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const payload = isMultiMode
        ? { message: userMsg.content, mode: "multi" }
        : { doc_id: activeDoc.doc_id, message: userMsg.content, mode: "chat" };

      const { data } = await api.post("/chat/", payload);
      addMessage(currentDocId, { role: "assistant", content: data.response });
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (!activeDoc || loading) return;
    addMessage(currentDocId, { role: "user", content: "📋 Summarize this document" });
    setLoading(true);
    try {
      const { data } = await api.post("/chat/summarize", { doc_id: activeDoc.doc_id });
      addMessage(currentDocId, { role: "assistant", content: data.summary });
    } catch { setError("Summary failed"); }
    finally { setLoading(false); }
  };

  const handleKeyPoints = async () => {
    if (!activeDoc || loading) return;
    addMessage(currentDocId, { role: "user", content: "🔑 Extract key points" });
    setLoading(true);
    try {
      const { data } = await api.post("/chat/keypoints", { doc_id: activeDoc.doc_id });
      addMessage(currentDocId, { role: "assistant", content: data.key_points });
    } catch { setError("Key points failed"); }
    finally { setLoading(false); }
  };

  const handleExport = async () => {
    if (!activeDoc) return;
    try {
      const { data } = await api.post("/chat/export", { doc_id: activeDoc.doc_id });
      const blob = new Blob([data.export], { type: "text/plain" });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `samchat-${data.filename}.txt`;
      link.click();
      URL.revokeObjectURL(url);
    } catch { setError("Export failed"); }
  };

  // ── Empty state ──────────────────────────────────────────────
  if (!activeDoc && !isMultiMode) {
    return (
      <div className="chat-window" style={{ alignItems: "center", justifyContent: "center" }}>
        <div className="chat-empty">
          <EmptyGlobe />
          <h2>Document Analysis Ready</h2>
          <p>
            Upload a PDF from the sidebar<br />
            to begin intelligent analysis<br />
            ── powered by Gemini AI ──
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <div className="chat-breadcrumb">
            <span>SAMCHAT</span>
            <span className="chat-breadcrumb-sep">/</span>
            <span>{isMultiMode ? "MULTI-DOC" : "ANALYSIS"}</span>
            <span className="chat-breadcrumb-sep">/</span>
          </div>
          <p className="chat-doc-name">
            {isMultiMode ? "Cross-document query" : activeDoc?.filename}
          </p>
          {activeDoc && !isMultiMode && (
            <span className="chat-doc-meta">· {activeDoc.page_count}p · {messages.length} msg</span>
          )}
        </div>

        {/* Action buttons */}
        <div className="chat-actions">
          {!isMultiMode && activeDoc && (
            <>
              <button className="btn-action" onClick={handleSummarize} disabled={loading}>
                ◈ Summarize
              </button>
              <button className="btn-action" onClick={handleKeyPoints} disabled={loading}>
                ◆ Key Points
              </button>
              <button className="btn-action" onClick={handleExport}>
                ↓ Export
              </button>
            </>
          )}
          {messages.length > 0 && (
            <button className="btn-action" onClick={() => clearChat(currentDocId)}>
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-start-hint">
            <p>Query active document — <strong>{isMultiMode ? "all documents" : activeDoc?.filename}</strong></p>
            <div className="suggestion-chips">
              {[
                "What is this document about?",
                "What are the main conclusions?",
                "Explain the key concepts"
              ].map(s => (
                <button key={s} className="chip" onClick={() => setInput(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role} fade-in`}>
            <div className="message-avatar">
              {msg.role === "user" ? "USR" : "SAM"}
            </div>
            <div className="message-bubble">
              {msg.role === "assistant" ? (
                <div className="markdown-content">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="message assistant fade-in">
            <div className="message-avatar">SAM</div>
            <div className="message-bubble typing">
              <span /><span /><span />
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-error fade-in" style={{ margin: "0 4px" }}>
            ⚠ {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form className="chat-input-area" onSubmit={sendMessage}>
        <span className="input-prompt">&gt;_</span>
        <input
          type="text"
          className="chat-input"
          placeholder={
            isMultiMode
              ? "Query across all documents…"
              : `Ask about ${activeDoc?.filename}…`
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          autoFocus
        />
        <button className="btn btn-primary" type="submit" disabled={loading || !input.trim()}>
          {loading ? <span className="spinner" /> : "Send ↵"}
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;
