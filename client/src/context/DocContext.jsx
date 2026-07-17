// context/DocContext.jsx — Global state for uploaded documents
import { createContext, useContext, useState } from "react";

const DocContext = createContext(null);

export const DocProvider = ({ children }) => {
  const [documents, setDocuments]       = useState([]);  // all uploaded docs
  const [activeDoc, setActiveDoc]       = useState(null); // currently selected doc
  const [chatHistory, setChatHistory]   = useState({});   // docId → messages[]
  const [isMultiMode, setIsMultiMode]   = useState(false); // chat across all docs

  const addDocument = (doc) => {
    setDocuments(prev => [...prev, doc]);
    setActiveDoc(doc); // auto-select newly uploaded doc
    // Initialize empty chat for this doc
    setChatHistory(prev => ({ ...prev, [doc.doc_id]: [] }));
  };

  const removeDocument = (docId) => {
    setDocuments(prev => prev.filter(d => d.doc_id !== docId));
    if (activeDoc?.doc_id === docId) {
      // Select the first remaining doc, or null
      setActiveDoc(documents.find(d => d.doc_id !== docId) || null);
    }
    setChatHistory(prev => {
      const updated = { ...prev };
      delete updated[docId];
      return updated;
    });
  };

  const addMessage = (docId, message) => {
    setChatHistory(prev => ({
      ...prev,
      [docId]: [...(prev[docId] || []), message]
    }));
  };

  const clearChat = (docId) => {
    setChatHistory(prev => ({ ...prev, [docId]: [] }));
  };

  return (
    <DocContext.Provider value={{
      documents, activeDoc, chatHistory, isMultiMode,
      setActiveDoc, setIsMultiMode,
      addDocument, removeDocument, addMessage, clearChat
    }}>
      {children}
    </DocContext.Provider>
  );
};

export const useDoc = () => useContext(DocContext);
