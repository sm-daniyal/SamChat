// App.jsx — Root component
import { DocProvider } from "./context/DocContext";
import ChatLayout from "./pages/ChatLayout";

const App = () => (
  <DocProvider>
    <ChatLayout />
  </DocProvider>
);

export default App;
