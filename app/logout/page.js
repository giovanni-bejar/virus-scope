"use client";

import React, { useEffect, useContext } from "react";
import { userLogout } from "@/public/Firebase";
import AuthContext from "../AuthContext";
import { useRouter } from "next/navigation";

export default function LogOut() {
  const router = useRouter();
  const { setAuthenticated } = useContext(AuthContext);

  useEffect(() => {
    userLogout();
    setAuthenticated(false);
    router.replace("/");
  }, []);

  return (
    <main className="bg-black h-screen">
      <section className="flex h-full">
        <div className="flex w-full items-center justify-center">
          <h2 className="text-white">Logging out...</h2>
        </div>
      </section>
    </main>
  );
}
