import React, { useState, useEffect, useRef } from "react";
import { generateUserColor, getScreenCoordinates } from "../utils/cursorTracker";
import "../styles/cursor.css";

const RemoteCursor = ({ userId, username, position, editorRef }) => {
  const [coords, setCoords] = useState(null);
  const color = generateUserColor(userId);
  const updateTimeoutRef = useRef(null);

  useEffect(() => {
    if (!editorRef?.current || !position) {
      setCoords(null);
      return;
    }

    const updatePosition = () => {
      if (updateTimeoutRef.current) {
        cancelAnimationFrame(updateTimeoutRef.current);
      }

      updateTimeoutRef.current = requestAnimationFrame(() => {
        try {
          const screenCoords = getScreenCoordinates(editorRef.current, position);
          if (screenCoords) {
            setCoords(screenCoords);
          }
        } catch (error) {
          setCoords(null);
        }
      });
    };

    updatePosition();

    const editor = editorRef.current;
    if (!editor) return;

    try {
      const scrollListener = editor.onDidScrollChange?.(updatePosition);
      const layoutListener = editor.onDidLayoutChange?.(updatePosition);

      return () => {
        if (updateTimeoutRef.current) {
          cancelAnimationFrame(updateTimeoutRef.current);
        }
        scrollListener?.dispose?.();
        layoutListener?.dispose?.();
      };
    } catch (error) {
      return () => {
        if (updateTimeoutRef.current) {
          cancelAnimationFrame(updateTimeoutRef.current);
        }
      };
    }
  }, [position, editorRef]);

  if (!coords) return null;

  return (
    <div
      className="remote-cursor"
      style={{
        left: `${coords.x}px`,
        top: `${coords.y}px`,
        borderLeftColor: color,
      }}
    >
      <div
        className="cursor-flag"
        style={{ backgroundColor: color }}
      >
        {username}
      </div>
    </div>
  );
};

const CursorOverlay = ({ cursors, editorRef }) => {
  return (
    <div className="cursor-overlay">
      {Object.entries(cursors).map(([userId, data]) => (
        <RemoteCursor
          key={userId}
          userId={userId}
          username={data.username}
          position={data.position}
          editorRef={editorRef}
        />
      ))}
    </div>
  );
};

export default CursorOverlay;
