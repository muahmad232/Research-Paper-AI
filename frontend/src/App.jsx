import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Papers from './pages/Papers'
import ResearchGaps from './pages/ResearchGaps'
import Escalations from './pages/Escalations'
import Settings from './pages/Settings'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/papers" element={<Papers />} />
            <Route path="/gaps" element={<ResearchGaps />} />
            <Route path="/escalations" element={<Escalations />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </BrowserRouter>
      <Toaster position="bottom-right" />
    </QueryClientProvider>
  )
}
