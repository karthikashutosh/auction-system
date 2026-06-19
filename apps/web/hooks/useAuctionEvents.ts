"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AuctionDetail } from "./useGetAuctionById";

export function useAuctionEvents(auctionId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!auctionId) return;

    const eventSource = new EventSource(
      `${process.env.NEXT_PUBLIC_API_URL}/api/auctions/${auctionId}/events`,
      {
        withCredentials: true,
      }
    );

    eventSource.onopen = () => {
      console.log("[SSE] Connected", auctionId);
    };

    eventSource.onmessage = (event) => {
      const payload = JSON.parse(event.data);

      switch (payload.type) {
        case "NEW_BID":
          queryClient.setQueryData<AuctionDetail>(
            ["auction", auctionId],
            (oldData) => {
              if (!oldData) {
                return oldData;
              }

              return {
                ...oldData,
                current_price: Number(payload.amount),
                total_bids: oldData.total_bids + 1,
                recent_bids_history: [
                  {
                    id: payload.id,
                    user_id: payload.user_id,
                    amount: Number(payload.amount),
                    name: payload.name,
                    created_at: payload.created_at,
                  },
                  ...oldData.recent_bids_history,
                ],
              };
            }
          );

          break;

        default:
          break;
      }
    };

    eventSource.onerror = (error) => {
      console.error("[SSE] Error", error);
    };

    return () => {
      eventSource.close();
    };
  }, [auctionId, queryClient]);
}
