import GraphComponent2 from "../Root Components/GraphComponent2";

export default function Query5() {
  return (
    <GraphComponent2
      getCountry="http://192.168.1.29:3002/query5?getCountries=true"
      getQuery="http://192.168.1.29:3002/query5"
    />
  );
}
