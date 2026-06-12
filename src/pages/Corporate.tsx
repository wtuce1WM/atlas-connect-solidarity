// @ts-ignore - raw import provided by Vite
import corporateHtml from "./corporate.html?raw";

const Corporate = () => {
  return (
    <iframe
      srcDoc={corporateHtml}
      title="One World Morocco — Corporate"
      style={{ border: "none", width: "100vw", height: "100vh", display: "block" }}
    />
  );
};

export default Corporate;
