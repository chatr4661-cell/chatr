import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";

// Minimal working version - forced rebuild
const queryClient = new QueryClient();

const MinimalIndex = () => (
  <div className="flex items-center justify-center min-h-screen">
    <h1 className="text-4xl font-bold">App Loading...</h1>
  </div>
);

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <BrowserRouter>
          <Routes>
            <Route path="/*" element={<MinimalIndex />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
