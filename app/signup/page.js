"use client";

import { useState, useContext } from "react";
import Link from "next/link";
import { userEmailSignup } from "@/public/Firebase";
import { useRouter } from "next/navigation";
import BeatLoader from "react-spinners/BeatLoader";
import AuthContext from "../AuthContext";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { setAuthenticated } = useContext(AuthContext);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const signupResult = await userEmailSignup(email, password, displayName);
      if (signupResult === "success") {
        setAuthenticated(true);
        router.push("/");
      } else {
        setError(signupResult);
        console.error("hello", signupResult);
      }
    } catch (error) {
      console.error("Failed to sign up", error);
    }
    setLoading(false);
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="p-8 bg-white rounded shadow-md">
        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="px-4 py-2 border rounded"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-4 py-2 border rounded"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-4 py-2 border rounded"
            minLength="8"
            required
            autoComplete="off"
          />
          {!loading ? (
            <button
              type="submit"
              className="bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-700"
            >
              Sign up
            </button>
          ) : (
            <div className="flex w-full justify-center">
              <BeatLoader className="" color="#4A90E2" />
            </div>
          )}
          {error && <h2 className="text-red-500 text-center">{error}</h2>}
          <div className="text-center">
            <Link href="/login">
              <button type="button" className="text-blue-500 hover:underline">
                Already have an account? Login
              </button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
