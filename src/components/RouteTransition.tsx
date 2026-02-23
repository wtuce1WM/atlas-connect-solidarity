import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import LoadingScreen from "@/components/LoadingScreen";

const RouteTransition = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [showLoading, setShowLoading] = useState(false);
  const prevPath = useRef(location.pathname);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    // Skip on initial mount and same-path navigations (e.g. query changes on search page)
    if (prevPath.current === location.pathname) return;
    
    // Skip staff/affiliate pages
    const skipPaths = ["/staff/login", "/staff/backoffice", "/affiliates", "/affiliates/dashboard"];
    if (skipPaths.includes(location.pathname)) {
      prevPath.current = location.pathname;
      return;
    }

    setShowLoading(true);
    prevPath.current = location.pathname;

    timeoutRef.current = setTimeout(() => {
      setShowLoading(false);
    }, 400);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [location.pathname]);

  return (
    <>
      {showLoading && <LoadingScreen />}
      {children}
    </>
  );
};

export default RouteTransition;
