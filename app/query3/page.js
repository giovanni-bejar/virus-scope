import GraphComponent from "../Root Components/GraphComponent";

export default function Query3() {
  return (
    <GraphComponent
      getCountry="http://localhost:3002/query3?getCountries=true"
      getQuery="http://localhost:3002/query3"
    />
  );
}
