import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import Index from './pages/Index'

function App() {
  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Router>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="*" element={<Index />} />
        </Routes>
      </Router>
    </TooltipProvider>
  )
}

export default App;
