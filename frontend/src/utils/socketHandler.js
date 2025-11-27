export const setupSocketListeners = (socket, roomId, callbacks) => {
  const {
    onRoomState,
    onUsersUpdate,
    onUserJoined,
    onUserLeft,
    onCodeUpdate,
    onLanguageUpdate,
    onCodeOutput,
  } = callbacks;

  socket.on("room-state", onRoomState);
  socket.on("all-users", onUsersUpdate);
  socket.on("user-joined", onUserJoined);
  socket.on("user-left", onUserLeft);
  socket.on("code-update", onCodeUpdate);
  socket.on("language-update", onLanguageUpdate);
  socket.on("code-output", onCodeOutput);

  return () => {
    socket.off("room-state");
    socket.off("all-users");
    socket.off("user-joined");
    socket.off("user-left");
    socket.off("code-update");
    socket.off("code-output");
    socket.off("language-update");
  };
};

export const joinRoom = (socket, roomId, username) => {
  socket.emit("join-room", { roomId, username });
};

export const leaveRoom = (socket, roomId) => {
  socket.emit("leave-room", { roomId });
};

export const emitCodeChange = (socket, roomId, code) => {
  socket.emit("code-change", { roomId, code });
};

export const emitLanguageChange = (socket, roomId, language) => {
  socket.emit("language-update", { roomId, language });
};

export const runCode = (socket, roomId, code, language, username, input) => {
  socket.emit("run-code", { roomId, code, language, username, input });
};

export const emitConsoleHeight = (socket, roomId, height) => {
  socket.emit("console:height-change", { roomId, height });
};

export const emitConsoleVisibility = (socket, roomId, isVisible) => {
  socket.emit("console:visibility-change", { roomId, isVisible });
};

export const emitInputVisibility = (socket, roomId, isInputOpen) => {
  socket.emit("console:input-visibility-change", { roomId, isInputOpen });
};

export const emitOutputVisibility = (socket, roomId, isOutputOpen) => {
  socket.emit("console:output-visibility-change", { roomId, isOutputOpen });
};

export const onConsoleHeightChange = (socket, callback) => {
  socket.on("console:height-change", ({ height }) => callback(height));
};

export const onConsoleVisibilityChange = (socket, callback) => {
  socket.on("console:visibility-change", ({ isVisible }) => callback(isVisible));
};

export const onInputVisibilityChange = (socket, callback) => {
  socket.on("console:input-visibility-change", ({ isInputOpen }) => callback(isInputOpen));
};

export const onOutputVisibilityChange = (socket, callback) => {
  socket.on("console:output-visibility-change", ({ isOutputOpen }) => callback(isOutputOpen));
};

export const emitInputChange = (socket, roomId, input) => {
  socket.emit("input:change", { roomId, input });
};

export const onInputChange = (socket, callback) => {
  socket.on("input:change", ({ input }) => callback(input));
};

export const emitClearOutput = (socket, roomId) => {
  socket.emit("console:clear-output", { roomId });
};

export const onClearOutput = (socket, callback) => {
  socket.on("console:clear-output", callback);
};