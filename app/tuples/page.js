"use client";

import React, { useState, useEffect } from "react";
import { BeatLoader } from "react-spinners";

export default function Tuples() {
  const [tupleCount, setTupleCount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:3002/tuples")
      .then((response) => response.json())
      .then((data) => {
        setTupleCount(data.rows[0][0]);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching tuples count:", error);
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="max-w-md w-full bg-gray-100 shadow-lg rounded-lg overflow-hidden">
        <div className="px-4 py-2 bg-gray-900">
          <h1 className="text-2xl font-bold text-white text-center">Tuples</h1>
        </div>
        <div className="p-4 flex justify-center items-center">
          {loading ? (
            <BeatLoader color="#4A90E2" />
          ) : (
            <p className="text-lg text-gray-800">
              Total Tuples in Database: {tupleCount}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
