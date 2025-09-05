import "bootstrap/dist/css/bootstrap.min.css";  // ✅ Bootstrap styles
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";  // ✅ React Router for navigation
import App from "./App.jsx";
import "./index.css";  // ✅ Custom global styles (optional)

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
