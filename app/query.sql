SELECT Cinfo.Name as Country, ROUND(AVG(Daily_Covid_Tests),1) AS Covid_Tests, 
ROUND(AVG(Daily_Positivity_Rate),3) as Positivity_Rate,
TO_CHAR(Date_Info, 'YYYY-MM') AS Yr_Month
FROM tylerwescott.Health_Data Hdata
JOIN tylerwescott.Country_Info Cinfo ON Cinfo.Country_ID = Hdata.Country_ID
WHERE Daily_Covid_Tests IS NOT NULL AND Daily_Positivity_Rate IS NOT NULL
AND Cinfo.Name in ('United States', 'Mexico')
GROUP BY Cinfo.Name, TO_CHAR(Date_Info, 'YYYY-MM')
ORDER BY Cinfo.Name ASC, TO_CHAR(Date_Info, 'YYYY-MM') ASC