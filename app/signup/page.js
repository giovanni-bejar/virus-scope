"use client";

import { useState } from "react";
import Link from "next/link";
import { userEmailSignup } from "@/public/Firebase";
import { useRouter } from "next/navigation";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const router = useRouter();

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const signupResult = await userEmailSignup(email, password, displayName);
      if (signupResult === "success") {
        router.push("/query");
      } else {
        console.error(signupResult);
      }
    } catch (error) {
      console.error("Failed to sign up", error);
    }
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
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-4 py-2 border rounded"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-4 py-2 border rounded"
            autoComplete="off"
          />
          <button
            type="submit"
            className="bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-700"
          >
            Sign Up
          </button>
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
