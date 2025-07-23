import React, { useState, useRef } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../../lib/firebase";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log(result);
      navigate("/");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading && submitButtonRef.current) {
      e.preventDefault();
      submitButtonRef.current?.click();
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className=" text-center text-3xl font-medium text-white">
            Sign In
          </h2>
        </div>
        <form className="mt-4 space-y-6" onSubmit={handleEmailAuth}>
          <div className="rounded-md shadow-sm space-y-5">
            <div>
              <label htmlFor="email" className="text-white">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                className="appearance-none mt-2 rounded-none relative block w-full px-3 py-2 border border-white placeholder-gray-500 text-white bg-black rounded-t-md focus:outline-none focus:ring-white focus:border-white"
                placeholder="Email address"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEmail(e.target.value)
                }
                onKeyDown={onKeyDown}
                style={{
                  WebkitBoxShadow: "0 0 0 1000px black inset",
                  WebkitTextFillColor: "white",
                }}
              />
            </div>
            <div>
              <label htmlFor="password" className="text-white">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                className="appearance-none mt-2 rounded-none relative block w-full px-3 py-2 border border-white placeholder-gray-500 text-white bg-black rounded-b-md focus:outline-none focus:ring-white focus:border-white"
                placeholder="Password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPassword(e.target.value)
                }
                onKeyDown={onKeyDown}
                style={{
                  WebkitBoxShadow: "0 0 0 1000px black inset",
                  WebkitTextFillColor: "white",
                }}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div className="space-y-4">
            <button
              ref={submitButtonRef}
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-black bg-white hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Loading..." : "Sign In"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
