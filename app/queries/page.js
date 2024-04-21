import Link from "next/link";

export default function Queries() {
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="max-w-md w-full bg-gray-100 shadow-lg rounded-lg overflow-hidden">
        <div className="px-4 py-2 bg-gray-900">
          <h1 className="text-2xl font-bold text-white text-center">Queries</h1>
        </div>
        <div className="p-4">
          <Link href="/query1">
            <h2 className="block mb-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-center hover:bg-gray-300 transition duration-300 cursor-pointer">
              Query 1 - The Stringency Index
            </h2>
          </Link>
          <Link href="/query2">
            <h2 className="block mb-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-center hover:bg-gray-300 transition duration-300 cursor-pointer">
              Query 2 - COVID and Healthcare Systems
            </h2>
          </Link>
          <Link href="/query3">
            <h2 className="block mb-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-center hover:bg-gray-300 transition duration-300 cursor-pointer">
              Query 3 - COVID Vaccinations
            </h2>
          </Link>
          <Link href="/query4">
            <h2 className="block mb-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-center hover:bg-gray-300 transition duration-300 cursor-pointer">
              Query 4 - COVID Testing
            </h2>
          </Link>
          <Link href="/query5">
            <h2 className="block mb-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-center hover:bg-gray-300 transition duration-300 cursor-pointer">
              Query 5 - COVID Risk Factors
            </h2>
          </Link>
          <Link href="/tuples">
            <h2 className="block mb-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-center hover:bg-gray-300 transition duration-300 cursor-pointer">
              Query 6 - Database Tuple Count
            </h2>
          </Link>
        </div>
      </div>
    </div>
  );
}
