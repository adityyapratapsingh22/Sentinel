import { useState, useEffect } from "react";

function currentRoute() {
  const hash = window.location.hash.replace(/^#/, "") || "/";
  return hash;
}

export function useHashRoute() {
  const [route, setRoute] = useState(currentRoute());

  useEffect(() => {
    const onHashChange = () => setRoute(currentRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return route;
}

export function navigate(path) {
  window.location.hash = path;
}
