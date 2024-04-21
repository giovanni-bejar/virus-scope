import GraphComponent from "../Root Components/GraphComponent";

export default function Query4() {
  return (
    <GraphComponent
      getCountry="http://localhost:3002/query4?getCountries=true"
      getQuery="http://localhost:3002/query4"
    />
  );
}
