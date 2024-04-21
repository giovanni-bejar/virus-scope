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
        <Link href={authenticated ? "/queries" : "/login"}>
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            {authenticated ? "Queries" : "Login"}
          </button>
        </Link>
      </div>
    </div>
  );
}
