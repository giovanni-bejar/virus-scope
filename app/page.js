import React from "react";
import Header from "./Root Components/header";

export default function Home() {
  return (
    <main className="bg-gray-100 min-h-screen">
      <Header />
      <section className="flex flex-col max-w-3xl mx-auto mt-8 px-4">
        <div>
          <h2 className="text-3xl font-bold mb-4 text-gray-800">Virus Scope</h2>
          <p className="text-lg text-gray-700 leading-relaxed">
            CIS4301 Spring 2024 Group 07
            <br />
            Giovanni Bejar
            <br />
            Kyle Cortez
            <br />
            Dustin MacLaughlin
            <br />
            Siddhartha Reddy
            <br />
            Tyler Wescott
          </p>
        </div>
      </section>
    </main>
  );
}
