const express = require("express");
const oracledb = require("oracledb");
const cors = require("cors");

const app = express();
const port = 3002;

app.use(cors());
app.use(express.json());

// OracleDB connection details
const dbConfig = {
  user: "", // UF CISE username
  password: "", // UF CISE password
  connectString: "oracle.cise.ufl.edu:1521/orcl",
};

// Data fetching endpoint
app.get("/query1", async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const result =
      await connection.execute(`WITH Query1 (Country_ID, Country, CasesPerMil, Date_, Yr_Week, Yr_Month, Stock, StringencyIndex) AS
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
    SELECT * FROM ByDate`);

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching data from OracleDB");
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
