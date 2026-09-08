import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import App from "./App.jsx";
import { theme } from "./theme.js";
import { AuthProvider } from "./auth/AuthContext.jsx";
import { AgricultorAuthProvider } from "./auth/AgricultorAuthContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AgricultorAuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AgricultorAuthProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
