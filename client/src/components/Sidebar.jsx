// components/Sidebar.jsx — SamChat v2 Retro-Military
import { useRef, useState } from "react";
import api from "../api";
import { useDoc } from "../context/DocContext";
import "./Sidebar.css";

// Globe SVG logo — inspired by the Casio earth design
const GlobeLogo = () => (
  <svg className="brand-globe" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Outer ring */}
    <circle cx="19" cy="19" r="17" stroke="#7ab648" strokeWidth="1.5" fill="none" opacity="0.6"/>
    {/* Globe circle */}
    <circle cx="19" cy="19" r="13" stroke="#7ab648" strokeWidth="1" fill="rgba(122,182,72,0.08)"/>
    {/* Latitude lines */}
    <ellipse cx="19" cy="19" rx="13" ry="5" stroke="#7ab648" strokeWidth="0.6" fill="none" opacity="0.4"/>
    <ellipse cx="19" cy="19" rx="13" ry="9" stroke="#7ab648" strokeWidth="0.6" fill="none" opacity="0.3"/>
    {/* Vertical meridian */}
    <line x1="19" y1="6" x2="19" y2="32" stroke="#7ab648" strokeWidth="0.6" opacity="0.4"/>
    {/* Horizontal equator */}
    <line x1="6" y1="19" x2="32" y2="19" stroke="#7ab648" strokeWidth="0.6" opacity="0.4"/>
    {/* Crosshair center */}
    <circle cx="19" cy="19" r="2" fill="#7ab648" opacity="0.9"/>
    {/* Crosshair ticks */}
    <line x1="19" y1="15" x2="19" y2="17" stroke="#7ab648" strokeWidth="1.2"/>
    <line x1="19" y1="21" x2="19" y2="23" stroke="#7ab648" strokeWidth="1.2"/>
    <line x1="15" y1="19" x2="17" y2="19" stroke="#7ab648" strokeWidth="1.2"/>
    <line x1="21" y1="19" x2="23" y2="19" stroke="#7ab648" strokeWidth="1.2"/>
    {/* Corner brackets */}
    <path d="M6 10 L6 6 L10 6" stroke="#7ab648" strokeWidth="1" fill="none" opacity="0.7"/>
    <path d="M28 6 L32 6 L32 10" stroke="#7ab648" strokeWidth="1" fill="none" opacity="0.7"/>
    <path d="M6 28 L6 32 L10 32" stroke="#7ab648" strokeWidth="1" fill="none" opacity="0.7"/>
    <path d="M28 32 L32 32 L32 28" stroke="#7ab648" strokeWidth="1" fill="none" opacity="0.7"/>
  </svg>
);

const Sidebar = () => {
  const { documents, activeDoc, isMultiMode, setActiveDoc, setIsMultiMode, addDocument, removeDocument } = useDoc();
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [dragging, setDragging]   = useState(false);
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
        <GlobeLogo />
        <div className="brand-text">
          <div className="brand-name">SamChat</div>
          <div className="brand-sub">AI Document Assistant</div>
        </div>
      </div>

      {/* Status bar */}
      <div className="sidebar-status">
        <span className="status-dot" />
        <span className="status-text">System Online · {documents.length} doc{documents.length !== 1 ? "s" : ""} loaded</span>
      </div>

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
          <><span className="spinner" /><span className="upload-text">Processing…</span></>
        ) : (
          <>
            <span className="upload-icon">⬆</span>
            <p className="upload-text"><strong>Upload PDF</strong> or drag & drop</p>
            <p className="upload-hint">Max 20 MB · PDF only</p>
          </>
        )}
      </div>

      {uploadErr && <p className="upload-err">⚠ {uploadErr}</p>}

      {/* Document list */}
      {documents.length > 0 && (
        <>
          <div className="docs-header">
            <span className="docs-label">Documents [{documents.length}]</span>
            {documents.length > 1 && (
              <button
                className={`btn btn-xs ${isMultiMode ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setIsMultiMode(!isMultiMode)}
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
                <button className="doc-delete" onClick={(e) => handleDelete(e, doc.doc_id)}>✕</button>
              </div>
            ))}
          </div>

          {isMultiMode && (
            <div className="multi-badge">
              ⊕ Cross-referencing {documents.length} documents
            </div>
          )}
        </>
      )}

      {documents.length === 0 && (
        <div className="empty-state">
          <p>Upload a PDF<br />to begin analysis</p>
        </div>
      )}

      {/* Footer */}
      <div className="sidebar-footer">
        <span>SamChat v2.0</span>
        <span className="footer-dot" />
        <span>Gemini AI</span>
      </div>
    </aside>
  );
};

export default Sidebar;
