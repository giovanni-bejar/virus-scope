import GraphComponent from "../Root Components/GraphComponent";

export default function Query1() {
  return (
    <GraphComponent
      getCountry="http://192.168.1.29:3002/query1?getCountries=true"
      getQuery="http://192.168.1.29:3002/:3002/query1"
    />
  );
}
