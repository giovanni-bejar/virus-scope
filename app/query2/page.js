import GraphComponent from "../Root Components/GraphComponent";

export default function Query2() {
  return (
    <GraphComponent
      getCountry="http://localhost:3002/query2?getCountries=true"
      getQuery="http://localhost:3002/query2"
    />
  );
}
