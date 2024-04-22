"use client";

import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Text,
} from "recharts";
import BeatLoader from "react-spinners/BeatLoader";

export default function GraphComponent2({ getCountry, getQuery }) {
  const [countries, setCountries] = useState([]);
  const [displayCountries, setDisplayCountries] = useState([]);
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [timeframe, setTimeframe] = useState("monthly");
  const [data, setData] = useState([]);
  const [activeDataKeys, setActiveDataKeys] = useState({});
  const [savedActiveDataKeys, setSavedActiveDataKeys] = useState({});
  const [displayRelative, setDisplayRelative] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [riskFactors, setRiskFactors] = useState({});
  const [viewRiskFactors, setViewRiskFactors] = useState(false);
  const [riskFactors2, setRiskFactors2] = useState([]);
  const [viewRiskFactors2, setViewRiskFactors2] = useState(false);

  useEffect(() => {
    fetch(getCountry)
      .then((response) => response.json())
      .then((data) => {
        if (data && data.rows) {
          const sortedCountries = data.rows
            .map((row) => ({ id: row[0], name: row[1] }))
            .sort((a, b) => a.name.localeCompare(b.name));
          setCountries(sortedCountries);
          setDisplayCountries(sortedCountries);
        } else {
          console.error("Invalid data structure:", data);
        }
      })
      .catch((error) => console.error("Error fetching countries", error));
  }, [getCountry]);

  const handleCountryChange = (event) => {
    const value = event.target.value;
    const checked = event.target.checked;

    setSelectedCountries((prev) =>
      checked ? [...prev, value] : prev.filter((c) => c !== value)
    );

    if (checked) {
      setSavedActiveDataKeys((prev) => {
        const newSavedActiveDataKeys = { ...prev };
        Object.keys(activeDataKeys).forEach((key) => {
          if (!newSavedActiveDataKeys.hasOwnProperty(key)) {
            newSavedActiveDataKeys[key] = true;
          }
        });
        return newSavedActiveDataKeys;
      });
    }
  };

  const handleTimeframeChange = (event) => {
    setTimeframe(event.target.value);
  };

  const handleSearch = (event) => {
    const searchTerm = event.target.value.toLowerCase();
    setSearchTerm(searchTerm);
    setDisplayCountries(
      searchTerm
        ? countries.filter((country) =>
            country.name.toLowerCase().includes(searchTerm)
          )
        : countries
    );
  };

  const handleDataKeyChange = (key) => {
    setActiveDataKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const fetchData = () => {
    if (selectedCountries.length === 0) return;

    setIsLoading(true);
    const countryParam = selectedCountries.join(",");
    const queryUrl = `${getQuery}?countryId=${countryParam}&timeframe=${timeframe}&startDate=${startDate}&endDate=${endDate}`;
    fetch(queryUrl)
      .then((response) => response.json())
      .then((fetchedData) => {
        if (fetchedData && fetchedData.rows) {
          setData(fetchedData.rows);
          let newDataKeys = {};
          if (Object.keys(activeDataKeys).length === 0) {
            newDataKeys = fetchedData.metaData.slice(3).reduce(
              (keys, meta) => ({
                ...keys,
                [meta.name]: true,
              }),
              {}
            );
          } else {
            newDataKeys = { ...activeDataKeys };
          }
          setActiveDataKeys(newDataKeys);
          setSavedActiveDataKeys(newDataKeys);

          let newRiskFactors = {};
          const countryIdsProcessed = new Set();
          fetchedData.rows.forEach((row) => {
            const countryId = row[0];
            if (!countryIdsProcessed.has(countryId)) {
              countryIdsProcessed.add(countryId);
              fetchedData.metaData.forEach((meta, index) => {
                const metaName = meta.name;
                if (metaName.endsWith("_RISK_LEVEL")) {
                  const riskFactorName = metaName.replace("_RISK_LEVEL", "");
                  const riskFactorValue = row[index];
                  if (riskFactorName && riskFactorValue) {
                    if (!newRiskFactors[riskFactorName]) {
                      newRiskFactors[riskFactorName] = {
                        high: [],
                        medium: [],
                        low: [],
                      };
                    }
                    switch (riskFactorValue) {
                      case "High":
                        newRiskFactors[riskFactorName].high.push(countryId);
                        break;
                      case "Medium":
                        newRiskFactors[riskFactorName].medium.push(countryId);
                        break;
                      case "Low":
                        newRiskFactors[riskFactorName].low.push(countryId);
                        break;
                      default:
                        break;
                    }
                  }
                }
              });
            }
          });
          setRiskFactors(newRiskFactors);
          setViewRiskFactors(true);
        } else {
          console.error(
            "Received data is not properly formatted:",
            fetchedData
          );
        }
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching data", error);
        setIsLoading(false);
      });
  };

  const toggleDisplayRelative = () => {
    setDisplayRelative((prev) => !prev);
  };

  const prepareGraphData = (rows) =>
    rows
      .filter((row) => {
        const date = new Date(row[2]);
        const start = startDate
          ? new Date(startDate)
          : new Date(-8640000000000000);
        const end = endDate ? new Date(endDate) : new Date(8640000000000000);
        return date >= start && date <= end;
      })
      .map((row) => {
        const newObj = { date: row[2].split("T")[0] };
        Object.keys(activeDataKeys).forEach((key, index) => {
          if (activeDataKeys[key])
            newObj[key.replace(/_/g, " ")] = row[index + 3];
        });
        return newObj;
      });

  useEffect(() => {
    if (startDate && endDate) {
      fetchData();
    }
  }, [startDate, endDate]);

  const handleFetchRiskFactors = () => {
    fetch("http://localhost:3002/query5?getRiskFactors=true")
      .then((response) => response.json())
      .then((data) => {
        const sortedData = data.rows.sort((a, b) => a[0].localeCompare(b[0]));
        setRiskFactors2(sortedData);
        setViewRiskFactors2(true);
      })
      .catch((error) => console.error("Failed to fetch risk factors:", error));
  };

  const colorPalette = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff7300",
    "#fa8072",
    "#6a5acd",
    "#ff6347",
    "#3cb371",
  ];

  return (
    <div className="flex">
      <div className="w-64 p-4 space-y-4 bg-blue-100 sticky top-0 h-screen overflow-auto">
        <input
          type="text"
          placeholder="Search countries"
          value={searchTerm}
          onChange={handleSearch}
          className="w-full p-2 border border-gray-300 rounded mb-4"
        />
        <div className="flex flex-col overflow-auto h-48">
          {displayCountries.map((country) => (
            <label key={country.id} className="inline-flex items-center">
              <input
                type="checkbox"
                className="form-checkbox h-5 w-5 text-gray-600"
                value={country.id}
                onChange={handleCountryChange}
                checked={selectedCountries.includes(country.id)}
              />
              <span className="ml-2 text-gray-700">{country.name}</span>
            </label>
          ))}
        </div>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded mt-4"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded mt-4"
        />
        <div className="flex flex-col mt-4">
          <h3>Select Timeframe:</h3>
          {["daily", "weekly", "monthly"].map((tf) => (
            <label key={tf} className="inline-flex items-center mt-3">
              <input
                type="radio"
                className="form-radio h-5 w-5 text-gray-600"
                name="timeframe"
                value={tf}
                checked={timeframe === tf}
                onChange={handleTimeframeChange}
              />
              <span className="ml-2 text-gray-700">{tf}</span>
            </label>
          ))}
          <button
            onClick={fetchData}
            className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            disabled={selectedCountries.length === 0}
            title={
              selectedCountries.length === 0
                ? "You must first select at least one country."
                : ""
            }
          >
            Query
          </button>
          <button
            onClick={handleFetchRiskFactors}
            className="mt-2 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            View Risk Factors
          </button>
          <div className="mt-4 flex items-center">
            <input
              type="checkbox"
              checked={displayRelative}
              onChange={toggleDisplayRelative}
              className="form-checkbox h-5 w-5 text-gray-600"
            />
            <span className="ml-2 text-gray-700">
              Display Relative Country Data
            </span>
          </div>
        </div>
        {Object.keys(savedActiveDataKeys).length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold">Extra Options:</h3>
            {Object.keys(savedActiveDataKeys).map((key, idx) =>
              key.endsWith("RISK_LEVEL") ? null : (
                <label key={key} className="inline-flex items-center mt-3">
                  <input
                    type="checkbox"
                    className="form-checkbox h-5 w-5 text-blue-600"
                    checked={activeDataKeys[key]}
                    onChange={() => handleDataKeyChange(key)}
                  />
                  <span className="ml-2 text-gray-700">{key}</span>
                </label>
              )
            )}
          </div>
        )}
      </div>
      {viewRiskFactors && (
        <div className=" flex shadow">
          <div className="bg-white p-8 rounded-lg max-w-lg">
            <div className="flex justify-between border-b border-gray-300 pb-2 mb-4">
              <h2 className="text-xl font-bold">Risk Factors</h2>
            </div>
            <div className="space-y-4">
              {Object.entries(riskFactors).map(([factor, countriesByLevel]) => (
                <div key={factor}>
                  <h4 className="text-lg font-semibold">{factor}</h4>
                  <ul className="list-disc list-inside">
                    {Object.entries(countriesByLevel).map(
                      ([level, countriesList]) => (
                        <li key={level}>
                          <strong>{level}:</strong> {countriesList.join(", ")}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {viewRiskFactors2 && (
        <div className="absolute top-0 left-0 w-full h-full bg-white bg-opacity-90 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <button
              onClick={() => setViewRiskFactors2(!viewRiskFactors2)}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded absolute top-2 right-2"
            >
              Close
            </button>
            <h2 className="text-xl font-bold mb-4">Risk Factors Table</h2>
            <div className="overflow-auto max-h-[500px]">
              <table className="min-w-full">
                <thead className="bg-white">
                  <tr>
                    {[
                      "Country",
                      "Alcohol",
                      "Diabetes",
                      "Aged 65 or Older",
                      "GDP",
                      "Population Density",
                      "Smoking",
                      "Obesity",
                    ].map((header) => (
                      <th
                        key={header}
                        className="px-4 py-2 border bg-white sticky -top-2 z-10"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {riskFactors2.map((row, index) => (
                    <tr key={index}>
                      {row.map((cell, idx) => (
                        <td key={idx} className="px-4 py-2 border">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      <div className="flex-grow p-4 overflow-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <BeatLoader color="#4A90E2" />
          </div>
        ) : displayRelative ? (
          Object.keys(activeDataKeys)
            .filter((key) => activeDataKeys[key])
            .filter((key) => !key.endsWith("RISK_LEVEL"))
            .map((key) => (
              <div key={key}>
                <h3 className="text-xl font-bold mb-2">
                  {key.replace(/_/g, " ")}
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      type="category"
                      allowDuplicatedCategory={false}
                      tickFormatter={(tick) =>
                        timeframe === "daily" ? tick.split("T")[0] : tick
                      }
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {selectedCountries.map((country, index) => (
                      <Line
                        key={country}
                        type="monotone"
                        dataKey={key.replace(/_/g, " ")}
                        data={prepareGraphData(
                          data.filter((d) => d[0] === country)
                        )}
                        stroke={colorPalette[index % colorPalette.length]}
                        name={countries
                          .find((c) => c.id === country)
                          .name.replace(/_/g, " ")}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ))
        ) : (
          selectedCountries.map((country, index) => (
            <div key={country}>
              <h3 className="text-xl font-bold mb-2">
                {countries
                  .find((c) => c.id === country)
                  .name.replace(/_/g, " ")}
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={prepareGraphData(data.filter((d) => d[0] === country))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    type="category"
                    allowDuplicatedCategory={false}
                    tickFormatter={(tick) =>
                      timeframe === "daily" ? tick.split("T")[0] : tick
                    }
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {Object.keys(activeDataKeys)
                    .filter((key) => activeDataKeys[key])
                    .filter((key) => !key.endsWith("RISK_LEVEL"))
                    .map((key, lineIndex) => {
                      const lineData = data.filter(
                        (d) => d[0] === country && activeDataKeys[key]
                      );
                      return lineData.length > 0 ? (
                        <Line
                          key={key}
                          type="monotone"
                          dataKey={key.replace(/_/g, " ")}
                          stroke={colorPalette[lineIndex % colorPalette.length]}
                        />
                      ) : (
                        <Text x={150} y={150} fill="#8884d8" fontSize="16">
                          No data found for this country
                        </Text>
                      );
                    })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
