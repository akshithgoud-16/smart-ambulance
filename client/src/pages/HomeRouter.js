import { Navigate } from "react-router-dom";
import UserHome from "./UserHome";

function HomeRouter({ showToast }) {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const role = localStorage.getItem("role");

  if (isLoggedIn) {
    if (role === "driver") return <Navigate to="/driver" replace />;
    if (role === "police") return <Navigate to="/police" replace />;
  }

  return <UserHome showToast={showToast} />;
}

export default HomeRouter;
