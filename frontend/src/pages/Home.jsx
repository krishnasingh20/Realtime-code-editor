import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import illustration from "../assets/illustration.svg";
import "../styles/Home.css";

export default function Home() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  const handleJoin = () => {
    if (!roomId || !username) {
      alert("Please enter both Room ID and Username!");
      return;
    }
    navigate(`/editor/${roomId}`, { state: { username } });
  };

  const handleGenerateRoomId = () => {
    const id = Math.random().toString(36).substring(2, 8);
    setRoomId(id);
  };

  return (
    <div className="container-fluid home-container d-flex align-items-center text-white">
      <div className="row w-100">
        {/* Left Side Illustration */}
        <div className="col-md-6 d-flex justify-content-center align-items-center">
          <img
            src={illustration}
            alt="Illustration"
            className="img-fluid"
            style={{ maxHeight: "70%" }}
          />
        </div>

        {/* Right Side Form */}
        <div className="col-md-6 d-flex flex-column justify-content-center align-items-center">
          {/* Logo + Title */}
          <div className="text-center mb-4">
            <h1>
              <span style={{ color: "#fff" }}>Code</span>{" "}
              <span style={{ color: "#00ff7f" }}>Sync</span>
            </h1>
            <p className="text-muted">
              Code, Chat and Collaborate. It's All in Sync.
            </p>
          </div>

          {/* Input Fields */}
          <div className="w-75">
            <input
              type="text"
              className="form-control mb-3 bg-custom"
              placeholder="Room Id"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
            <input
              type="text"
              className="form-control mb-3 bg-custom"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <button
              onClick={handleJoin}
              className="btn w-100"
              style={{
                backgroundColor: "rgb(28, 160, 28)",
                color: "white",
                fontWeight: "bold",
              }}
            >
              Join
            </button>
          </div>

          {/* Generate Room ID */}
          <p className="mt-3">
            <button
              className="btn btn-link text-decoration-underline text-white"
              onClick={handleGenerateRoomId}
            >
              Generate Unique Room Id
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
