export const generateUserColor = (userId) => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B195', '#67E6DC',
  ];
  
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

export const emitCursorPosition = (socket, roomId, position) => {
  if (!socket || !roomId || !position) return;
  
  socket.emit("cursor-position", {
    roomId,
    position: {
      lineNumber: position.lineNumber,
      column: position.column
    }
  });
};

export const setupCursorListener = (socket, callback) => {
  socket.on("cursor-update", callback);
  return () => socket.off("cursor-update");
};

export const getScreenCoordinates = (editor, position) => {
  if (!editor || !position) return null;
  
  try {
    const { lineNumber, column } = position;
    
    const coords = editor.getScrolledVisiblePosition({
      lineNumber,
      column,
    });
    
    if (!coords) return null;

    return {
      x: coords.left,
      y: coords.top,
    };
  } catch (error) {
    return null;
  }
};

export const throttle = (func, limit) => {
  let lastRan;
  let timeout;
  
  return function(...args) {
    const context = this;
    
    if (!lastRan) {
      func.apply(context, args);
      lastRan = Date.now();
    } else {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if ((Date.now() - lastRan) >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
};