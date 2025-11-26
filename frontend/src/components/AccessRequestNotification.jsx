import React, { useState, useEffect } from "react";
import { socket } from "../socket";
import "../styles/AccessRequest.css";

const AccessRequestNotification = ({ roomId }) => {
  const [accessRequests, setAccessRequests] = useState([]);

  useEffect(() => {
    if (!socket || !roomId) {
      console.warn("⚠️ AccessRequestNotification: No socket or roomId");
      return;
    }

    console.log("👂 AccessRequestNotification: Listening for requests in room", roomId);

    // Listen for access requests
    const handleAccessRequest = ({ roomId: reqRoomId, username, requesterId }) => {
      console.log("🔔 ACCESS REQUEST RECEIVED:", { reqRoomId, username, requesterId });
      
      if (reqRoomId === roomId) {
        console.log(`✅ Request is for current room (${roomId}), adding to state`);
        
        setAccessRequests((prev) => {
          // Avoid duplicates
          if (prev.some((r) => r.requesterId === requesterId)) {
            console.log(`⚠️ Duplicate request from ${username}, skipping`);
            return prev;
          }
          
          console.log(`➕ Adding new request from ${username}`);
          return [
            ...prev,
            { username, requesterId, timestamp: Date.now() }
          ];
        });
      } else {
        console.log(`❌ Request is for different room (${reqRoomId}), ignoring`);
      }
    };

    socket.on("access-request", handleAccessRequest);

    return () => {
      console.log("🧹 AccessRequestNotification: Cleaning up listener");
      socket.off("access-request", handleAccessRequest);
    };
  }, [socket, roomId]);

  // Log whenever requests state changes
  useEffect(() => {
    console.log("📊 Current access requests:", accessRequests.length, accessRequests);
  }, [accessRequests]);

  const handleApprove = (requesterId, username) => {
    console.log(`✅ Approving access for ${username} (${requesterId})`);
    
    socket.emit("approve-access", { roomId, requesterId });
    
    // Remove from local state
    setAccessRequests((prev) => 
      prev.filter((req) => req.requesterId !== requesterId)
    );
  };

  const handleReject = (requesterId, username) => {
    console.log(`❌ Rejecting access for ${username} (${requesterId})`);
    
    socket.emit("reject-access", { 
      roomId, 
      requesterId,
      reason: "Room owner declined your request."
    });
    
    // Remove from local state
    setAccessRequests((prev) => 
      prev.filter((req) => req.requesterId !== requesterId)
    );
  };

  if (accessRequests.length === 0) {
    return null;
  }

  return (
    <div className="access-requests-container">
      <div className="access-requests-header">
        <span className="requests-badge">{accessRequests.length}</span>
        <span>Pending Access Request{accessRequests.length !== 1 ? 's' : ''}</span>
      </div>
      
      {accessRequests.map((request) => (
        <div key={request.requesterId} className="access-request-card">
          <div className="request-icon">🔔</div>
          <div className="request-content">
            <h4 className="request-title">Access Request</h4>
            <p className="request-message">
              <strong>{request.username}</strong> wants to join this room
            </p>
            <span className="request-time">
              {new Date(request.timestamp).toLocaleTimeString()}
            </span>
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