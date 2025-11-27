import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { socket } from "../socket";
import ChatPanel from "./ChatPanel";
import { formatCode, getFormattingMessage } from "../utils/codeFormatter";
import { 
  emitCodeChange, 
  emitLanguageChange, 
  runCode as executeCode,
  leaveRoom,
  emitConsoleHeight,
  emitConsoleVisibility,
  emitInputVisibility,
  emitOutputVisibility,
  onConsoleHeightChange,
  onConsoleVisibilityChange,
  onInputVisibilityChange,
  onOutputVisibilityChange,
  emitInputChange,
  onInputChange,
  emitClearOutput,
  onClearOutput
} from "../utils/socketHandler";
import { 
  languageTemplates, 
  defineCustomTheme, 
  editorOptions 
} from "../utils/editorConfig";
import { 
  emitCursorPosition, 
  setupCursorListener, 
  throttle 
} from "../utils/cursorTracker";
import { useCollaboration } from "../hooks/useCollaboration";
import ConsoleManager from "../components/ConsoleManager";
import CursorOverlay from "./CursorOverlay";
import AccessRequestNotification from "../components/AccessRequestNotification";
import "../styles/Editor.css";

const CURSOR_TIMEOUT = 15000;
const SYNC_TIMEOUT = 500;
const DEBOUNCE_CODE = 300;
const DEBOUNCE_CONSOLE = 200;
const DEBOUNCE_INPUT = 200;
const THROTTLE_CURSOR = 150;

const debounce = (fn, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

const CodeEditor = ({ roomId, username }) => {
  const navigate = useNavigate();
  
  const {
    users,
    language,
    setLanguage,
    code,
    setCode,
    consoleOutput,
    setConsoleOutput,
    isRunning,
    setIsRunning,
    isConsoleVisible,
    setIsConsoleVisible,
    isOutputOpen,
    setIsOutputOpen,
    isInputOpen,
    setIsInputOpen,
    isRemoteUpdate,
  } = useCollaboration(socket, roomId, username);

  const [input, setInput] = useState("");
  const [consoleHeight, setConsoleHeight] = useState(300);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [syncStatus, setSyncStatus] = useState("connected");
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  const editorRef = useRef(null);
  const isResizing = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);
  const isRemoteConsoleUpdate = useRef(false);
  const isRemoteInputUpdate = useRef(false);

  const debouncedEmit = useRef(
    debounce((value) => {
      if (!isRemoteUpdate.current) {
        emitCodeChange(socket, roomId, value);
        setSyncStatus("syncing");
        setTimeout(() => setSyncStatus("connected"), SYNC_TIMEOUT);
      }
    }, DEBOUNCE_CODE)
  ).current;

  const debouncedConsoleHeight = useRef(
    debounce((height) => {
      if (!isRemoteConsoleUpdate.current) {
        emitConsoleHeight(socket, roomId, height);
      }
    }, DEBOUNCE_CONSOLE)
  ).current;

  const debouncedInputEmit = useRef(
    debounce((value) => {
      if (!isRemoteInputUpdate.current) {
        emitInputChange(socket, roomId, value);
      }
    }, DEBOUNCE_INPUT)
  ).current;

  const showToast = (message) => {
    setNotificationMessage(message);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const handleMouseDown = (e) => {
    isResizing.current = true;
    startY.current = e.clientY;
    startHeight.current = consoleHeight;
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing.current) return;
      const deltaY = startY.current - e.clientY;
      const newHeight = Math.min(Math.max(startHeight.current + deltaY, 150), 600);
      setConsoleHeight(newHeight);
      debouncedConsoleHeight(newHeight);
    };

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [consoleHeight, debouncedConsoleHeight]);

  useEffect(() => {
    if (!socket) return;

    onConsoleHeightChange(socket, (height) => {
      isRemoteConsoleUpdate.current = true;
      setConsoleHeight(height);
      requestAnimationFrame(() => {
        isRemoteConsoleUpdate.current = false;
      });
    });

    onConsoleVisibilityChange(socket, (isVisible) => {
      setIsConsoleVisible(isVisible);
    });

    onInputVisibilityChange(socket, (isInputOpen) => {
      setIsInputOpen(isInputOpen);
    });

    onOutputVisibilityChange(socket, (isOutputOpen) => {
      setIsOutputOpen(isOutputOpen);
    });

    onInputChange(socket, (remoteInput) => {
      isRemoteInputUpdate.current = true;
      setInput(remoteInput);
      requestAnimationFrame(() => {
        isRemoteInputUpdate.current = false;
      });
    });

    onClearOutput(socket, () => {
      setConsoleOutput("");
    });

    return () => {
      socket.off("console:clear-output");
    };
  }, [socket, setIsConsoleVisible, setIsInputOpen, setIsOutputOpen]);

  const handleCodeChange = (value) => {
    setCode(value);
    if (!isRemoteUpdate.current) {
      debouncedEmit(value);
    }
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    defineCustomTheme(monaco);

    editor.onDidCompositionStart(() => {
      isRemoteUpdate.current = true;
    });

    editor.onDidCompositionEnd(() => {
      setTimeout(() => {
        isRemoteUpdate.current = false;
      }, 100);
    });

    const throttledCursorEmit = throttle((position) => {
      if (position && position.lineNumber && position.column) {
        emitCursorPosition(socket, roomId, position);
      }
    }, THROTTLE_CURSOR);

    editor.onDidChangeCursorPosition((e) => {
      if (e.position) {
        throttledCursorEmit(e.position);
      }
    });
  };

  useEffect(() => {
    if (!socket) return;

    const cursorTimeouts = new Map();

    const handleCursorUpdate = ({ userId, username: remoteUsername, position }) => {
      if (!userId || !position) return;
      if (userId === socket.id) return;
      if (remoteUsername === username) return;
      if (!position.lineNumber || !position.column || 
          position.lineNumber < 1 || position.column < 1) {
        return;
      }

      if (cursorTimeouts.has(userId)) {
        clearTimeout(cursorTimeouts.get(userId));
      }

      setRemoteCursors((prev) => ({
        ...prev,
        [userId]: { 
          username: remoteUsername, 
          position: {
            lineNumber: position.lineNumber,
            column: position.column
          }
        },
      }));

      const timeout = setTimeout(() => {
        setRemoteCursors((prev) => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });
        cursorTimeouts.delete(userId);
      }, CURSOR_TIMEOUT);

      cursorTimeouts.set(userId, timeout);
    };

    const unsubscribe = setupCursorListener(socket, handleCursorUpdate);

    return () => {
      if (unsubscribe) unsubscribe();
      cursorTimeouts.forEach((timeout) => clearTimeout(timeout));
      cursorTimeouts.clear();
      setRemoteCursors({});
    };
  }, [socket, username]);

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    setCode(languageTemplates[newLang]);
    emitLanguageChange(socket, roomId, newLang);
    showToast(`Switched to ${newLang}`);
  };

  const handleFormatCode = () => {
    const formatted = formatCode(code, language);
    setCode(formatted);
    emitCodeChange(socket, roomId, formatted);
    showToast("Code formatted");
    
    const originalOutput = consoleOutput;
    setConsoleOutput(getFormattingMessage(language));
    setTimeout(() => {
      setConsoleOutput(originalOutput);
    }, 2000);
  };

  const handleRunCode = () => {
    setIsRunning(true);
    setConsoleOutput("Executing...");
    executeCode(socket, roomId, code, language, username, input);
    showToast("Running code");
  };

  const handleLeaveRoom = () => {
    leaveRoom(socket, roomId);
    navigate("/");
  };

  const handleToggleConsole = () => {
    setIsConsoleVisible(!isConsoleVisible);
    emitConsoleVisibility(socket, roomId, !isConsoleVisible);
  };

  const handleToggleInput = () => {
    setIsInputOpen(!isInputOpen);
    emitInputVisibility(socket, roomId, !isInputOpen);
  };

  const handleToggleOutput = () => {
    setIsOutputOpen(!isOutputOpen);
    emitOutputVisibility(socket, roomId, !isOutputOpen);
  };

  const handleInputChange = (value) => {
    setInput(value);
    debouncedInputEmit(value);
  };

  const handleClearOutput = () => {
    setConsoleOutput("");
    emitClearOutput(socket, roomId);
  };

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    showToast("Room ID copied!");
  };

  const getLanguageIcon = (lang) => {
    const icons = {
      javascript: "🟨",
      python: "🐍",
      cpp: "⚙️",
      java: "☕"
    };
    return icons[lang] || "💻";
  };

  return (
    <div className={`editor-container ${isChatOpen ? 'chat-open' : 'chat-closed'}`}>
      <div className="editor-bg-orb orb-1"></div>
      <div className="editor-bg-orb orb-2"></div>
      <div className="grid-overlay"></div>

      {showNotification && (
        <div className="toast-notification">
          <div className="toast-icon">✓</div>
          <span>{notificationMessage}</span>
        </div>
      )}

      <AccessRequestNotification roomId={roomId} />

      <div className="editor-header">
        <div className="header-left">
          <div className="brand-badge">
            <span className="brand-icon">💻</span>
            <span className="brand-text">CodeSync</span>
          </div>
          <div className="room-badge" onClick={handleCopyRoomId}>
            <span className="room-label">Room</span>
            <span className="room-id-text">{roomId}</span>
            <span className="copy-hint">📋</span>
          </div>
        </div>

        <div className="header-right">
          <div className="sync-status">
            <span className={`sync-dot ${syncStatus}`}></span>
            <span className="sync-text">
              {syncStatus === "connected" ? "Synced" : "Syncing"}
            </span>
          </div>
          <div className="user-badge">
            <span className="user-icon">👤</span>
            <span className="user-name">{username}</span>
          </div>
          <button className="leave-btn" onClick={handleLeaveRoom}>
            <span className="leave-icon">🚪</span>
            <span>Leave</span>
          </button>
        </div>
      </div>

      <div className="editor-toolbar">
        <div className="toolbar-left">
          <div className="language-selector-wrapper">
            <span className="language-icon">{getLanguageIcon(language)}</span>
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
          </div>
          <button className="toolbar-btn format-btn" onClick={handleFormatCode}>
            <span className="btn-icon">✨</span>
            <span>Format</span>
          </button>
          <button 
            className="toolbar-btn run-btn" 
            onClick={handleRunCode} 
            disabled={isRunning}
          >
            <span className="btn-icon">{isRunning ? "⏳" : "▶"}</span>
            <span>{isRunning ? "Running" : "Run"}</span>
          </button>
        </div>

        <div className="toolbar-right">
          <div className="last-saved">
            <span className="save-icon">💾</span>
            <span>Auto-saved</span>
          </div>
        </div>
      </div>

      <div className="main-content">
        <div className="sidebar">
          <div className="sidebar-header">
            <span className="sidebar-icon">👥</span>
            <span className="sidebar-title">Collaborators</span>
            <span className="user-count">{users.length}</span>
          </div>
          <div className="users-list">
            {users.map((u, index) => (
              <div key={u.id} className="user-item" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="user-avatar">
                  {u.username.charAt(0).toUpperCase()}
                </div>
                <div className="user-info">
                  <span className="user-name-text">{u.username}</span>
                  <span className="user-status-text">
                    <span className="status-dot-active"></span>
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="quick-actions">
            <div className="action-header">Quick Actions</div>
            <button className="action-btn" onClick={handleToggleConsole}>
              <span>🖥️</span>
              <span>{isConsoleVisible ? "Hide" : "Show"} Console</span>
            </button>
            <button className="action-btn" onClick={handleCopyRoomId}>
              <span>📋</span>
              <span>Copy Room ID</span>
            </button>
          </div>
        </div>

        <div className="editor-section">
          <div className="editor-wrapper" style={{ position: 'relative' }}>
            <div className="editor-glow-border"></div>
            <Editor
              height="100%"
              language={language}
              theme="custom-dark"
              value={code}
              onChange={handleCodeChange}
              onMount={handleEditorDidMount}
              options={editorOptions}
            />
            <CursorOverlay cursors={remoteCursors} editorRef={editorRef} />
          </div>

          <ConsoleManager
            isConsoleVisible={isConsoleVisible}
            setIsConsoleVisible={handleToggleConsole}
            consoleHeight={consoleHeight}
            handleMouseDown={handleMouseDown}
            isInputOpen={isInputOpen}
            setIsInputOpen={handleToggleInput}
            input={input}
            setInput={handleInputChange}
            isOutputOpen={isOutputOpen}
            setIsOutputOpen={handleToggleOutput}
            consoleOutput={consoleOutput}
            setConsoleOutput={handleClearOutput}
          />
        </div>

        <ChatPanel 
          roomId={roomId} 
          username={username}
          isOpen={isChatOpen}
          setIsOpen={setIsChatOpen}
        />
      </div>

      <div className="status-bar">
        <div className="status-left">
          <span className="status-item">
            <span className="status-icon">⚡</span>
            <span>Lines: {code.split('\n').length}</span>
          </span>
          <span className="status-item">
            <span className="status-icon">📝</span>
            <span>Chars: {code.length}</span>
          </span>
        </div>
        <div className="status-right">
          <span className="status-item">
            <span className="status-icon">🔒</span>
            <span>Encrypted</span>
          </span>
          <span className="status-item">
            <span className="status-icon">🌐</span>
            <span>Real-time Sync</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;