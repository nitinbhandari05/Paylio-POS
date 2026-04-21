import React from "react";
import POSPage from "./pages/POSPage";
import { POSProvider } from "./context/POSContext";

export default function App() {
  return (
    <POSProvider>
      <POSPage />
    </POSProvider>
  );
}
