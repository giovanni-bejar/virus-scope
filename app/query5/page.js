import GraphComponent from "../Root Components/GraphComponent";

export default function Query5() {
  return (
    <GraphComponent
      getCountry="http://localhost:3002/query5?getCountries=true"
      getQuery="http://localhost:3002/query5"
    />
  );
}
