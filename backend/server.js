import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import judge0Client from "./utils/judge0Client.js";
import { executeCode } from "./executeCode.js";
import OpenAI from "openai";

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(",") || ["http://localhost:5173"],
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.use(cors());
app.use(express.json());

const rooms = {};
const roomStates = {};
const pendingRequests = {};

const languageMap = {
  javascript: 63,
  python: 71,
  cpp: 54,
  java: 62,
};

const initializeRoomState = (roomId) => {
  if (!roomStates[roomId]) {
    roomStates[roomId] = {
      code: "// Start coding...",
      language: "javascript",
      isConsoleVisible: false,
      isOutputOpen: false,
      isInputOpen: false,
      input: "",
    };
  }
  return roomStates[roomId];
};

io.on("connection", (socket) => {
  socket.on("request-room-access", ({ roomId, username }) => {
    if (!roomId || !username) return;

    if (!rooms[roomId] || rooms[roomId].length === 0) {
      socket.emit("access-approved", { roomId });
    } else {
      const roomOwner = rooms[roomId][0];
      
      if (!pendingRequests[roomId]) {
        pendingRequests[roomId] = [];
      }
      
      const existingRequest = pendingRequests[roomId].find(
        req => req.requesterId === socket.id
      );
      
      if (existingRequest) return;
      
      pendingRequests[roomId].push({
        requesterId: socket.id,
        username,
        timestamp: Date.now(),
      });
      
      io.to(roomOwner.id).emit("access-request", {
        roomId,
        username,
        requesterId: socket.id,
      });
      
      socket.emit("room-owner-info", { owner: roomOwner.username });
    }
  });

  socket.on("approve-access", ({ roomId, requesterId }) => {
    io.to(requesterId).emit("access-approved", { roomId });
    
    if (pendingRequests[roomId]) {
      pendingRequests[roomId] = pendingRequests[roomId].filter(
        req => req.requesterId !== requesterId
      );
    }
  });

  socket.on("reject-access", ({ roomId, requesterId, reason }) => {
    io.to(requesterId).emit("access-rejected", { 
      roomId,
      reason: reason || "Room owner rejected your request."
    });
    
    if (pendingRequests[roomId]) {
      pendingRequests[roomId] = pendingRequests[roomId].filter(
        req => req.requesterId !== requesterId
      );
    }
  });

  socket.on("join-room", ({ roomId, username }) => {
    if (!roomId) return;

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.username = username;

    if (!rooms[roomId]) rooms[roomId] = [];

    rooms[roomId] = rooms[roomId].filter((u) => u.id !== socket.id);
    rooms[roomId] = rooms[roomId].filter((u) => u.username !== username);

    const isFirstUser = rooms[roomId].length === 0;
    rooms[roomId].push({ id: socket.id, username });

    const roomState = initializeRoomState(roomId);

    if (isFirstUser && pendingRequests[roomId] && pendingRequests[roomId].length > 0) {
      pendingRequests[roomId].forEach((req) => {
        socket.emit("access-request", {
          roomId,
          username: req.username,
          requesterId: req.requesterId,
        });
      });
    }

    socket.emit("room-state", roomState);
    io.to(roomId).emit("all-users", rooms[roomId]);
    socket.to(roomId).emit("user-joined", { id: socket.id, username });
  });

  socket.on("leave-room", ({ roomId }) => {
    if (!roomId) return;
    
    socket.leave(roomId);
    if (!rooms[roomId]) return;

    rooms[roomId] = rooms[roomId].filter((u) => u.id !== socket.id);
    socket.to(roomId).emit("user-left", socket.id);
    io.to(roomId).emit("all-users", rooms[roomId]);

    if (rooms[roomId].length === 0) {
      delete rooms[roomId];
      delete roomStates[roomId];
      delete pendingRequests[roomId];
    }
  });

  socket.on("code-change", ({ roomId, code }) => {
    if (roomStates[roomId]) {
      roomStates[roomId].code = code;
    }
    socket.to(roomId).emit("code-update", code);
  });

  socket.on("language-update", ({ roomId, language }) => {
    if (roomStates[roomId]) {
      roomStates[roomId].language = language;
    }
    socket.to(roomId).emit("language-update", { language });
  });

  socket.on("cursor-position", ({ roomId, position }) => {
    const username = socket.data.username || "Unknown";
    socket.to(roomId).emit("cursor-update", {
      userId: socket.id,
      username,
      position,
    });
  });

  socket.on("console:height-change", ({ roomId, height }) => {
    socket.to(roomId).emit("console:height-change", { height });
  });

  socket.on("console:visibility-change", ({ roomId, isVisible }) => {
    if (roomStates[roomId]) {
      roomStates[roomId].isConsoleVisible = isVisible;
    }
    socket.to(roomId).emit("console:visibility-change", { isVisible });
  });

  socket.on("console:input-visibility-change", ({ roomId, isInputOpen }) => {
    if (roomStates[roomId]) {
      roomStates[roomId].isInputOpen = isInputOpen;
    }
    socket.to(roomId).emit("console:input-visibility-change", { isInputOpen });
  });

  socket.on("console:clear-output", ({ roomId }) => {
    socket.to(roomId).emit("console:clear-output");
  });

  socket.on("console:output-visibility-change", ({ roomId, isOutputOpen }) => {
    if (roomStates[roomId]) {
      roomStates[roomId].isOutputOpen = isOutputOpen;
    }
    socket.to(roomId).emit("console:output-visibility-change", { isOutputOpen });
  });

  socket.on("input:change", ({ roomId, input }) => {
    if (roomStates[roomId]) {
      roomStates[roomId].input = input;
    }
    socket.to(roomId).emit("input:change", { input });
  });

  socket.on("run-code", async ({ roomId, code, language, username, input }) => {
    try {
      const useLocal = process.env.USE_LOCAL_EXECUTION === "true";
      
      if (useLocal) {
        io.to(roomId).emit("code-output", {
          output: "⏳ Executing code...",
          error: false,
          runBy: username,
        });

        const result = await executeCode(language, code);
        
        io.to(roomId).emit("code-output", {
          output: result.output || result.error || "No output",
          error: !!result.error,
          runBy: username,
        });
        return;
      }

      const languageId = languageMap[language];
      if (!languageId) {
        io.to(roomId).emit("code-output", {
          output: `Unsupported language: ${language}`,
          error: true,
          runBy: username,
        });
        return;
      }

      if (!process.env.RAPID_API_KEY || process.env.RAPID_API_KEY === "your_judge0_api_key_here") {
        throw new Error("Judge0 API key not configured. Set USE_LOCAL_EXECUTION=true to use local execution.");
      }

      if (language === "java" && !/public\s+class\s+Main/.test(code)) {
        code = `public class Main {\n  public static void main(String[] args) {\n${code}\n  }\n}`;
      }

      if (language === "cpp" && !/int\s+main\s*\(/.test(code)) {
        code = `#include <iostream>\nusing namespace std;\nint main() {\n  ${code}\n  return 0;\n}`;
      }

      io.to(roomId).emit("code-output", {
        output: "⏳ Executing code (queued)...",
        error: false,
        runBy: username,
      });

      const result = await judge0Client.executeCode({
        source_code: code,
        language_id: languageId,
        stdin: input || "",
      });

      io.to(roomId).emit("code-output", {
        output: result.stdout || result.stderr || result.compile_output || "No output",
        error: !!result.stderr || !!result.compile_output,
        runBy: username,
      });
    } catch (error) {
      const errorMsg = error.message.includes("API key")
        ? error.message
        : error.response?.status === 429
        ? "API rate limit exceeded. Please try again later."
        : "Code execution failed. Please try again.";
      
      io.to(roomId).emit("code-output", {
        output: errorMsg,
        error: true,
        runBy: username,
      });
    }
  });

  socket.on("queue-status", () => {
    const status = judge0Client.getQueueStatus();
    socket.emit("queue-status", status);
  });

  socket.on("chatMessage", ({ roomId, username, message, timestamp }) => {
    io.to(roomId).emit("chatMessage", {
      username,
      message,
      timestamp: timestamp || new Date(),
      isAI: false
    });
  });

  socket.on("user:typing", ({ roomId, username, isTyping }) => {
    socket.to(roomId).emit("user:typing", {
      username,
      isTyping
    });
  });

  const ai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  socket.on("askAI", async ({ roomId, username, prompt }) => {
    try {
      const res = await ai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      });

      const reply = res.choices[0].message.content;
      io.to(roomId).emit("aiResponse", reply);
    } catch (error) {
      io.to(roomId).emit("aiResponse", "Error communicating with AI. Please check your API key.");
    }
  });

  socket.on("disconnect", () => {
    for (const roomId of Object.keys(rooms)) {
      const before = rooms[roomId].length;
      rooms[roomId] = rooms[roomId].filter((u) => u.id !== socket.id);
      if (rooms[roomId].length !== before) {
        socket.to(roomId).emit("user-left", socket.id);
        io.to(roomId).emit("all-users", rooms[roomId]);
      }
      if (rooms[roomId].length === 0) {
        delete rooms[roomId];
        delete roomStates[roomId];
        delete pendingRequests[roomId];
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});