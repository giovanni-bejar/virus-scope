import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  format,
  parseISO,
  isValid,
  startOfWeek,
  startOfMonth,
  startOfYear,
  differenceInCalendarDays,
  addWeeks,
  addMonths,
  addYears,
} from "date-fns";

function GraphComponent({ data }) {
  const [selectedDataKeys, setSelectedDataKeys] = useState({
    Average_Stringency_Index: true,
    Average_Dow_Jones_Closing_Price: true,
    Average_Covid_Cases_Per_Million: true,
  });
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [aggregation, setAggregation] = useState("monthly");
  const [showQueryModal, setShowQueryModal] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);

  const linesColors = {
    Average_Stringency_Index: "#FF6347",
    Average_Dow_Jones_Closing_Price: "#4682B4",
    Average_Covid_Cases_Per_Million: "#32CD32",
  };

  // Safe date parsing
  const safeParseDate = (item) => {
    if (!item || item.length < 3 || typeof item[2] !== "string") {
      console.error("Invalid or missing date:", item);
      return null;
    }
    const date = parseISO(item[2]);
    if (!isValid(date)) {
      console.error("Failed to parse date:", item[2]);
      return null;
    }
    return date;
  };

  const aggregateData = (data, granularity) => {
    const grouped = {};
    data.forEach((item) => {
      const date = safeParseDate(item);
      if (!date) return; // Skip items with invalid dates

      let key;
      switch (granularity) {
        case "daily":
          key = format(date, "yyyy-MM-dd");
          break;
        case "weekly":
          if (startDate) {
            const weeksSinceStart = Math.floor(
              differenceInCalendarDays(date, startDate) / 7
            );
            key = format(addWeeks(startDate, weeksSinceStart), "yyyy-MM-dd");
          } else {
            key = format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
          }
          break;
        case "monthly":
          if (startDate) {
            const monthsSinceStart = Math.floor(
              differenceInCalendarDays(date, startDate) / 30
            ); // Approximation
            key = format(addMonths(startDate, monthsSinceStart), "yyyy-MM-dd");
          } else {
            key = format(startOfMonth(date), "yyyy-MM");
          }
          break;
        case "yearly":
          if (startDate) {
            const yearsSinceStart = Math.floor(
              differenceInCalendarDays(date, startDate) / 365
            ); // Approximation
            key = format(addYears(startDate, yearsSinceStart), "yyyy-MM-dd");
          } else {
            key = format(startOfYear(date), "yyyy");
          }
          break;
        default:
          key = format(startOfMonth(date), "yyyy-MM");
      }

      if (!grouped[key]) {
        grouped[key] = {
          "DD-MON-YY": key,
          counts: 0,
          sumIndex: 0,
          sumPrice: 0,
          sumCases: 0,
        };
      }
      const entry = grouped[key];
      entry.counts++;
      entry.sumIndex += item[3] || 0;
      entry.sumPrice += item[4] || 0;
      entry.sumCases += item[5] || 0;
    });

    return Object.values(grouped).map((group) => ({
      "DD-MON-YY": group["DD-MON-YY"],
      Average_Stringency_Index: group.sumIndex / group.counts,
      Average_Dow_Jones_Closing_Price: group.sumPrice / group.counts,
      Average_Covid_Cases_Per_Million: group.sumCases / group.counts,
    }));
  };

  const filteredData = aggregateData(
    data.filter((item) => {
      const itemDate = safeParseDate(item);
      return (
        (!startDate || (itemDate && itemDate >= startDate)) &&
        (!endDate || (itemDate && itemDate <= endDate))
      );
    }),
    aggregation
  );

  // Function to handle date changes
  const handleDateChange = (value, type) => {
    const parsedDate = value ? parseISO(value) : null;
    if (type === "start") {
      setStartDate(parsedDate);
    } else if (type === "end") {
      setEndDate(parsedDate);
    }
  };

  return (
    <div className="flex">
      <div className="w-72 bg-gray-200 p-5 overflow-auto min-h-screen">
        <h2 className="font-bold text-lg mb-5">Graph Filters</h2>
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Start Date:
          </label>
          <input
            type="date"
            className="block w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 cursor-pointer"
            onChange={(e) => handleDateChange(e.target.value, "start")}
          />
          <label className="block mt-4 mb-2 text-sm font-medium text-gray-700">
            End Date:
          </label>
          <input
            type="date"
            className="block w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 cursor-pointer"
            onChange={(e) => handleDateChange(e.target.value, "end")}
          />
        </div>
        <div className="mb-4">
          {["daily", "weekly", "monthly", "yearly"].map((level) => (
            <div key={level}>
              <input
                type="radio"
                id={level}
                name="aggregation"
                checked={aggregation === level}
                onChange={() => setAggregation(level)}
                className="mr-2"
              />
              <label htmlFor={level}>
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </label>
            </div>
          ))}
        </div>
        <button
          onClick={() => setShowQueryModal(true)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Show SQL Query
        </button>
        <button
          onClick={() => setShowDataModal(true)}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          Show Data Table
        </button>
        <div className="flex flex-col">
          {Object.keys(selectedDataKeys).map((key) => (
            <div key={key} className="flex items-center mb-2">
              <input
                type="checkbox"
                id={key}
                checked={selectedDataKeys[key]}
                onChange={() =>
                  setSelectedDataKeys({
                    ...selectedDataKeys,
                    [key]: !selectedDataKeys[key],
                  })
                }
                className="mr-2"
              />
              <label htmlFor={key}>
                {key.replace("_", " ").replace("Average", "Avg.")}
              </label>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-grow p-5">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={filteredData}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="DD-MON-YY"
              tickFormatter={(tickItem) => format(parseISO(tickItem), "MMM dd")}
            />
            <YAxis />
            <Tooltip
              content={({ active, payload, label }) =>
                active &&
                payload && (
                  <div className="p-3 bg-white shadow-lg rounded-lg">
                    <p>
                      {isValid(parseISO(label))
                        ? format(parseISO(label), "MMM dd, yyyy")
                        : "Invalid date"}
                    </p>
                    {payload.map((p, idx) => (
                      <p key={idx}>
                        <span className="font-bold">{p.name}:</span> {p.value}
                      </p>
                    ))}
                  </div>
                )
              }
            />
            <Legend />
            {Object.entries(selectedDataKeys)
              .filter(([_, v]) => v)
              .map(([key]) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={linesColors[key]}
                  activeDot={{ r: 8 }}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* Modals for SQL Query and Data Table */}
      {showQueryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-5 rounded-lg shadow-lg relative">
            <button
              onClick={() => setShowQueryModal(false)}
              className="absolute top-2 right-2 text-gray-800 hover:text-gray-600"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </button>
            <pre>{`WITH Query1 (Country_ID, Country, CasesPerMil, Date_, Yr_Week, Yr_Month, Stock, StringencyIndex) AS
    (SELECT CInfo.Country_ID, CInfo.Name, New_Cases/(Population/1000000), Stats.Date_Info, TO_CHAR(Stats.Date_Info, 'YYYY-WW'), 
    TO_CHAR(Stats.Date_Info, 'YYYY-MM'), Dow_Jones_Closing, Stringency_Index
    FROM tylerwescott.COVID_Statistics Stats
    JOIN tylerwescott.Country_Info Cinfo ON Cinfo.Country_Id = Stats.Country_Id
    JOIN tylerwescott.Public_Health_Measures HM ON Stats.Country_Id = HM.Country_Id AND Stats.Date_Info = HM.Date_Info
    LEFT JOIN tylerwescott.Economic_Indicators Eco on Eco.Date_Info = Stats.Date_Info AND Eco.Country_ID = stats.Country_Id
    WHERE CInfo.Country_ID = 'USA'),
    ByDate (Country_ID, Country, "DD-MON-YY", Average_Stringency_Index, Average_Dow_Jones_Closing_Price, Average_Covid_Cases_Per_Million) AS (
    SELECT Country_ID, Country, Date_, ROUND(AVG(StringencyIndex),2), ROUND(AVG(Stock),2), ROUND(AVG(CasesPerMil),2) 
    FROM Query1
    GROUP BY Country_ID, Country, Date_
    ORDER BY Country_ID, Date_)
    SELECT * FROM ByDate;`}</pre>
          </div>
        </div>
      )}
      {showDataModal && (
        <div className="absolute min-h-screen w-full bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-5 rounded-lg shadow-lg relative self-center w-full max-w-[1200px]">
            <button
              onClick={() => setShowDataModal(false)}
              className="absolute top-2 right-2 text-gray-800 hover:text-gray-600"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </button>
            <table className="table-auto w-full">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Stringency Index</th>
                  <th>Dow Jones Closing Price</th>
                  <th>Covid Cases Per Million</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, index) => (
                  <tr key={index}>
                    <td>
                      {format(parseISO(row["DD-MON-YY"]), "MMM dd, yyyy")}
                    </td>
                    <td>{row.Average_Stringency_Index}</td>
                    <td>{row.Average_Dow_Jones_Closing_Price}</td>
                    <td>{row.Average_Covid_Cases_Per_Million}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default GraphComponent;
