import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
// @ts-ignore - raw import provided by Vite
import corporateHtml from "./corporate.html?raw";

const Corporate = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const data = e.data;
      if (data && typeof data === "object" && data.type === "owm-nav" && typeof data.to === "string") {
        navigate(data.to);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [navigate]);

  return (
    <iframe
      srcDoc={corporateHtml}
      title="One World Morocco — Corporate"
      style={{ border: "none", width: "100vw", height: "100vh", display: "block" }}
    />
  );
};

export default Corporate;
