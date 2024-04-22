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
  const { timeframe, getCountries, countryId } = req.query;
  let query;

  // Base WITH clause for all queries
  const withClause = `
    WITH Query1 AS (
      SELECT CInfo.Country_ID, CInfo.Name AS Country, New_Cases/(Population/1000000) AS CasesPerMil, Stats.Date_Info AS Date_, 
      TO_CHAR(Stats.Date_Info, 'YYYY-WW') AS Yr_Week, TO_CHAR(Stats.Date_Info, 'YYYY-MM') AS Yr_Month, 
      Dow_Jones_Closing AS Stock, Stringency_Index AS StringencyIndex
      FROM tylerwescott.Country_Info Cinfo
      LEFT JOIN tylerwescott.COVID_Statistics Stats ON Cinfo.Country_Id = Stats.Country_Id
      LEFT JOIN tylerwescott.Public_Health_Measures HM ON Stats.Country_Id = HM.Country_Id AND Stats.Date_Info = HM.Date_Info
      LEFT JOIN tylerwescott.Economic_Indicators Eco on Eco.Date_Info = Stats.Date_Info AND Eco.Country_ID = stats.Country_Id
    ),
    GetCountries AS (
      SELECT DISTINCT Country_ID, Country
      FROM Query1
    )`;

  // Parse countryId into an array if it contains multiple countries
  const countryIds = Array.isArray(countryId)
    ? countryId
    : countryId
    ? countryId.split(",")
    : [];

  if (getCountries) {
    query = `${withClause} SELECT * FROM GetCountries`;
  } else if (countryIds.length && timeframe === "daily") {
    query = `${withClause}
      , ByDate AS (
        SELECT Country_ID, Country, Date_ AS "DD-MON-YY", ROUND(AVG(Stock), 2) AS Average_Dow_Jones_Closing_Price, 
        ROUND(AVG(StringencyIndex), 2) AS Average_Stringency_Index, ROUND(AVG(CasesPerMil), 2) AS Average_Covid_Cases_Per_Million
        FROM Query1
        WHERE Country_ID IN (${countryIds.map((id) => `'${id}'`).join(", ")})
        GROUP BY Country_ID, Country, Date_
        ORDER BY Country_ID, Date_)
      SELECT * FROM ByDate`;
  } else if (countryIds.length && timeframe === "weekly") {
    query = `${withClause}
      , ByWeek AS (
        SELECT Country_ID, Country, Yr_Week AS "YYYY-WW", ROUND(AVG(Stock), 2) AS Average_Dow_Jones_Closing_Price, 
        ROUND(AVG(StringencyIndex), 2) AS Average_Stringency_Index, ROUND(AVG(CasesPerMil), 2) AS Average_Covid_Cases_Per_Million
        FROM Query1
        WHERE Country_ID IN (${countryIds.map((id) => `'${id}'`).join(", ")})
        GROUP BY Country_ID, Country, Yr_Week
        ORDER BY Country_ID, Yr_Week)
      SELECT * FROM ByWeek`;
  } else {
    // Default to monthly if not daily or weekly
    query = `${withClause}
      , ByMonth AS (
        SELECT Country_ID, Country, Yr_Month AS "YYYY-MM", ROUND(AVG(Stock), 2) AS Average_Dow_Jones_Closing_Price, 
        ROUND(AVG(StringencyIndex), 2) AS Average_Stringency_Index, ROUND(AVG(CasesPerMil), 2) AS Average_Covid_Cases_Per_Million
        FROM Query1
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

// Query 2 API CALLS - COMPLETE
app.get("/query2", async (req, res) => {
  const { countryId, timeframe, getCountries } = req.query;
  let query;

  // Base WITH clause for all queries
  const withClause = `
    WITH Query2 AS (
      SELECT CInfo.Country_ID, Cinfo.Name AS Country, Hosp_patients/(Population/1000000) AS HospPatsPerMil, ICU_patients/(Population/1000000) AS IcuPatsPerMil, New_cases/(Population/1000000) AS CasesPerMil, New_deaths/(Population/1000000) AS DeathsPerMil,

      Hdata.Date_info AS D_Date, TO_CHAR(Hdata.Date_Info, 'YYYY-WW') AS Yr_Week, TO_CHAR(Hdata.Date_Info, 'YYYY-MM') AS Yr_Month
      FROM tylerwescott.Country_Info Cinfo
      LEFT JOIN tylerwescott.Health_Data Hdata ON Cinfo.Country_ID = Hdata.Country_ID
      LEFT JOIN tylerwescott.COVID_Statistics Stats on Stats.Country_id = Hdata.Country_id AND Stats.Date_info = Hdata.Date_info
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
        ROUND(AVG(DeathsPerMil), 2) AS Average_Covid_Deaths_Per_Million
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
        ROUND(AVG(DeathsPerMil), 2) AS Average_Covid_Deaths_Per_Million
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
        ROUND(AVG(DeathsPerMil), 2) AS Average_Covid_Deaths_Per_Million
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

  // Full WITH clause for all queries
  const withClause = `
    WITH Query3 AS (
      SELECT Cinfo.Country_ID, Cinfo.Name AS Country, New_vaccinations/(Population/1000000) AS VaccsPerMil, New_cases/(Population/1000000) AS CasesPerMil,
      New_Deaths/(Population/1000000) AS DeathsPerMil, People_fully_vaccinated, Total_deaths, Total_cases, Stats.Date_info AS Date_,
      TO_CHAR(Stats.DATE_INFO, 'YYYY-WW') AS Yr_Week, TO_CHAR(Stats.DATE_INFO, 'YYYY-MM') AS Yr_Month
      FROM tylerwescott.Country_Info Cinfo
      JOIN tylerwescott.COVID_Statistics Stats ON Stats.Country_ID = Cinfo.Country_ID
      LEFT JOIN tylerwescott.Vaccination_Data Vax ON Cinfo.Country_id = Vax.Country_id AND Stats.Date_info = Vax.Date_info
      WHERE Stats.Date_info >= '01-JAN-21'
    ),
    One AS (
      SELECT Country_ID AS CountryCode1, Date_Info AS Country1Date, Pfizer_Administered AS Country1Pfizer, Moderna_Administered AS Country1Moderna, 
      OxfordAstraZeneca_Administered AS Country1OxfordAstraZeneca, SinopharmBeijing_Administered AS Country1SinopharmBeijing, 
      JohnsonJohnson_Administered AS Country1JohnsonJohnson, Sinovac_Administered AS Country1Sinovac, 
      Sputnikv_Administered AS Country1Sputnikv, Total_Boosters AS Country1Boosters
      FROM tylerwescott.Vaccination_Data
    ),
    Two AS (
      SELECT Country_ID AS CountryCode2, Date_Info AS Country2Date, Pfizer_Administered AS Country2Pfizer, Moderna_Administered AS Country2Moderna, 
      OxfordAstraZeneca_Administered AS Country2OxfordAstraZeneca, SinopharmBeijing_Administered AS Country2SinopharmBeijing, 
      JohnsonJohnson_Administered AS Country2JohnsonJohnson, Sinovac_Administered AS Country2Sinovac, 
      Sputnikv_Administered AS Country2Sputnikv, Total_Boosters AS Country2Boosters
      FROM tylerwescott.Vaccination_Data
    ),
    Manufacturer AS (
      SELECT CountryCode1, Country1Date, CountryCode2, Country2Date,
        Country1Pfizer, Country2Pfizer, CASE WHEN Country2Pfizer = 0 THEN 0 ELSE Country2Pfizer - Country1Pfizer END AS ActualPfizer,
        Country1Moderna, Country2Moderna, CASE WHEN Country2Moderna = 0 THEN 0 ELSE Country2Moderna - Country1Moderna END AS ActualModerna,
        Country1OxfordAstraZeneca, Country2OxfordAstraZeneca, CASE WHEN Country2OxfordAstraZeneca = 0 THEN 0 ELSE Country2OxfordAstraZeneca - Country1OxfordAstraZeneca END AS ActualOxfordAstraZeneca,
        Country1SinopharmBeijing, Country2SinopharmBeijing, CASE WHEN Country2SinopharmBeijing = 0 THEN 0 ELSE Country2SinopharmBeijing - Country1SinopharmBeijing END AS ActualSinopharmBeijing,
        Country1JohnsonJohnson, Country2JohnsonJohnson, CASE WHEN Country2JohnsonJohnson = 0 THEN 0 ELSE Country2JohnsonJohnson - Country1JohnsonJohnson END AS ActualJohnsonJohnson,
        Country1Sinovac, Country2Sinovac, CASE WHEN Country2Sinovac = 0 THEN 0 ELSE Country2Sinovac - Country1Sinovac END AS ActualSinovac,
        Country1Sputnikv, Country2Sputnikv, CASE WHEN Country2Sputnikv = 0 THEN 0 ELSE Country2Sputnikv - Country1Sputnikv END AS ActualSputnikv,
        Country1Boosters, Country2Boosters, CASE WHEN Country2Boosters = 0 THEN 0 ELSE Country2Boosters - Country1Boosters END AS ActualBoosters
      FROM One, Two
      WHERE CountryCode1 = CountryCode2 AND Country1Date + INTERVAL '1' DAY = Country2Date
    ),
    ManufacturerUnion AS (
      SELECT * FROM Manufacturer
      UNION ALL
      SELECT * FROM Manufacturer WHERE CountryCode1 = CountryCode2 AND Country1Date + INTERVAL '7' DAY = Country2Date 
      AND CountryCode1 NOT IN (SELECT DISTINCT CountryCode1 FROM Manufacturer)
    ),
    Final AS (
      SELECT Cinfo.Country_ID, Country, VaccsPerMil, CasesPerMil, DeathsPerMil, People_fully_vaccinated, Total_deaths, Total_cases, Date_, Yr_Week,
      Yr_Month, ActualPfizer/(Population/1000000) AS PfizerPerMil, ActualModerna/(Population/1000000) AS ModernaPerMil, ActualOxfordAstraZeneca/(Population/1000000) AS OxfordAstraZenecaPerMil,
      ActualSinoPharmBeijing/(Population/1000000) AS SinoPharmBeijingPerMil, ActualJohnsonJohnson/(Population/1000000) AS JohnsonJohnsonPerMil, ActualSinovac/(Population/1000000) AS SinovacPerMil,
      ActualSputnikv/(Population/1000000) AS SputnikvPerMil, ActualBoosters/(Population/1000000) AS BoostersPerMil
      FROM Query3
      JOIN tylerwescott.Country_Info Cinfo ON Cinfo.Country_id = Query3.Country_id
      LEFT JOIN ManufacturerUnion ON ManufacturerUnion.CountryCode1 = Query3.Country_ID AND ManufacturerUnion.Country1Date = Query3.Date_
    )
  `;

  // Parse countryId into an array if it contains multiple countries
  const countryIds = Array.isArray(countryId)
    ? countryId
    : countryId
    ? countryId.split(",")
    : [];

  if (getCountries) {
    query = `${withClause} SELECT DISTINCT Country_ID, Country FROM Query3`;
  } else {
    // Additional filtering queries
    const filterQuery =
      countryIds.length > 0
        ? `WHERE Country_ID IN (${countryIds
            .map((id) => `'${id}'`)
            .join(", ")})`
        : "";
    if (timeframe === "daily") {
      query = `${withClause}
        , ByDate AS (
          SELECT Country_ID, Country, Date_ AS "DD-MON-YY", ROUND(AVG(VaccsPerMil), 2) AS Average_Vaccines_Per_Million,
          ROUND(AVG(CasesPerMil), 2) AS Average_Cases_Per_Million, ROUND(AVG(DeathsPerMil), 2) AS Average_Deaths_Per_Million,
          ROUND(AVG(PfizerPerMil), 2) AS Average_Pfizer_Vaccines_Per_Million, ROUND(AVG(ModernaPerMil), 2) AS Average_Moderna_Vaccines_Per_Million,
          ROUND(AVG(OxfordAstraZenecaPerMil), 2) AS Average_OxfordAstraZeneca_Vaccines_Per_Million, ROUND(AVG(SinoPharmBeijingPerMil), 2) AS Average_SinoPharmBeijing_Vaccines_Per_Million,
          ROUND(AVG(JohnsonJohnsonPerMil), 2) AS Average_JohnsonJohnson_Vaccines_Per_Million, ROUND(AVG(SinovacPerMil), 2) AS Average_Sinovac_Per_Million,
          ROUND(AVG(SputnikvPerMil), 2) AS Average_Sputnikv_Vaccines_Per_Million, ROUND(AVG(BoostersPerMil), 2) AS Average_Boosters_Per_Million,
          MAX(People_fully_vaccinated) AS People_Fully_Vaccinated, MAX(Total_deaths) AS Total_Deaths, MAX(Total_cases) AS Total_Cases
          FROM Final
          ${filterQuery}
          GROUP BY Country_ID, Country, Date_
          ORDER BY Country_ID, Date_
        )
        SELECT * FROM ByDate`;
    } else if (timeframe === "weekly") {
      query = `${withClause}
        , ByWeek AS (
          SELECT Country_ID, Country, Yr_Week AS "YYYY-WW", ROUND(AVG(VaccsPerMil), 2) AS Average_Vaccines_Per_Million,
          ROUND(AVG(CasesPerMil), 2) AS Average_Cases_Per_Million, ROUND(AVG(DeathsPerMil), 2) AS Average_Deaths_Per_Million,
          ROUND(AVG(PfizerPerMil), 2) AS Average_Pfizer_Vaccines_Per_Million, ROUND(AVG(ModernaPerMil), 2) AS Average_Moderna_Vaccines_Per_Million,
          ROUND(AVG(OxfordAstraZenecaPerMil), 2) AS Average_OxfordAstraZeneca_Vaccines_Per_Million, ROUND(AVG(SinoPharmBeijingPerMil), 2) AS Average_SinoPharmBeijing_Vaccines_Per_Million,
          ROUND(AVG(JohnsonJohnsonPerMil), 2) AS Average_JohnsonJohnson_Vaccines_Per_Million, ROUND(AVG(SinovacPerMil), 2) AS Average_Sinovac_Per_Million,
          ROUND(AVG(SputnikvPerMil), 2) AS Average_Sputnikv_Vaccines_Per_Million, ROUND(AVG(BoostersPerMil), 2) AS Average_Boosters_Per_Million,
          MAX(People_fully_vaccinated) AS People_Fully_Vaccinated, MAX(Total_deaths) AS Total_Deaths, MAX(Total_cases) AS Total_Cases
          FROM Final
          ${filterQuery}
          GROUP BY Country_ID, Country, Yr_Week
          ORDER BY Country_ID, Yr_Week
        )
        SELECT * FROM ByWeek`;
    } else {
      query = `${withClause}
        , ByMonth AS (
          SELECT Country_ID, Country, Yr_Month AS "YYYY-MM", ROUND(AVG(VaccsPerMil), 2) AS Average_Vaccines_Per_Million,
          ROUND(AVG(CasesPerMil), 2) AS Average_Cases_Per_Million, ROUND(AVG(DeathsPerMil), 2) AS Average_Deaths_Per_Million,
          ROUND(AVG(PfizerPerMil), 2) AS Average_Pfizer_Vaccines_Per_Million, ROUND(AVG(ModernaPerMil), 2) AS Average_Moderna_Vaccines_Per_Million,
          ROUND(AVG(OxfordAstraZenecaPerMil), 2) AS Average_OxfordAstraZeneca_Vaccines_Per_Million, ROUND(AVG(SinoPharmBeijingPerMil), 2) AS Average_SinoPharmBeijing_Vaccines_Per_Million,
          ROUND(AVG(JohnsonJohnsonPerMil), 2) AS Average_JohnsonJohnson_Vaccines_Per_Million, ROUND(AVG(SinovacPerMil), 2) AS Average_Sinovac_Per_Million,
          ROUND(AVG(SputnikvPerMil), 2) AS Average_Sputnikv_Vaccines_Per_Million, ROUND(AVG(BoostersPerMil), 2) AS Average_Boosters_Per_Million,
          MAX(People_fully_vaccinated) AS People_Fully_Vaccinated, MAX(Total_deaths) AS Total_Deaths, MAX(Total_cases) AS Total_Cases
          FROM Final
          ${filterQuery}
          GROUP BY Country_ID, Country, Yr_Month
          ORDER BY Country_ID, Yr_Month
        )
        SELECT * FROM ByMonth`;
    }
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
  const { countryId, timeframe, getCountries, getRiskFactors } = req.query;
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
    LookUp AS(
      SELECT Country.Name AS Country, AlcoholRiskCategory AS Alcohol, DiabetesRiskCategory AS Diabetes, 
      Aged65OlderRiskCategory AS Aged65OrOlder, GDPRiskCategory AS GDP, PopDenseRiskCategory AS PopulationDensity, 
      SmokingRiskCategory AS Smoking, ObesityRiskCategory AS Obesity FROM RiskCategories
      JOIN tylerwescott.Country_info Country ON RiskCategories.Countryid = Country.Country_id),
    FinalTable AS (
      SELECT 
        RiskCategories.*, Country_Info.Name AS Country, New_cases/(Country_Info.Population/1000000) AS CasesPerMil, New_Deaths/(Country_Info.Population/1000000) AS DeathsPerMil, 
        New_vaccinations/(Country_Info.Population/1000000) AS VaccsPerMil, COVID_Statistics.Date_Info AS Date_, TO_CHAR(COVID_Statistics.Date_Info, 'YYYY-WW') AS Yr_Week, TO_CHAR(COVID_Statistics.Date_Info, 'YYYY-MM') AS Yr_Month 
      FROM RiskCategories
      JOIN tylerwescott.Country_Info ON RiskCategories.CountryID = Country_Info.Country_ID
      JOIN tylerwescott.COVID_Statistics ON COVID_Statistics.Country_ID = Country_Info.Country_ID
      LEFT JOIN tylerwescott.Vaccination_Data ON Vaccination_Data.Country_ID = COVID_Statistics.Country_ID AND Vaccination_Data.Date_Info = COVID_Statistics.Date_Info
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
  } else if (getRiskFactors) {
    query = `${withClause} SELECT * FROM LookUp`;
  } else {
    // Build the main query based on the timeframe and country IDs
    let timeframeQuery;
    switch (timeframe) {
      case "daily":
        timeframeQuery = `, ByDate AS (
            SELECT CountryID, Country, Date_ AS "DD-MON-YY", AlcoholRiskCategory AS Alcohol_Risk_Level, DiabetesRiskCategory AS Diabetes_Risk_Level, Aged65OlderRiskCategory AS Aged_65_Older_Risk_Level, GDPRiskCategory AS GDP_Risk_Level, PopDenseRiskCategory AS Population_Density_Risk_Level, 
            SmokingRiskCategory AS Smoking_Risk_Level, ObesityRiskCategory AS Obesity_Risk_Level, ROUND(AVG(CasesPerMil), 2) AS Average_Cases_Per_Million, ROUND(AVG(DeathsPerMil), 2) AS Average_Deaths_Per_Million, ROUND(AVG(VaccsPerMil), 2) AS Average_Vaccinations_Per_Million
            FROM FinalTable
            WHERE CountryID IN (${countryIds.map((id) => `'${id}'`).join(", ")})
            GROUP BY CountryID, Country, AlcoholRiskCategory, DiabetesRiskCategory, Aged65OlderRiskCategory, GDPRiskCategory, PopDenseRiskCategory, SmokingRiskCategory, ObesityRiskCategory, Date_
            ORDER BY CountryID, Date_)
          SELECT * FROM ByDate`;
        break;
      case "weekly":
        timeframeQuery = `, ByWeek AS (
            SELECT CountryID, Country, Yr_Week AS "YYYY-WW", AlcoholRiskCategory AS Alcohol_Risk_Level, DiabetesRiskCategory AS Diabetes_Risk_Level, Aged65OlderRiskCategory AS Aged_65_Older_Risk_Level, GDPRiskCategory AS GDP_Risk_Level, PopDenseRiskCategory AS Population_Density_Risk_Level, 
            SmokingRiskCategory AS Smoking_Risk_Level, ObesityRiskCategory AS Obesity_Risk_Level, ROUND(AVG(CasesPerMil), 2) AS Average_Cases_Per_Million, ROUND(AVG(DeathsPerMil), 2) AS Average_Deaths_Per_Million, ROUND(AVG(VaccsPerMil), 2) AS Average_Vaccinations_Per_Million
            FROM FinalTable
            WHERE CountryID IN (${countryIds.map((id) => `'${id}'`).join(", ")})
            GROUP BY CountryID, Country, AlcoholRiskCategory, DiabetesRiskCategory, Aged65OlderRiskCategory, GDPRiskCategory, PopDenseRiskCategory, SmokingRiskCategory, ObesityRiskCategory, Yr_Week
            ORDER BY CountryID, Yr_Week)
          SELECT * FROM ByWeek`;
        break;
      default:
        // Default to monthly
        timeframeQuery = `, ByMonth AS (
            SELECT CountryID, Country, Yr_Month AS "YYYY-MM", AlcoholRiskCategory AS Alcohol_Risk_Level, DiabetesRiskCategory AS Diabetes_Risk_Level, Aged65OlderRiskCategory AS Aged_65_Older_Risk_Level, GDPRiskCategory AS GDP_Risk_Level, PopDenseRiskCategory AS Population_Density_Risk_Level, 
            SmokingRiskCategory AS Smoking_Risk_Level, ObesityRiskCategory AS Obesity_Risk_Level, ROUND(AVG(CasesPerMil), 2) AS Average_Cases_Per_Million, ROUND(AVG(DeathsPerMil), 2) AS Average_Deaths_Per_Million, ROUND(AVG(VaccsPerMil), 2) AS Average_Vaccinations_Per_Million
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

// Query Tuples API CALLS - COMPLETE
app.get("/tuples", async (req, res) => {
  const query = `
    WITH TCount (TableCount) AS (
      SELECT COUNT(*) FROM tylerwescott.Country_Info
      UNION ALL
      SELECT COUNT(*) FROM tylerwescott.COVID_Statistics
      UNION ALL
      SELECT COUNT(*) FROM tylerwescott.Public_Health_Measures
      UNION ALL
      SELECT COUNT(*) FROM tylerwescott.Economic_Indicators
      UNION ALL
      SELECT COUNT(*) FROM tylerwescott.Health_Data
      UNION ALL
      SELECT COUNT(*) FROM tylerwescott.Vaccination_Data
      UNION ALL
      SELECT COUNT(*) FROM tylerwescott.Risk_Factors
    )
    SELECT SUM(TableCount) AS Total_Tuples_In_Database 
    FROM TCount
  `;

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
