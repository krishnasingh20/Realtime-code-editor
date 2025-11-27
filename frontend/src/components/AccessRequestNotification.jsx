import React, { useState, useEffect } from "react";
import { socket } from "../socket";
import "../styles/AccessRequest.css";

const AccessRequestNotification = ({ roomId }) => {
  const [accessRequests, setAccessRequests] = useState([]);

  useEffect(() => {
    if (!socket || !roomId) return;

    const handleAccessRequest = ({ roomId: reqRoomId, username, requesterId }) => {
      if (reqRoomId === roomId) {
        setAccessRequests((prev) => {
          if (prev.some((r) => r.requesterId === requesterId)) {
            return prev;
          }
          return [
            ...prev,
            { username, requesterId, timestamp: Date.now() }
          ];
        });
      }
    };

    socket.on("access-request", handleAccessRequest);

    return () => {
      socket.off("access-request", handleAccessRequest);
    };
  }, [socket, roomId]);

  const handleApprove = (requesterId, username) => {
    socket.emit("approve-access", { roomId, requesterId });
    setAccessRequests((prev) => 
      prev.filter((req) => req.requesterId !== requesterId)
    );
  };

  const handleReject = (requesterId, username) => {
    socket.emit("reject-access", { 
      roomId, 
      requesterId,
      reason: "Room owner declined your request."
    });
    setAccessRequests((prev) => 
      prev.filter((req) => req.requesterId !== requesterId)
    );
  };

  if (accessRequests.length === 0) {
    return null;
  }

  return (
    <div className="access-requests-container">
      {accessRequests.map((request) => (
        <div key={request.requesterId} className="access-request-card">
          <div className="request-icon">🔔</div>
          <div className="request-content">
            <h4 className="request-title">Access Request</h4>
            <p className="request-message">
              <strong>{request.username}</strong> wants to join this room
            </p>
          </div>
          <div className="request-actions">
            <button 
              className="approve-btn"
              onClick={() => handleApprove(request.requesterId, request.username)}
            >
              ✓ Approve
            </button>
            <button 
              className="reject-btn"
              onClick={() => handleReject(request.requesterId, request.username)}
            >
              ✕ Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AccessRequestNotification;