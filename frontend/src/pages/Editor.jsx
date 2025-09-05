import React from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import CodeEditor from "../components/CodeEditor";

export default function EditorPage() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { username } = location.state || {};

  // Redirect to home if username missing
  if (!username) {
    navigate("/");
    return null;
  }

  return <CodeEditor roomId={roomId} username={username} />;
}
