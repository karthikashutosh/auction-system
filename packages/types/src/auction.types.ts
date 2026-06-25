export interface GetAuctionsInput {
  limit: number;
  page: number;
}

export interface BidHistoryInput extends GetAuctionsInput {
  userId: string;
}

export interface PlaceBidServiceRequest {
  auctionId: string;
  userId: string;
  bidAmount: number;
}

export type AuthUser = {
  id: string;
};

export type BidStatus = "ACTIVE" | "CLOSED" | "PENDING";

export interface BidItem {
  id: string;
  title: string;
  image_key: string;
  bid_amount: string;
  current_price: string;
  status: BidStatus;
  end_time: string;
  bid_time: string;
}

export interface PaginationMeta {
  page: string;
  limit: string;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface BidsResponse {
  items: BidItem[];
  pagination: PaginationMeta;
}

export interface GetBidsParams {
  limit?: number;
  page?: number;
}

export interface CreateAuctionPayload {
  title: string;
  description: string;
  startingPrice: number;
  reservePrice: number;
  endDate: string;
  imageKey: string;
}

export interface CreateAuctionResponse {
  id: string;
  message: string;
}

export interface Auction {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  image_key: string | null;
  starting_price: string;
  current_price: string;
  reserve_price: string;
  start_time: string;
  end_time: string;
  status: string;
  highest_bidder_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuctionsResponse {
  items: Auction[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface AuctionDetail {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  owner_name: string;
  imageUrl: string;
  starting_price: number;
  current_price: number;
  reserve_price: number;

  total_bids: number;
  participated_users: number;

  is_owner: boolean;
  is_highest_bidder: boolean;
  is_reserve_met: boolean;

  status: "ACTIVE" | "ENDED";

  start_time: string;
  end_time: string;

  recent_bids_history: RecentBidsHistory[];
}

export interface RecentBidsHistory {
  id: string;
  user_id: string;
  amount: number;
  name: string;
  created_at: string;
}

export interface GetPresignedUrlPayload {
  fileName: string;
  contentType: string;
}

export interface GetPresignedUrlResponse {
  uploadUrl: string;
  key: string;
  //   imageUrl: string;
}

export interface PlaceBidPayload {
  bidAmount: number;
}

export interface PlaceBidVariables {
  auctionId: string;
  payload: PlaceBidPayload;
}

export interface PlaceBidResponse {
  id: string;
  bidAmount: number;
  userId: string;
}

export type NotificationType =
  | "AUCTION_WON"
  | "AUCTION_ENDED"
  | "OUTBID"
  | "NEW_BID"
  | "AUCTION_CREATED";

export type EntityType = "AUCTION";

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  entityType: EntityType;
  entityId: "string";
}

export interface NotificationResponse {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
  entity_id: string;
  entity_type: EntityType;
}

export type NotificationControlType = {
  notificationId: string;
  userId: string;
};
