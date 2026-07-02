import { type ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  render,
  type RenderOptions,
  type RenderResult
} from "@testing-library/react";
import { MemoryRouter } from "react-router";

type RenderWithQueryOptions = Omit<RenderOptions, "wrapper"> & {
  initialEntries?: string[];
  queryClient?: QueryClient;
};

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false
      },
      queries: {
        retry: false
      }
    }
  });
}

function renderWithQuery(
  ui: ReactElement,
  {
    initialEntries = ["/"],
    queryClient = createTestQueryClient(),
    ...renderOptions
  }: RenderWithQueryOptions = {}
): RenderResult & { queryClient: QueryClient } {
  const result = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </QueryClientProvider>,
    renderOptions
  );

  return {
    ...result,
    queryClient
  };
}

export { createTestQueryClient, renderWithQuery };
