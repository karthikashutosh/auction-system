import { ServerResponse } from "http";

type Client = {
  userId: string;
  connection: ServerResponse;
};

const auctionMap = new Map<string, Set<Client>>();

type SubscribeData = {
  userId: string;
  auctionId: string;
  connection: ServerResponse;
};

type SendStream = {
  auctionId: string;
  payload: Record<string, unknown>;
};

export function Subscribe(data: SubscribeData) {
  const { auctionId, connection, userId } = data;

  if (!auctionMap.has(auctionId)) {
    auctionMap.set(auctionId, new Set());
  }

  auctionMap.get(auctionId)?.add({
    userId,
    connection,
  });
}

export function unSubscribe(data: Omit<SubscribeData, "userId">) {
  const { auctionId, connection } = data;

  const clients = auctionMap.get(auctionId);

  if (!clients) return;

  for (const client of clients) {
    if (client.connection === connection) {
      clients.delete(client);
      break;
    }
  }

  if (clients.size === 0) {
    auctionMap.delete(auctionId);
  }
}

export function sendRealTimeBidsUpdate(data: SendStream) {
  const { auctionId, payload } = data;

  const clients = auctionMap.get(auctionId);

  if (!clients) return;

  const message = `data: ${JSON.stringify(payload)}\n\n`;

  for (const client of clients) {
    client.connection.write(message);
  }
}
