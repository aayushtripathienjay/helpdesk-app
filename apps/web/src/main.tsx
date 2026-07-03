import { StrictMode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { App } from "./ui/App";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 15 * 60 * 1000,
      refetchOnWindowFocus: false,
      staleTime: 2 * 60 * 1000
    }
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
