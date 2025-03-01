import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MediaGrid } from './components/Media/MediaGrid'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MediaGrid />
    </QueryClientProvider>
  )
}