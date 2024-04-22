"use client";

import { useState, useContext } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { userEmailLogin, sendResetPassword } from "@/public/Firebase";
import BeatLoader from "react-spinners/BeatLoader";
import AuthContext from "../AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { setAuthenticated } = useContext(AuthContext);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await userEmailLogin(email, password);
      setAuthenticated(true);
      router.push("/queries");
    } catch (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const result = await sendResetPassword(email);
      setMessage(result);
    } catch (error) {
      setMessage(error.message || "Failed to send reset link.");
    }
    setLoading(false);
  };

  const toggleResetForm = () => {
    setIsResetting(!isResetting);
    setError("");
    setMessage("");
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="p-8 bg-white rounded shadow-md">
        {isResetting ? (
          <div className="flex flex-col w-[500px]">
            <button
              onClick={toggleResetForm}
              className="text-black hover:underline my-2 self-start"
            >
              ← Back to Login
            </button>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-4 py-2 border rounded"
              autoComplete="username"
            />
            <button
              onClick={handleResetPassword}
              className="mt-4 bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-700"
            >
              Send Reset Link
            </button>
            {message && (
              <p className="mt-2 text-green-500 text-center">{message}</p>
            )}
          </div>
        ) : (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-4 py-2 border rounded"
              autoComplete="username"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-4 py-2 border rounded"
              autoComplete="current-password"
            />
            {!loading ? (
              <button
                type="submit"
                className="bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-700"
              >
                Login
              </button>
            ) : (
              <div className="flex w-full justify-center">
                <BeatLoader color="#4A90E2" />
              </div>
            )}
            {error && <h2 className="text-red-500 text-center">{error}</h2>}
            <button
              type="button"
              onClick={toggleResetForm}
              className="text-black hover:underline"
            >
              Forgot password?
            </button>
            <div className="text-center">
              <Link href="/signup">
                <h2 className="text-black hover:underline">
                  Don&apos;t have an account?{" "}
                  <span className="text-blue-500">Sign up instead</span>
                </h2>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
