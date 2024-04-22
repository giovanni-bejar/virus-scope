import GraphComponent from "../Root Components/GraphComponent";

export default function Query2() {
  return (
    <GraphComponent
      getCountry="http://192.168.1.29:3002/query2?getCountries=true"
      getQuery="http://192.168.1.29:3002/query2"
    />
  );
}
