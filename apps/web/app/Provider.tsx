"use client";

import { ChakraProvider } from "@chakra-ui/react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import axios from "axios";
import { useState } from "react";
import { Toaster } from "sonner";
import { getErrorMessage } from "../api/axios";
import { notify } from "./lib/notify";
import { system } from "./theme";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error, query) => {
            const isMeUnauthorized =
              query.queryKey[0] === "me" &&
              axios.isAxiosError(error) &&
              error.response?.status === 401;

            if (isMeUnauthorized) {
              return;
            }

            notify.error(getErrorMessage(error));
          },
        }),

        mutationCache: new MutationCache({
          onError: (error) => {
            notify.error(getErrorMessage(error));
          },
        }),
      })
  );

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
      <QueryClientProvider client={queryClient}>
        <ChakraProvider value={system}>
          {children}
          <Toaster richColors position="top-center" />
        </ChakraProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}
