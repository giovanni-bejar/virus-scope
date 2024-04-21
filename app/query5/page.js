import GraphComponent2 from "../Root Components/GraphComponent2";
import GraphComponent from "../Root Components/GraphComponent";

export default function Query5() {
  return (
    <GraphComponent2
      getCountry="http://localhost:3002/query5?getCountries=true"
      getQuery="http://localhost:3002/query5"
    />
  );
}
