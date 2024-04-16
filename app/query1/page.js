"use client";

import GraphComponent from "../Root Components/GraphComponent";
import { useState, useEffect } from "react";

export default function Query1Component() {
  const [data, setData] = useState([]);

  // Fetch all data on component mount
  useEffect(() => {
    fetch("http://localhost:3002/query1")
      .then((response) => response.json())
      .then((data) => {
        console.log("API Data:", data);
        setData(data.rows || []);
      })
      .catch((err) => console.error("Failed to fetch data:", err));
  }, []);

  return (
    <div>
      <GraphComponent data={data} />
    </div>
  );
}
