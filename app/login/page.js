"use client";

import { useState, useContext } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { userEmailLogin } from "@/public/Firebase";
import BeatLoader from "react-spinners/BeatLoader";
import AuthContext from "../AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { setAuthenticated } = useContext(AuthContext);

  const handleLogin = async (e) => {
    setError(null);
    setLoading(true);
    e.preventDefault();
    try {
      await userEmailLogin(email, password);
      setAuthenticated(true);
      router.push("/queries");
    } catch (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="p-8 bg-white rounded shadow-md">
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
              <BeatLoader className="" color="#4A90E2" />
            </div>
          )}
          {error && <h2 className="text-red-500 text-center">{error}</h2>}
          <div className="text-center">
            <Link href="/signup">
              <button type="button" className="text-black hover:underline">
                Don&apos;t have an account?{" "}
                <span className="text-blue-500">Sign up instead</span>
              </button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
