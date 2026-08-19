import { useState } from "react";
import { Link } from "react-router";

export default function IndexRoute() {
  const [count, setCount] = useState(0);

  return (
    <main>
      <h1>SSR works</h1>
      <button type="button" onClick={() => setCount((value) => value + 1)}>
        count:{count}
      </button>
      <Link to="/loader">Loader</Link>
      <Link to="/action">Action</Link>
    </main>
  );
}
