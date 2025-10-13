import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { socket } from "../socket";

const languageTemplates = {
  javascript: "// Start coding...",
  python: "# Start coding...",
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Start coding...\n    return 0;\n}`,
  java: `public class Main {\n    public static void main(String[] args) {\n        // Start coding...\n    }\n}`,
};

// Debounce function
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
  const [code, setCode] = useState(languageTemplates[language]);
  const [consoleOutput, setConsoleOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [users, setUsers] = useState([]);

  // Ref to track remote updates to avoid infinite loop
  const isRemoteUpdate = useRef(false);

  // Debounced function to emit code changes
  const debouncedEmit = useRef(
    debounce((value) => {
      socket.emit("code-change", { roomId, code: value });
    }, 150)
  ).current;

  // Join room & set up socket listeners
  useEffect(() => {
    if (!roomId || !username) {
      navigate("/");
      return;
    }

    socket.emit("join-room", { roomId, username });

    socket.on("all-users", (roomUsers) => setUsers(roomUsers));
    socket.on("user-joined", (newUser) => console.log(`${newUser.username} joined`));
    socket.on("user-left", (id) => console.log(`User left: ${id}`));

    // Receive code updates from others
    socket.on("code-update", (newCode) => {
      isRemoteUpdate.current = true;
      setCode(newCode);
      setTimeout(() => {
        isRemoteUpdate.current = false;
      }, 0);
    });

    // Receive code execution output
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
    };
  }, [roomId, username, navigate]);

  // Update editor template when language changes **only if code is empty**
  useEffect(() => {
    setCode((prev) => (prev.trim() === "" ? languageTemplates[language] : prev));
  }, [language]);

  // Handle local code changes
  const handleCodeChange = (value) => {
    setCode(value);
    if (!isRemoteUpdate.current) {
      debouncedEmit(value);
    }
  };

  // Run code
  const runCode = () => {
    setIsRunning(true);
    setConsoleOutput("⏳ Running code...");
    socket.emit("run-code", { roomId, code, language, username });
  };

  // Leave room
  const leaveRoom = () => {
    socket.emit("leave-room", { roomId });
    navigate("/");
  };

  return (
    <div className="container-fluid py-3">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between bg-primary text-white rounded px-3 py-2 mb-3">
        <h5>Collaborative Code Editor</h5>
        <span className="badge bg-light text-dark">Room ID: {roomId}</span>
        <div className="d-flex align-items-center gap-2">
          <div>👤 {username}</div>
          <button className="btn btn-danger btn-sm" onClick={leaveRoom}>
            🚪 Leave Room
          </button>
        </div>
      </div>

      <div className="row g-3">
        {/* Sidebar */}
        <div className="col-md-3">
          <div className="card shadow-sm">
            <div className="card-header">👥 Users ({users.length})</div>
            <ul className="list-group list-group-flush">
              {users.map((u) => (
                <li key={u.id} className="list-group-item">
                  🟢 {u.username}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Main Editor */}
        <div className="col-md-9">
          <div className="d-flex mb-2 gap-2">
            <select
              className="form-select w-auto"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
            </select>
            <button
              className="btn btn-success"
              onClick={runCode}
              disabled={isRunning}
            >
              {isRunning ? "Running..." : "▶ Run"}
            </button>
          </div>

          <Editor
            height="50vh"
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

          {/* Console Output */}
          <div className="card mt-3 shadow-sm">
            <div className="card-header">Console Output</div>
            <div className="card-body">
              <pre
                style={{
                  background: "#0b0f14",
                  color: "#a8f0c6",
                  padding: "10px",
                  borderRadius: "5px",
                  height: "25vh",
                  overflowY: "auto",
                }}
              >
                {consoleOutput || "Run your code to see output..."}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
