"use client";

import React, { useState, createContext, useEffect } from "react";
import { authStatus } from "./Firebase";

const AuthContext = createContext({
  authenticated: false,
  isLoading: true,
});

export const AuthProvider = ({ children }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const isLoggedIn = await authStatus();
        console.log("Logged in? ", isLoggedIn);
        setAuthenticated(isLoggedIn);
      } catch (error) {
        console.error("Error checking authentication status:", error);
        setAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const value = {
    authenticated,
    isLoading,
    setAuthenticated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
