"use client";

import { useState } from "react";
import { Toaster, toaster } from "../components/ui/toaster";
import { GoogleOAuthProvider } from "@react-oauth/google";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ChakraProvider } from "@chakra-ui/react";
import { system } from "./theme";
import { getErrorMessage } from "../api/axios";
import axios from "axios";

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

            toaster.create({
              title: "Error",
              description: getErrorMessage(error),
              type: "error",
            });
          },
        }),

        mutationCache: new MutationCache({
          onError: (error) => {
            toaster.create({
              title: "Error",
              description: getErrorMessage(error),
              type: "error",
            });
          },
        }),
      })
  );

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
      <QueryClientProvider client={queryClient}>
        <ChakraProvider value={system}>
          {children}
          <Toaster />
        </ChakraProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}
