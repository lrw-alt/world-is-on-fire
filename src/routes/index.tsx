import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AtlasApp } from "@/components/atlas/atlas-app";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <QueryClientProvider client={queryClient}>
      <AtlasApp />
    </QueryClientProvider>
  );
}
