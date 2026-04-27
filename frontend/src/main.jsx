import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { Toaster } from "react-hot-toast";

import "./index.css";
import App from "./App.jsx";
import { store } from "./app/store";

createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3500,
        style: {
          borderRadius: "10px",
          background: "#111827",
          color: "#f9fafb",
        },
        success: {
          iconTheme: {
            primary: "#10b981",
            secondary: "#f9fafb",
          },
        },
        error: {
          iconTheme: {
            primary: "#ef4444",
            secondary: "#f9fafb",
          },
        },
      }}
    />
  </Provider>,
);
