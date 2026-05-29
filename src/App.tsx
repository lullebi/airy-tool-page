import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import RegistreraLeverantorer from "./pages/RegistreraLeverantorer.tsx";
import Quiz from "./pages/Quiz.tsx";
import Atgardsplan from "./pages/Atgardsplan.tsx";
import { warmUp } from "@/lib/api";

const queryClient = new QueryClient();

const App = () => {
  // Väck Render-instansen direkt vid appstart så den är varm när användaren behöver datan.
  useEffect(() => {
    warmUp();
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/registrera-leverantorer" element={<RegistreraLeverantorer />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/atgardsplan" element={<Atgardsplan />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
