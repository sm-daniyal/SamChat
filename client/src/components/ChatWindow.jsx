// components/ChatWindow.jsx — Main chat area
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import api from "../api";
import { useDoc } from "../context/DocContext";
import "./ChatWindow.css";

const ChatWindow = () => {
  const { activeDoc, isMultiMode, chatHistory, addMessage, clearChat } = useDoc();
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const bottomRef = useRef(null);

  // Determine which chat history to show
  const currentDocId = isMultiMode ? "__multi__" : activeDoc?.doc_id;
  const messages = currentDocId ? (chatHistory[currentDocId] || []) : [];

  // Auto-scroll to bottom on new messages
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
    const userMsg = { role: "user", content: "📋 Summarize this document" };
    addMessage(currentDocId, userMsg);
    setLoading(true);

    try {
      const { data } = await api.post("/chat/summarize", { doc_id: activeDoc.doc_id });
      addMessage(currentDocId, { role: "assistant", content: data.summary });
    } catch (err) {
      setError("Summary failed");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPoints = async () => {
    if (!activeDoc || loading) return;
    const userMsg = { role: "user", content: "🔑 Extract key points" };
    addMessage(currentDocId, userMsg);
    setLoading(true);

    try {
      const { data } = await api.post("/chat/keypoints", { doc_id: activeDoc.doc_id });
      addMessage(currentDocId, { role: "assistant", content: data.key_points });
    } catch (err) {
      setError("Key points extraction failed");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!activeDoc) return;
    try {
      const { data } = await api.post("/chat/export", { doc_id: activeDoc.doc_id });
      // Trigger browser download
      const blob = new Blob([data.export], { type: "text/plain" });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `samchat-${data.filename}.txt`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Export failed");
    }
  };

  const handleClear = () => {
    if (currentDocId) clearChat(currentDocId);
  };

  // ── No doc selected ────────────────────────────────────────
  if (!activeDoc && !isMultiMode) {
    return (
      <div className="chat-empty">
        <div className="chat-empty-icon">💬</div>
        <h2>Start chatting with your documents</h2>
        <p>Upload a PDF from the sidebar to get started.<br />Ask questions, get summaries, extract key points.</p>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <span className="chat-doc-icon">{isMultiMode ? "🔗" : "📄"}</span>
          <div>
            <p className="chat-doc-name">
              {isMultiMode ? "Multi-document chat" : activeDoc?.filename}
            </p>
            {activeDoc && !isMultiMode && (
              <p className="chat-doc-meta">{activeDoc.page_count} pages · {messages.length} messages</p>
            )}
          </div>
        </div>
        <div className="chat-header-actions">
          {!isMultiMode && activeDoc && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={handleSummarize} disabled={loading}>📋 Summarize</button>
              <button className="btn btn-ghost btn-sm" onClick={handleKeyPoints} disabled={loading}>🔑 Key Points</button>
              <button className="btn btn-ghost btn-sm" onClick={handleExport}>⬇ Export</button>
            </>
          )}
          {messages.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={handleClear}>Clear</button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-start-hint">
            <p>Ask anything about <strong>{isMultiMode ? "your documents" : activeDoc?.filename}</strong></p>
            <div className="suggestion-chips">
              {["What is this document about?", "What are the main conclusions?", "Explain the key concepts"].map(s => (
                <button key={s} className="chip" onClick={() => setInput(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role} fade-in`}>
            <div className="message-avatar">
              {msg.role === "user" ? "U" : "S"}
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
            <div className="message-avatar">S</div>
            <div className="message-bubble typing">
              <span /><span /><span />
            </div>
          </div>
        )}

        {error && <div className="alert alert-error" style={{ margin: "0 20px" }}>{error}</div>}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form className="chat-input-area" onSubmit={sendMessage}>
        <input
          type="text"
          className="chat-input"
          placeholder={isMultiMode ? "Ask across all documents…" : `Ask about ${activeDoc?.filename}…`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          autoFocus
        />
        <button className="btn btn-primary" type="submit" disabled={loading || !input.trim()}>
          {loading ? <span className="spinner" /> : "Send"}
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;
