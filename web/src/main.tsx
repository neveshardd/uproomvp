import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";
import "./index.css";
import { queryClient } from "./lib/queryClient";
import Devtools from "./components/ReactQueryDevtools";
// Removido fix de redirecionamento no cliente para evitar loops.

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
    <Devtools />
  </QueryClientProvider>
);
