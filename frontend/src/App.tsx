import { useEffect, useState } from "react";
import "./App.css";

type HealthResponse = {
  status: string;
  message: string;
};

function App() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json();
      })
      .then((json: HealthResponse) => setData(json))
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="container mt-5 text-center">
      <h1 className="text-primary">OwnUrVoice</h1>

      {error ? (
        <p className="text-danger mt-3">Error: {error}</p>
      ) : (
        <p className="lead mt-3">
          Backend says: <strong>{data ? data.message : "Loading..."}</strong>
        </p>
      )}

      <button className="btn btn-success mt-3">Continue</button>
    </div>
  );
}

export default App;


