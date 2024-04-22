import GraphComponent from "../Root Components/GraphComponent";

export default function Query1() {
  return (
    <GraphComponent
      getCountry="http://localhost:3002/query1?getCountries=true"
      getQuery="http://localhost:3002/query1"
    />
  );
}
