import { Navigate } from "react-router-dom";
import { useAgricultorAuth } from "./AgricultorAuthContext.jsx";

export default function RequireAgricultorAuth({ children }) {
  const { session } = useAgricultorAuth();

  if (session === undefined) {
    return null;
  }

  if (session === null) {
    return <Navigate to="/agricultor" replace />;
  }

  return children;
}
