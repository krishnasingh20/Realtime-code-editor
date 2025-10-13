import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();


const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

const rooms = {};

const languageMap = {
  javascript: 63,
  python: 71,
  cpp: 54,
  java: 62,
};

// Use free Judge0 CE endpoint
const JUDGE0_HOST = "judge0-ce.p.rapidapi.com";

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", ({ roomId, username }) => {
    if (!roomId) return;

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.username = username;

    if (!rooms[roomId]) rooms[roomId] = [];

    rooms[roomId] = rooms[roomId].filter((u) => u.id !== socket.id);
    rooms[roomId] = rooms[roomId].filter((u) => u.username !== username);

    rooms[roomId].push({ id: socket.id, username });

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

    if (rooms[roomId].length === 0) delete rooms[roomId];
  });

  socket.on("code-change", ({ roomId, code }) => {
    socket.to(roomId).emit("code-update", code);
  });

  socket.on("run-code", async ({ roomId, code, language, username }) => {
    try {
      const languageId = languageMap[language];
      if (!languageId) {
        io.to(roomId).emit("code-output", {
          output: `❌ Unsupported language: ${language}`,
          error: true,
          runBy: username,
        });
        return;
      }

      // Auto-wrap Java
      if (language === "java" && !/public\s+class\s+Main/.test(code)) {
        code = `public class Main {
  public static void main(String[] args) {
${code}
  }
}`;
      }

      // Auto-wrap C++
      if (language === "cpp" && !/int\s+main\s*\(/.test(code)) {
        code = `#include <iostream>
using namespace std;
int main() {
${code}
return 0;
}`;
      }

      const response = await axios.post(
  `https://${JUDGE0_HOST}/submissions?base64_encoded=false&wait=true`,
  { source_code: code, language_id: languageId },
  {
    headers: {
      "Content-Type": "application/json",
      "x-rapidapi-key": process.env.RAPID_API_KEY,
      "x-rapidapi-host": JUDGE0_HOST,
    },
  }
);


      const result = response.data;

      io.to(roomId).emit("code-output", {
        output: result.stdout || result.stderr || "⚠ No output",
        error: !!result.stderr,
        runBy: username,
      });
    } catch (error) {
      console.error("Judge0 API Error:", error.response?.data || error.message);
      io.to(roomId).emit("code-output", {
        output: "⚠ Code execution failed. Try again later.",
        error: true,
        runBy: username,
      });
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
      if (rooms[roomId].length === 0) delete rooms[roomId];
    }
  });
});

server.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
