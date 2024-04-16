"use client";

import Link from "next/link";
import { useContext } from "react";
import AuthContext from "../AuthContext";

export default function Header() {
  const { authenticated } = useContext(AuthContext);

  return (
    <div className="w-full bg-gray-900 p-4 flex justify-between items-center">
      <h2 className="text-white text-xl">Virus Scope</h2>
      <div className="flex space-x-8 items-center">
        <Link href="/how-it-works">
          <button className="text-gray-300 hover:text-white mx-2">
            How it works
          </button>
        </Link>
        <Link href={authenticated ? "/query" : "/login"}>
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            {authenticated ? "Dashboard" : "Login"}
          </button>
        </Link>
      </div>
    </div>
  );
}
