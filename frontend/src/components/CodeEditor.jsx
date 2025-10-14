import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { socket } from "../socket";
import "../styles/Editor.css";

const languageTemplates = {
  javascript: "// Start coding...",
  python: "# Start coding...",
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Start coding...\n    return 0;\n}`,
  java: `public class Main {\n    public static void main(String[] args) {\n        // Start coding...\n    }\n}`,
};

// Debounce function to reduce unnecessary socket emissions
const debounce = (fn, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

const CodeEditor = ({ roomId, username }) => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(languageTemplates["javascript"]);
  const [consoleOutput, setConsoleOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [users, setUsers] = useState([]);
  const [consoleHeight, setConsoleHeight] = useState(200);
  const isRemoteUpdate = useRef(false);
  const isResizing = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const debouncedEmit = useRef(
    debounce((value) => {
      socket.emit("code-change", { roomId, code: value });
    }, 150)
  ).current;

  useEffect(() => {
    if (!roomId || !username) {
      navigate("/");
      return;
    }

    socket.emit("join-room", { roomId, username });

    socket.on("all-users", (roomUsers) => setUsers(roomUsers));
    socket.on("user-joined", (newUser) => console.log(`${newUser.username} joined`));
    socket.on("user-left", (id) => console.log(`User left: ${id}`));

    socket.on("code-update", (newCode) => {
      isRemoteUpdate.current = true;
      setCode(newCode);
      setTimeout(() => (isRemoteUpdate.current = false), 0);
    });

    // Receive language updates from other users
    socket.on("language-update", ({ language: newLang }) => {
      console.log("Received language update:", newLang);
      setLanguage(newLang);
      setCode(languageTemplates[newLang]);
    });

    socket.on("code-output", ({ output, error, runBy }) => {
      setIsRunning(false);
      setConsoleOutput(
        error
          ? `❌ Error (by ${runBy}):\n${output}`
          : `👤 ${runBy} ran the code:\n\n${output}`
      );
    });

    return () => {
      socket.emit("leave-room", { roomId });
      socket.off("all-users");
      socket.off("user-joined");
      socket.off("user-left");
      socket.off("code-update");
      socket.off("code-output");
      socket.off("language-update");
    };
  }, [roomId, username, navigate]);

  // Handle console resizing
  const handleMouseDown = (e) => {
    isResizing.current = true;
    startY.current = e.clientY;
    startHeight.current = consoleHeight;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing.current) return;
      
      const deltaY = startY.current - e.clientY;
      const newHeight = Math.min(Math.max(startHeight.current + deltaY, 100), 600);
      setConsoleHeight(newHeight);
    };

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [consoleHeight]);

  const handleCodeChange = (value) => {
    setCode(value);
    if (!isRemoteUpdate.current) {
      debouncedEmit(value);
    }
  };

  // Handle language change with synchronization
  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    setCode(languageTemplates[newLang]); // Update code template for the user who changed it
    // Emit language change to other users in the room
    socket.emit("language-update", { roomId, language: newLang });
    console.log("Language sent:", newLang);
  };

  const runCode = () => {
    setIsRunning(true);
    setConsoleOutput("⏳ Running code...");
    socket.emit("run-code", { roomId, code, language, username });
  };

  const leaveRoom = () => {
    socket.emit("leave-room", { roomId });
    navigate("/");
  };

  return (
    <div className="editor-container">
      {/* ===== HEADER ===== */}
      <div className="editor-header">
        <div className="title">💻 Collaborative Code Editor</div>
        <div className="room-id">Room ID: {roomId}</div>
        <div>
          👤 {username}
          <button className="leave-btn" onClick={leaveRoom}>
            🚪 Leave Room
          </button>
        </div>
      </div>

      {/* ===== TOOLBAR ===== */}
      <div className="editor-toolbar">
        <select
          className="language-selector"
          value={language}
          onChange={handleLanguageChange}
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="cpp">C++</option>
          <option value="java">Java</option>
        </select>
        <button className="run-btn" onClick={runCode} disabled={isRunning}>
          {isRunning ? "Running..." : "▶ Run"}
        </button>
      </div>

      {/* ===== MAIN SECTION ===== */}
      <div className="main-content">
        {/* Users list */}
        <div className="user-list">
          <h3>Users ({users.length})</h3>
          {users.map((u) => (
            <div key={u.id} className="user">
              <div className="status"></div>
              <span>{u.username}</span>
            </div>
          ))}
        </div>

        {/* Editor and console */}
        <div className="editor-section">
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Editor
              height="100%"
              language={language}
              theme="vs-dark"
              value={code}
              onChange={handleCodeChange}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                automaticLayout: true,
                suggestOnTriggerCharacters: true,
              }}
            />
          </div>
          <div className="resize-handle" onMouseDown={handleMouseDown}>
            <div className="resize-bar"></div>
          </div>
          <div className="console-container" style={{ height: `${consoleHeight}px`, flexShrink: 0 }}>
            <div className="console-output">
              {consoleOutput || "Run your code to see output..."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;