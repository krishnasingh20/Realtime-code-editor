import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  setupSocketListeners, 
  joinRoom, 
  leaveRoom 
} from "../utils/socketHandler";
import { languageTemplates } from "../utils/editorConfig";

export const useCollaboration = (socket, roomId, username) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(languageTemplates["javascript"]);
  const [consoleOutput, setConsoleOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isConsoleVisible, setIsConsoleVisible] = useState(false);
  const [isOutputOpen, setIsOutputOpen] = useState(false);
  const [isInputOpen, setIsInputOpen] = useState(false);
  
  const isRemoteUpdate = useRef(false);

  useEffect(() => {
    if (!roomId || !username) {
      navigate("/");
      return;
    }

    joinRoom(socket, roomId, username);

    const cleanup = setupSocketListeners(socket, roomId, {
      onRoomState: (roomState) => {
        isRemoteUpdate.current = true;
        
        setLanguage(roomState.language);
        setCode(roomState.code);
        setIsConsoleVisible(roomState.isConsoleVisible);
        setIsOutputOpen(roomState.isOutputOpen);
        
        if (roomState.isInputOpen !== undefined) {
          setIsInputOpen(roomState.isInputOpen);
        }
        
        requestAnimationFrame(() => {
          isRemoteUpdate.current = false;
        });
      },
      
      onUsersUpdate: (roomUsers) => {
        setUsers(roomUsers);
      },
      
      onUserJoined: (newUser) => {
        // User joined notification handled in component
      },
      
      onUserLeft: (id) => {
        // User left notification handled in component
      },
      
      onCodeUpdate: (newCode) => {
        if (code !== newCode && !isRemoteUpdate.current) {
          isRemoteUpdate.current = true;
          setCode(newCode);
          requestAnimationFrame(() => {
            isRemoteUpdate.current = false;
          });
        }
      },
      
      onLanguageUpdate: ({ language: newLang }) => {
        isRemoteUpdate.current = true;
        setLanguage(newLang);
        setCode(languageTemplates[newLang]);
        requestAnimationFrame(() => {
          isRemoteUpdate.current = false;
        });
      },
      
      onCodeOutput: ({ output, error, runBy }) => {
        setIsRunning(false);
        setIsConsoleVisible(true);
        setIsOutputOpen(true);
        
        setConsoleOutput(
          error
            ? `Error (by ${runBy}):\n${output}`
            : `${runBy} ran the code:\n\n${output}`
        );
      },
    });

    return () => {
      leaveRoom(socket, roomId);
      cleanup();
    };
  }, [roomId, username, navigate, socket]);

  return {
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
  };
};
