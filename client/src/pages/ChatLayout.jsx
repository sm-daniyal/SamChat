// pages/ChatLayout.jsx — Main page layout
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import "./ChatLayout.css";

const ChatLayout = () => (
  <div className="chat-layout">
    <Sidebar />
    <ChatWindow />
  </div>
);

export default ChatLayout;
