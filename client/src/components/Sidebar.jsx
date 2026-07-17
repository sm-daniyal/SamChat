// components/Sidebar.jsx — Left panel with doc list + upload
import { useRef, useState } from "react";
import api from "../api";
import { useDoc } from "../context/DocContext";
import "./Sidebar.css";

const Sidebar = () => {
  const { documents, activeDoc, isMultiMode, setActiveDoc, setIsMultiMode, addDocument, removeDocument } = useDoc();
  const [uploading, setUploading]   = useState(false);
  const [uploadErr, setUploadErr]   = useState("");
  const [dragging, setDragging]     = useState(false);
  const inputRef = useRef(null);

  const uploadFile = async (file) => {
    if (!file || file.type !== "application/pdf") {
      setUploadErr("Only PDF files supported");
      return;
    }
    setUploading(true);
    setUploadErr("");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data } = await api.post("/pdf/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      addDocument(data);
    } catch (err) {
      setUploadErr(err.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async (e, docId) => {
    e.stopPropagation();
    try {
      await api.delete(`/pdf/documents/${docId}`);
      removeDocument(docId);
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    uploadFile(e.dataTransfer.files[0]);
  };

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-icon">💬</div>
        <div>
          <h1 className="brand-name">SamChat</h1>
          <p className="brand-sub">AI Document Assistant</p>
        </div>
      </div>

      <div className="sidebar-divider" />

      {/* Upload zone */}
      <div
        className={`upload-zone ${dragging ? "dragging" : ""} ${uploading ? "uploading" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept=".pdf" hidden onChange={(e) => uploadFile(e.target.files[0])} />
        {uploading ? (
          <><span className="spinner" /><span>Uploading…</span></>
        ) : (
          <>
            <span className="upload-icon">⬆</span>
            <span className="upload-text"><strong>Upload PDF</strong> or drag & drop</span>
          </>
        )}
      </div>

      {uploadErr && <p className="upload-err">{uploadErr}</p>}

      {/* Document list */}
      {documents.length > 0 && (
        <>
          <div className="docs-header">
            <span className="docs-label">Documents ({documents.length})</span>
            {documents.length > 1 && (
              <button
                className={`btn btn-xs ${isMultiMode ? "btn-accent-ghost" : "btn-ghost"}`}
                onClick={() => setIsMultiMode(!isMultiMode)}
                title="Chat across all documents"
              >
                {isMultiMode ? "✓ Multi" : "Multi"}
              </button>
            )}
          </div>

          <div className="doc-list">
            {documents.map((doc) => (
              <div
                key={doc.doc_id}
                className={`doc-item ${activeDoc?.doc_id === doc.doc_id && !isMultiMode ? "active" : ""}`}
                onClick={() => { setActiveDoc(doc); setIsMultiMode(false); }}
              >
                <span className="doc-icon">📄</span>
                <div className="doc-info">
                  <p className="doc-name" title={doc.filename}>{doc.filename}</p>
                  <p className="doc-meta">{doc.page_count} pages</p>
                </div>
                <button className="doc-delete" onClick={(e) => handleDelete(e, doc.doc_id)} title="Remove">✕</button>
              </div>
            ))}
          </div>

          {isMultiMode && (
            <div className="multi-badge">
              <span>🔗</span> Chatting across all {documents.length} docs
            </div>
          )}
        </>
      )}

      {documents.length === 0 && (
        <div className="empty-state">
          <p>Upload a PDF to start chatting with it</p>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
