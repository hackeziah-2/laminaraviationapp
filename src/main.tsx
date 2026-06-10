  import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import "./index.css";

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });

  // Suppress browser extension errors (works in both dev and production)
  window.addEventListener("unhandledrejection", (event) => {
    // Ignore checkout/popup config errors from browser extensions
    if (
      event.reason?.message?.includes("checkout popup config") ||
      event.reason?.message?.includes("No checkout popup") ||
      event.reason?.message?.includes("message channel closed") ||
      event.reason?.message?.includes("asynchronous response")
    ) {
      event.preventDefault();
      // Silently suppress these errors - they're from browser extensions
    }
  });

  // Also suppress console errors from browser extensions
  const originalError = console.error;
  console.error = (...args) => {
    const errorMessage = args.join(" ");
    if (
      errorMessage.includes("checkout popup config") ||
      errorMessage.includes("No checkout popup") ||
      errorMessage.includes("message channel closed") ||
      errorMessage.includes("asynchronous response")
    ) {
      // Suppress these errors silently
      return;
    }
    originalError.apply(console, args);
  };

  createRoot(document.getElementById("root")!).render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
  