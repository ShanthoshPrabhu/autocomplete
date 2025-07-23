import "./App.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuth } from "./state/AuthProvider";
import TextEditor from "./components/TextEditor";
import Login from "./pages/Login";

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={user ? <TextEditor /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/login"
          element={!user ? <Login /> : <Navigate to="/" replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;
