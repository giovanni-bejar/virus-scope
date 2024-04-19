const express = require("express");
const oracledb = require("oracledb");
const cors = require("cors");

const app = express();
const port = 3002;

app.use(cors());
app.use(express.json());

// OracleDB connection details
const dbConfig = {
  user: "",
  password: "",
  connectString: "oracle.cise.ufl.edu:1521/orcl",
};

// Query 1 API CALLS - COMPLETE
app.get("/query1", async (req, res) => {
  const { timeframe } = req.query;
  let query;

  const withClause = `
    WITH Query1 (Country_ID, Country, CasesPerMil, Date_, Yr_Week, Yr_Month, Stock, StringencyIndex) AS (
      SELECT CInfo.Country_ID, CInfo.Name, New_Cases/(Population/1000000), Stats.Date_Info, TO_CHAR(Stats.Date_Info, 'YYYY-WW'), 
      TO_CHAR(Stats.Date_Info, 'YYYY-MM'), Dow_Jones_Closing, Stringency_Index
      FROM tylerwescott.COVID_Statistics Stats
      JOIN tylerwescott.Country_Info Cinfo ON Cinfo.Country_Id = Stats.Country_Id
      JOIN tylerwescott.Public_Health_Measures HM ON Stats.Country_Id = HM.Country_Id AND Stats.Date_Info = HM.Date_Info
      LEFT JOIN tylerwescott.Economic_Indicators Eco on Eco.Date_Info = Stats.Date_Info AND Eco.Country_ID = stats.Country_Id
      WHERE CInfo.Country_ID = 'USA'
    ),
    ByDate (Country_ID, Country, "DD-MON-YY", Average_Stringency_Index, Average_Dow_Jones_Closing_Price, Average_Covid_Cases_Per_Million) AS (
      SELECT Country_ID, Country, Date_, ROUND(AVG(StringencyIndex),2), ROUND(AVG(Stock),2), ROUND(AVG(CasesPerMil),2) 
      FROM Query1
      GROUP BY Country_ID, Country, Date_
      ORDER BY Country_ID, Date_
    ),
    ByWeek (Country_ID, Country, "YYYY-WW", Average_Stringency_Index, Average_Dow_Jones_Closing_Price, Average_Covid_Cases_Per_Million) AS (
      SELECT Country_ID, Country, Yr_Week, ROUND(AVG(StringencyIndex),2), ROUND(AVG(Stock),2), ROUND(AVG(CasesPerMil),2) 
      FROM Query1
      GROUP BY Country_ID, Country, Yr_Week
      ORDER BY Country_ID, Yr_Week
    ),
    ByMonth (Country_ID, Country, "YYYY-MM", Average_Stringency_Index, Average_Dow_Jones_Closing_Price, Average_Covid_Cases_Per_Million) AS (
      SELECT Country_ID, Country, Yr_Month, ROUND(AVG(StringencyIndex),2), ROUND(AVG(Stock),2), ROUND(AVG(CasesPerMil),2) 
      FROM Query1
      GROUP BY Country_ID, Country, Yr_Month
      ORDER BY Country_ID, Yr_Month
    )`;

  if (timeframe === "daily") {
    query = `${withClause} SELECT * FROM ByDate`;
  } else if (timeframe === "weekly") {
    query = `${withClause} SELECT * FROM ByWeek`;
  } else {
    query = `${withClause} SELECT * FROM ByMonth`;
  }

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(query);
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

// Query 2 API CALLS - COMPLETE
app.get("/query2", async (req, res) => {
  const { countryId, timeframe, getCountries } = req.query;
  let query;

  // Base WITH clause for all queries
  const withClause = `
    WITH Query2 AS (
      SELECT CInfo.Country_ID, Cinfo.Name AS Country, Hosp_patients/(Population/1000000) AS HospPatsPerMil, ICU_patients/(Population/1000000) AS IcuPatsPerMil, New_cases/(Population/1000000) AS CasesPerMil, New_deaths/(Population/1000000) AS DeathsPerMil,
      CASE WHEN Icu_capacity IS NOT NULL AND Icu_capacity <> 0 THEN ROUND(Icu_patients/Icu_capacity, 2) END AS ICUcapRate,
      Hdata.Date_info AS D_Date, TO_CHAR(Hdata.Date_Info, 'YYYY-WW') AS Yr_Week, TO_CHAR(Hdata.Date_Info, 'YYYY-MM') AS Yr_Month
      FROM tylerwescott.Health_Data Hdata
      JOIN tylerwescott.COVID_Statistics Stats ON Stats.Country_id = Hdata.Country_id AND Stats.Date_info = Hdata.Date_info
      JOIN tylerwescott.Country_Info Cinfo ON Cinfo.Country_ID = Hdata.Country_ID
    ),
    GetCountries AS (
      SELECT DISTINCT Country_ID, Country
      FROM Query2
    )`;

  // Parse countryId into an array if it contains multiple countries
  const countryIds = Array.isArray(countryId)
    ? countryId
    : countryId
    ? countryId.split(",")
    : [];

  // If getCountries is true, fetch countries only
  if (getCountries) {
    query = `${withClause} SELECT * FROM GetCountries`;
  } else if (countryIds.length && timeframe === "daily") {
    query = `${withClause}
      , ByDate AS (
        SELECT Country_ID, Country, D_Date AS "DD-MON-YY", ROUND(AVG(HospPatsPerMil), 2) AS Average_Hospital_Patients_Per_Million,
        ROUND(AVG(IcuPatsPerMil), 2) AS Average_ICU_Patients_Per_Million, ROUND(AVG(CasesPerMil), 2) AS Average_Covid_Cases_Per_Million,
        ROUND(AVG(DeathsPerMil), 2) AS Average_Covid_Deaths_Per_Million, ROUND(AVG(ICUcapRate), 2) AS Average_ICU_Capacity_Rate
        FROM Query2
        WHERE Country_ID IN (${countryIds.map((id) => `'${id}'`).join(", ")})
        GROUP BY Country_ID, Country, D_Date
        ORDER BY Country_ID, D_Date)
      SELECT * FROM ByDate`;
  } else if (countryIds.length && timeframe === "weekly") {
    query = `${withClause}
      , ByWeek AS (
        SELECT Country_ID, Country, Yr_Week AS "YYYY-WW", ROUND(AVG(HospPatsPerMil), 2) AS Average_Hospital_Patients_Per_Million,
        ROUND(AVG(IcuPatsPerMil), 2) AS Average_ICU_Patients_Per_Million, ROUND(AVG(CasesPerMil), 2) AS Average_Covid_Cases_Per_Million,
        ROUND(AVG(DeathsPerMil), 2) AS Average_Covid_Deaths_Per_Million, ROUND(AVG(ICUcapRate), 2) AS Average_ICU_Capacity_Rate
        FROM Query2
        WHERE Country_ID IN (${countryIds.map((id) => `'${id}'`).join(", ")})
        GROUP BY Country_ID, Country, Yr_Week
        ORDER BY Country_ID, Yr_Week)
      SELECT * FROM ByWeek`;
  } else {
    // Default to monthly
    query = `${withClause}
      , ByMonth AS (
        SELECT Country_ID, Country, Yr_Month AS "YYYY-MM", ROUND(AVG(HospPatsPerMil), 2) AS Average_Hospital_Patients_Per_Million,
        ROUND(AVG(IcuPatsPerMil), 2) AS Average_ICU_Patients_Per_Million, ROUND(AVG(CasesPerMil), 2) AS Average_Covid_Cases_Per_Million,
        ROUND(AVG(DeathsPerMil), 2) AS Average_Covid_Deaths_Per_Million, ROUND(AVG(ICUcapRate), 2) AS Average_ICU_Capacity_Rate
        FROM Query2
        WHERE Country_ID IN (${countryIds.map((id) => `'${id}'`).join(", ")})
        GROUP BY Country_ID, Country, Yr_Month
        ORDER BY Country_ID, Yr_Month)
      SELECT * FROM ByMonth`;
  }

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(query);
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

// Query 3 API CALLS - COMPLETE
app.get("/query3", async (req, res) => {
  const { countryId, timeframe, getCountries } = req.query;
  let query;

  // Base WITH clause for all queries
  const withClause = `
    WITH Query3 AS (
      SELECT Cinfo.Country_ID, Cinfo.Name AS Country, New_vaccinations/(Population/1000000) AS VaccsPerMil, Boosters_administered/(Population*1000000) AS BoostersPerMil, 
      New_Deaths/(Population/1000000) AS DeathsPerMil, People_fully_vaccinated, Total_deaths, Total_cases,
      Vax.Date_info AS Date_, TO_CHAR(Vax.DATE_INFO, 'YYYY-WW') AS Yr_Week, TO_CHAR(Vax.DATE_INFO, 'YYYY-MM') AS Yr_Month
      FROM tylerwescott.Vaccination_Data Vax
      JOIN tylerwescott.Country_Info Cinfo ON Cinfo.Country_id = Vax.Country_id
      JOIN tylerwescott.COVID_Statistics Stats ON Stats.Country_id = Vax.Country_id AND Stats.Date_info = Vax.Date_info
    ),
    One(CountryCode1, Country1Date, Country1Pfizer, Country1Moderna, Country1OxfordAstraZeneca, Country1SinopharmBeijing, Country1JohnsonJohnson,
    Country1Sinovac, Country1Sputnikv ) 
    AS (
    SELECT Country_ID, Date_Info, Pfizer_Administered,  Moderna_Administered, OxfordAstraZeneca_Administered, SinopharmBeijing_Administered,
    JohnsonJohnson_Administered, Sinovac_Administered, Sputnikv_Administered 
    FROM tylerwescott.Vaccination_Data
    ),

    Two (CountryCode2, Country2Date, Country2Pfizer, Country2Moderna, Country2OxfordAstraZeneca, Country2SinopharmBeijing, Country2JohnsonJohnson,
    Country2Sinovac, Country2Sputnikv) 
    AS (
    SELECT Country_ID, Date_Info, Pfizer_Administered, Moderna_Administered, OxfordAstraZeneca_Administered, SinopharmBeijing_Administered,
    JohnsonJohnson_Administered, Sinovac_Administered, Sputnikv_Administered 
    FROM tylerwescott.Vaccination_Data
    ),

    Manufacturer (CountryCode1, Country1Date, CountryCode2, Country2Date, Country1Pfizer, Country2Pfizer, ActualPfizer, 
    Country1Moderna, Country2Moderna, ActualModerna, Country1OxfordAstraZeneca, Country2OxfordAstraZeneca, ActualOxfordAstraZeneca,
    Country1SinopharmBeijing, Country2SinopharmBeijing, ActualSinopharmBeijing, Country1JohnsonJohnson, Country2JohnsonJohnson, 
    ActualJohnsonJohnson, Country1Sinovac, Country2Sinovac, ActualSinovac, Country1Sputnikv, Country2Sputnikv, ActualSputnikv) 
    AS (
    SELECT CountryCode1, Country1Date, CountryCode2, Country2Date, 
    --Pfizer
    Country1Pfizer, Country2Pfizer,
    CASE WHEN Country2Pfizer = 0 THEN 0
    ELSE Country2Pfizer - Country1Pfizer
    END AS ActualPfizer,
    --Moderna
    Country1Moderna, Country2Moderna, 
    CASE WHEN Country2Moderna = 0 THEN 0
    ELSE Country2Moderna - Country1Moderna 
    END AS ActualModerna,
    --OxfordAstraZeneca
    Country1OxfordAstraZeneca, Country2OxfordAstraZeneca,
    CASE WHEN Country2OxfordAstraZeneca = 0 THEN 0
    ELSE Country2OxfordAstraZeneca - Country1OxfordAstraZeneca
    END AS ActualOxfordAstraZeneca,
    --SinopharmBeijing
    Country1SinopharmBeijing, Country2SinopharmBeijing, 
    CASE WHEN Country2SinopharmBeijing = 0 THEN 0
    ELSE Country2SinopharmBeijing - Country1SinopharmBeijing
    END AS ActualSinopharmBeijing,
    --JohnsonJohnson
    Country1JohnsonJohnson, Country2JohnsonJohnson, 
    CASE WHEN Country2JohnsonJohnson = 0 THEN 0
    ELSE Country2JohnsonJohnson - Country1JohnsonJohnson
    END AS ActualJohnsonJohnson,
    --Sinovac
    Country1Sinovac, Country2Sinovac,
    CASE WHEN Country2Sinovac = 0 THEN 0
    ELSE Country2Sinovac - Country1Sinovac
    END AS ActualSinovac,
    --Sputnikv
    Country1Sputnikv, Country2Sputnikv,
    CASE WHEN Country2Sputnikv = 0 THEN 0
    ELSE Country2Sputnikv  - Country1Sputnikv
    END AS ActualSputnikv

    FROM One, Two
    WHERE CountryCode1 = CountryCode2 AND Country1Date+1 = Country2Date
    ),

    Final (Country_ID, Country, VaccsPerMil, BoostersPerMil, DeathsPerMil, People_Fully_Vaccinated, Total_Deaths, Total_Cases, Date_, Yr_Week,
    Yr_Month, PfizerPerMil, ModernaPerMil, OxfordAstraZenecaPerMil, SinoPharmBeijingPerMil, JohnsonJohnsonPerMil, SinovacPerMil, SputnikvPerMil) 
    AS (
    SELECT Cinfo.Country_ID, Country, VaccsPerMil, BoostersPerMil, DeathsPerMil, People_Fully_Vaccinated, Total_Deaths, Total_Cases, Date_, Yr_Week,
    Yr_Month, ActualPfizer/(Population/1000000), ActualModerna/(Population/1000000), ActualOxfordAstraZeneca/(Population/1000000), 
    ActualSinoPharmBeijing/(Population/1000000), ActualJohnsonJohnson/(Population/1000000), ActualSinovac/(Population/1000000), 
    ActualSputnikv/(Population/1000000)
    FROM Query3
    JOIN Manufacturer ON Manufacturer.CountryCode1 = Query3.Country_ID AND Manufacturer.Country1Date = Query3.Date_
    JOIN tylerwescott.Country_Info Cinfo ON Cinfo.Country_id = Query3.Country_id
    ),

    GetCountries AS (
    SELECT DISTINCT Country_ID, Country
    FROM Query3
    )

  `;

  // Parse countryId into an array if it contains multiple countries
  const countryIds = Array.isArray(countryId)
    ? countryId
    : countryId
    ? countryId.split(",")
    : [];

  // If getCountries is true, fetch countries only
  if (getCountries) {
    query = `${withClause} SELECT * FROM GetCountries`;
  } else if (countryIds.length && timeframe === "daily") {
    query = `${withClause}
      , ByDate AS (
        SELECT Country_ID, Country, Date_ AS "DD-MON-YY", ROUND(AVG(VaccsPerMil), 2) AS Average_Vaccnies_Per_Million,
        ROUND(AVG(BoostersPerMil), 2) AS Average_Boosters_Per_Million, ROUND(AVG(PfizerPerMil), 2) AS Average_Pfizer_Vaccines_Per_Million,
        ROUND(AVG(ModernaPerMil), 2) AS Average_Moderna_Vaccines_Per_Million, ROUND(AVG(OxfordAstraZenecaPerMil), 2) AS Average_OxfordAstraZeneca_Vaccines_Per_Million,
        ROUND(AVG(SinoPharmBeijingPerMil), 2) AS Average_SinoPharmBeijing_Vaccines_Per_Million, ROUND(AVG(JohnsonJohnsonPerMil), 2) AS Average_JohnsonJohnson_Vaccines_Per_Million,
        ROUND(AVG(SinovacPerMil), 2) AS Average_Sinovac_Per_Million, ROUND(AVG(SputnikvPerMil), 2) AS Average_Sputnikv_Vaccines_Per_Million,
        MAX(People_Fully_Vaccinated) AS People_Fully_Vaccinated, MAX(Total_Deaths) AS Total_Deaths, MAX(Total_Cases) AS Total_Cases
        FROM Final
        WHERE Country_ID IN (${countryIds.map((id) => `'${id}'`).join(", ")})
        GROUP BY Country_ID, Country, Date_
        ORDER BY Country_ID, Date_)
      SELECT * FROM ByDate`;
  } else if (countryIds.length && timeframe === "weekly") {
    query = `${withClause}
      , ByWeek AS (
        SELECT Country_ID, Country, Yr_Week AS "YYYY-WW", ROUND(AVG(VaccsPerMil), 2) AS Average_Vaccnies_Per_Million,
        ROUND(AVG(BoostersPerMil), 2) AS Average_Boosters_Per_Million, ROUND(AVG(PfizerPerMil), 2) AS Average_Pfizer_Vaccines_Per_Million,
        ROUND(AVG(ModernaPerMil), 2) AS Average_Moderna_Vaccines_Per_Million, ROUND(AVG(OxfordAstraZenecaPerMil), 2) AS Average_OxfordAstraZeneca_Vaccines_Per_Million,
        ROUND(AVG(SinoPharmBeijingPerMil), 2) AS Average_SinoPharmBeijing_Vaccines_Per_Million, ROUND(AVG(JohnsonJohnsonPerMil), 2) AS Average_JohnsonJohnson_Vaccines_Per_Million,
        ROUND(AVG(SinovacPerMil), 2) AS Average_Sinovac_Per_Million, ROUND(AVG(SputnikvPerMil), 2) AS Average_Sputnikv_Vaccines_Per_Million,
        MAX(People_Fully_Vaccinated) AS People_Fully_Vaccinated, MAX(Total_Deaths) AS Total_Deaths, MAX(Total_Cases) AS Total_Cases
        FROM Final
        WHERE Country_ID IN (${countryIds.map((id) => `'${id}'`).join(", ")})
        GROUP BY Country_ID, Country, Yr_Week
        ORDER BY Country_ID, Yr_Week)
      SELECT * FROM ByWeek`;
  } else {
    // Default to monthly
    query = `${withClause}
      , ByMonth AS (
        SELECT Country_ID, Country, Yr_Month AS "YYYY-MM", ROUND(AVG(VaccsPerMil), 2) AS Average_Vaccnies_Per_Million,
        ROUND(AVG(BoostersPerMil), 2) AS Average_Boosters_Per_Million, ROUND(AVG(PfizerPerMil), 2) AS Average_Pfizer_Vaccines_Per_Million,
        ROUND(AVG(ModernaPerMil), 2) AS Average_Moderna_Vaccines_Per_Million, ROUND(AVG(OxfordAstraZenecaPerMil), 2) AS Average_OxfordAstraZeneca_Vaccines_Per_Million,
        ROUND(AVG(SinoPharmBeijingPerMil), 2) AS Average_SinoPharmBeijing_Vaccines_Per_Million, ROUND(AVG(JohnsonJohnsonPerMil), 2) AS Average_JohnsonJohnson_Vaccines_Per_Million,
        ROUND(AVG(SinovacPerMil), 2) AS Average_Sinovac_Per_Million, ROUND(AVG(SputnikvPerMil), 2) AS Average_Sputnikv_Vaccines_Per_Million,
        MAX(People_Fully_Vaccinated) AS People_Fully_Vaccinated, MAX(Total_Deaths) AS Total_Deaths, MAX(Total_Cases) AS Total_Cases
        FROM Final
        WHERE Country_ID IN (${countryIds.map((id) => `'${id}'`).join(", ")})
        GROUP BY Country_ID, Country, Yr_Month
        ORDER BY Country_ID, Yr_Month)
      SELECT * FROM ByMonth`;
  }

  console.log("Executing SQL Query:", query);

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(query);
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

// Query 4 API CALLS - COMPLETE
app.get("/query4", async (req, res) => {
  const { countryId, timeframe, getCountries } = req.query;
  let query;

  // Base WITH clause for all queries
  const withClause = `
    WITH Query4 AS (
      SELECT CInfo.Country_ID, Cinfo.Name AS Country, Daily_Covid_Tests/(Population/1000000) AS CovidTestsPerMil, Daily_Positivity_Rate AS Positivity_Rate, Stringency_Index,
      Hdata.Date_info AS Date_, TO_CHAR(Hdata.DATE_INFO, 'YYYY-MM') AS Yr_Month, TO_CHAR(Hdata.DATE_INFO, 'YYYY-WW') AS Yr_Week
      FROM tylerwescott.Health_Data Hdata
      JOIN tylerwescott.Country_Info Cinfo ON Cinfo.Country_id = Hdata.Country_id
      JOIN tylerwescott.Public_Health_Measures HM ON Hdata.Country_id = HM.Country_id AND Hdata.Date_Info = HM.Date_Info
    ),
    GetCountries AS (
      SELECT DISTINCT Country_ID, Country
      FROM Query4
    )`;

  // Parse countryId into an array if it contains multiple countries
  const countryIds = Array.isArray(countryId)
    ? countryId
    : countryId
    ? countryId.split(",")
    : [];

  // If getCountries is true, fetch countries only
  if (getCountries) {
    query = `${withClause} SELECT * FROM GetCountries`;
  } else {
    // Build the main query based on the timeframe and country IDs
    let timeframeQuery;
    switch (timeframe) {
      case "daily":
        timeframeQuery = `
          , ByDate AS (
            SELECT Country_ID, Country, Date_ AS "DD-MON-YY", ROUND(AVG(CovidTestsPerMil), 2) AS Average_Covid_Tests_Per_Million,
            ROUND(AVG(Positivity_Rate), 3) AS Average_Positvity_Rate, ROUND(AVG(Stringency_Index), 2) AS Average_Stringency_Index
            FROM Query4
            WHERE Country_ID IN (${countryIds
              .map((id) => `'${id}'`)
              .join(", ")})
            GROUP BY Country_ID, Country, Date_
            ORDER BY Country_ID, Date_)
          SELECT * FROM ByDate`;
        break;
      case "weekly":
        timeframeQuery = `
          , ByWeek AS (
            SELECT Country_ID, Country, Yr_Week AS "YYYY-WW", ROUND(AVG(CovidTestsPerMil), 2) AS Average_Covid_Tests_Per_Million,
            ROUND(AVG(Positivity_Rate), 3) AS Average_Positvity_Rate, ROUND(AVG(Stringency_Index), 2) AS Average_Stringency_Index
            FROM Query4
            WHERE Country_ID IN (${countryIds
              .map((id) => `'${id}'`)
              .join(", ")})
            GROUP BY Country_ID, Country, Yr_Week
            ORDER BY Country_ID, Yr_Week)
          SELECT * FROM ByWeek`;
        break;
      default:
        // Default to monthly
        timeframeQuery = `
          , ByMonth AS (
            SELECT Country_ID, Country, Yr_Month AS "YYYY-MM", ROUND(AVG(CovidTestsPerMil), 2) AS Average_Covid_Tests_Per_Million,
            ROUND(AVG(Positivity_Rate), 3) AS Average_Positvity_Rate, ROUND(AVG(Stringency_Index), 2) AS Average_Stringency_Index
            FROM Query4
            WHERE Country_ID IN (${countryIds
              .map((id) => `'${id}'`)
              .join(", ")})
            GROUP BY Country_ID, Country, Yr_Month
            ORDER BY Country_ID, Yr_Month)
          SELECT * FROM ByMonth`;
        break;
    }

    query = withClause + timeframeQuery;
  }

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(query);
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

// Query 5 API CALLS - COMPLETE
app.get("/query5", async (req, res) => {
  const { countryId, timeframe, getCountries } = req.query;
  let query;

  // Base WITH clause for all queries
  const withClause = `
    WITH Denom AS (
      SELECT Country_ID AS CountryID, Alcohol_Consumption AS Alcohol, Diabetes_Prevalence AS Diabetes, Age AS Aged65Older, Socioeconomic_Status AS GDP, Population_Density AS PopDense,
        CASE 
          WHEN Smoking_Rate_Female IS NOT NULL AND Smoking_Rate_Male IS NULL THEN Smoking_Rate_Female
          WHEN Smoking_Rate_Male IS NOT NULL AND Smoking_Rate_Female IS NULL THEN Smoking_Rate_Male
          WHEN Smoking_Rate_Male IS NOT NULL AND Smoking_Rate_Female IS NOT NULL THEN (Smoking_Rate_Female + Smoking_Rate_Male)/2
        END AS Smoking,
        CASE
          WHEN Obesity_Rate_Female IS NOT NULL AND Obesity_Rate_Male IS NULL THEN Obesity_Rate_Female
          WHEN Obesity_Rate_Male IS NOT NULL AND Obesity_Rate_Female IS NULL THEN Obesity_Rate_Male
          WHEN Obesity_Rate_Male IS NOT NULL AND Obesity_Rate_Female IS NOT NULL THEN (Obesity_Rate_Female + Obesity_Rate_Male)/2
        END AS Obesity
      FROM tylerwescott.Risk_Factors
    ),
    Percentiles AS (
      SELECT 
        PERCENTILE_CONT(0) WITHIN GROUP (ORDER BY Alcohol ASC) AS AlcoholMin, PERCENTILE_CONT(1/3) WITHIN GROUP (ORDER BY Alcohol ASC) AS AlcoholP1, PERCENTILE_CONT(2/3) WITHIN GROUP (ORDER BY Alcohol ASC) AS AlcoholP2, PERCENTILE_CONT(1) WITHIN GROUP (ORDER BY Alcohol ASC) AS AlcoholMax,
        PERCENTILE_CONT(0) WITHIN GROUP (ORDER BY Diabetes ASC) AS DiabetesMin, PERCENTILE_CONT(1/3) WITHIN GROUP (ORDER BY Diabetes ASC) AS DiabetesP1, PERCENTILE_CONT(2/3) WITHIN GROUP (ORDER BY Diabetes ASC) AS DiabetesP2, PERCENTILE_CONT(1) WITHIN GROUP (ORDER BY Diabetes ASC) AS DiabetesMax,
        PERCENTILE_CONT(0) WITHIN GROUP (ORDER BY Aged65Older ASC) AS Aged65OlderMin, PERCENTILE_CONT(1/3) WITHIN GROUP (ORDER BY Aged65Older ASC) AS Aged65OlderP1, PERCENTILE_CONT(2/3) WITHIN GROUP (ORDER BY Aged65Older ASC) AS Aged65OlderP2, PERCENTILE_CONT(1) WITHIN GROUP (ORDER BY Aged65Older ASC) AS Aged65OlderMax,
        PERCENTILE_CONT(0) WITHIN GROUP (ORDER BY GDP ASC) AS GDPMin, PERCENTILE_CONT(1/3) WITHIN GROUP (ORDER BY GDP ASC) AS GDPP1, PERCENTILE_CONT(2/3) WITHIN GROUP (ORDER BY GDP ASC) AS GDPP2, PERCENTILE_CONT(1) WITHIN GROUP (ORDER BY GDP ASC) AS GDPMax,
        PERCENTILE_CONT(0) WITHIN GROUP (ORDER BY PopDense ASC) AS PopDenseMin, PERCENTILE_CONT(1/3) WITHIN GROUP (ORDER BY PopDense ASC) AS PopDenseP1, PERCENTILE_CONT(2/3) WITHIN GROUP (ORDER BY PopDense ASC) AS PopDenseP2, PERCENTILE_CONT(1) WITHIN GROUP (ORDER BY PopDense ASC) AS PopDenseMax,
        PERCENTILE_CONT(0) WITHIN GROUP (ORDER BY Smoking ASC) AS SmokingMin, PERCENTILE_CONT(1/3) WITHIN GROUP (ORDER BY Smoking ASC) AS SmokingP1, PERCENTILE_CONT(2/3) WITHIN GROUP (ORDER BY Smoking ASC) AS SmokingP2, PERCENTILE_CONT(1) WITHIN GROUP (ORDER BY Smoking ASC) AS SmokingMax,
        PERCENTILE_CONT(0) WITHIN GROUP (ORDER BY Obesity ASC) AS ObesityMin, PERCENTILE_CONT(1/3) WITHIN GROUP (ORDER BY Obesity ASC) AS ObesityP1, PERCENTILE_CONT(2/3) WITHIN GROUP (ORDER BY Obesity ASC) AS ObesityP2, PERCENTILE_CONT(1) WITHIN GROUP (ORDER BY Obesity ASC) AS ObesityMax
      FROM Denom
    ),
    RiskCategories AS (
      SELECT 
        CountryID,
        CASE WHEN Alcohol >= AlcoholMin AND Alcohol < AlcoholP1 THEN 'Low' WHEN Alcohol >= AlcoholP1 AND Alcohol < AlcoholP2 THEN 'Medium' WHEN Alcohol >= AlcoholP2 THEN 'High' END AS AlcoholRiskCategory,
        CASE WHEN Diabetes >= DiabetesMin AND Diabetes < DiabetesP1 THEN 'Low' WHEN Diabetes >= DiabetesP1 AND Diabetes < DiabetesP2 THEN 'Medium' WHEN Diabetes >= DiabetesP2 THEN 'High' END AS DiabetesRiskCategory,
        CASE WHEN Aged65Older >= Aged65OlderMin AND Aged65Older < Aged65OlderP1 THEN 'Low' WHEN Aged65Older >= Aged65OlderP1 AND Aged65Older < Aged65OlderP2 THEN 'Medium' WHEN Aged65Older >= Aged65OlderP2 THEN 'High' END AS Aged65OlderRiskCategory,
        CASE WHEN GDP >= GDPMin AND GDP < GDPP1 THEN 'High' WHEN GDP >= GDPP1 AND GDP < GDPP2 THEN 'Medium' WHEN GDP >= GDPP2 THEN 'Low' END AS GDPRiskCategory,
        CASE WHEN PopDense >= PopDenseMin AND PopDense < PopDenseP1 THEN 'Low' WHEN PopDense >= PopDenseP1 AND PopDense < PopDenseP2 THEN 'Medium' WHEN PopDense >= PopDenseP2 THEN 'High' END AS PopDenseRiskCategory,
        CASE WHEN Smoking >= SmokingMin AND Smoking < SmokingP1 THEN 'Low' WHEN Smoking >= SmokingP1 AND Smoking < SmokingP2 THEN 'Medium' WHEN Smoking >= SmokingP2 THEN 'High' END AS SmokingRiskCategory,
        CASE WHEN Obesity >= ObesityMin AND Obesity < ObesityP1 THEN 'Low' WHEN Obesity >= ObesityP1 AND Obesity < ObesityP2 THEN 'Medium' WHEN Obesity >= ObesityP2 THEN 'High' END AS ObesityRiskCategory
      FROM Denom, Percentiles
    ),
    FinalTable AS (
      SELECT 
        RiskCategories.*, Country_Info.Name AS Country, New_cases/(Country_Info.Population/1000000) AS CasesPerMil, New_Deaths/(Country_Info.Population/1000000) AS DeathsPerMil, 
        New_vaccinations/(Country_Info.Population/1000000) AS VaccsPerMil, COVID_Statistics.Date_Info AS Date_, TO_CHAR(COVID_Statistics.Date_Info, 'YYYY-WW') AS Yr_Week, TO_CHAR(COVID_Statistics.Date_Info, 'YYYY-MM') AS Yr_Month 
      FROM RiskCategories
      JOIN tylerwescott.Country_Info ON RiskCategories.CountryID = Country_Info.Country_ID
      JOIN tylerwescott.COVID_Statistics ON COVID_Statistics.Country_ID = Country_Info.Country_ID
      JOIN tylerwescott.Vaccination_Data ON Vaccination_Data.Country_ID = COVID_Statistics.Country_ID AND Vaccination_Data.Date_Info = COVID_Statistics.Date_Info
    ),
    GetCountries AS (
      SELECT DISTINCT CountryID, Country
      FROM FinalTable
    )`;

  // Parse countryId into an array if it contains multiple countries
  const countryIds = Array.isArray(countryId)
    ? countryId
    : countryId
    ? countryId.split(",")
    : [];

  // If getCountries is true, fetch countries only
  if (getCountries) {
    query = `${withClause} SELECT * FROM GetCountries`;
  } else {
    // Build the main query based on the timeframe and country IDs
    let timeframeQuery;
    switch (timeframe) {
      case "daily":
        timeframeQuery = `, ByDate AS (
            SELECT CountryID, Country, AlcoholRiskCategory AS Alcohol_Risk_Level, DiabetesRiskCategory AS Diabetes_Risk_Level, Aged65OlderRiskCategory AS Aged_65_Older_Risk_Level, GDPRiskCategory AS GDP_Risk_Level, PopDenseRiskCategory AS Population_Density_Risk_Level, 
            SmokingRiskCategory AS Smoking_Risk_Level, ObesityRiskCategory AS Obesity_Risk_Level, Date_ AS "DD-MON-YY", ROUND(AVG(CasesPerMil), 2) AS Average_Cases_Per_Million, ROUND(AVG(DeathsPerMil), 2) AS Average_Deaths_Per_Million, ROUND(AVG(VaccsPerMil), 2) AS Average_Vaccinations_Per_Million
            FROM FinalTable
            WHERE CountryID IN (${countryIds.map((id) => `'${id}'`).join(", ")})
            GROUP BY CountryID, Country, AlcoholRiskCategory, DiabetesRiskCategory, Aged65OlderRiskCategory, GDPRiskCategory, PopDenseRiskCategory, SmokingRiskCategory, ObesityRiskCategory, Date_
            ORDER BY CountryID, Date_)
          SELECT * FROM ByDate`;
        break;
      case "weekly":
        timeframeQuery = `, ByWeek AS (
            SELECT CountryID, Country, AlcoholRiskCategory AS Alcohol_Risk_Level, DiabetesRiskCategory AS Diabetes_Risk_Level, Aged65OlderRiskCategory AS Aged_65_Older_Risk_Level, GDPRiskCategory AS GDP_Risk_Level, PopDenseRiskCategory AS Population_Density_Risk_Level, 
            SmokingRiskCategory AS Smoking_Risk_Level, ObesityRiskCategory AS Obesity_Risk_Level, Yr_Week AS "YYYY-WW", ROUND(AVG(CasesPerMil), 2) AS Average_Cases_Per_Million, ROUND(AVG(DeathsPerMil), 2) AS Average_Deaths_Per_Million, ROUND(AVG(VaccsPerMil), 2) AS Average_Vaccinations_Per_Million
            FROM FinalTable
            WHERE CountryID IN (${countryIds.map((id) => `'${id}'`).join(", ")})
            GROUP BY CountryID, Country, AlcoholRiskCategory, DiabetesRiskCategory, Aged65OlderRiskCategory, GDPRiskCategory, PopDenseRiskCategory, SmokingRiskCategory, ObesityRiskCategory, Yr_Week
            ORDER BY CountryID, Yr_Week)
          SELECT * FROM ByWeek`;
        break;
      default:
        // Default to monthly
        timeframeQuery = `, ByMonth AS (
            SELECT CountryID, Country, AlcoholRiskCategory AS Alcohol_Risk_Level, DiabetesRiskCategory AS Diabetes_Risk_Level, Aged65OlderRiskCategory AS Aged_65_Older_Risk_Level, GDPRiskCategory AS GDP_Risk_Level, PopDenseRiskCategory AS Population_Density_Risk_Level, 
            SmokingRiskCategory AS Smoking_Risk_Level, ObesityRiskCategory AS Obesity_Risk_Level, Yr_Month AS "YYYY-MM", ROUND(AVG(CasesPerMil), 2) AS Average_Cases_Per_Million, ROUND(AVG(DeathsPerMil), 2) AS Average_Deaths_Per_Million, ROUND(AVG(VaccsPerMil), 2) AS Average_Vaccinations_Per_Million
            FROM FinalTable
            WHERE CountryID IN (${countryIds.map((id) => `'${id}'`).join(", ")})
            GROUP BY CountryID, Country, AlcoholRiskCategory, DiabetesRiskCategory, Aged65OlderRiskCategory, GDPRiskCategory, PopDenseRiskCategory, SmokingRiskCategory, ObesityRiskCategory, Yr_Month
            ORDER BY CountryID, Yr_Month)
          SELECT * FROM ByMonth`;
        break;
    }

    query = withClause + timeframeQuery;
  }

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(query);
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
