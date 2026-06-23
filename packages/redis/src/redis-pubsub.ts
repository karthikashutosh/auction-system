import { redis, subscriber } from "./index";

type MessageHandler = (message: string) => void;

const handlers = new Map<string, Set<MessageHandler>>();

subscriber.on("message", (channel: string, message: string) => {
  const channelHandlers = handlers.get(channel);

  if (!channelHandlers) return;

  for (const handler of channelHandlers) {
    handler(message);
  }
});

export const publish = async (channel: string, payload: unknown) => {
  await redis.publish(channel, JSON.stringify(payload));
};

export const subscribe = async (channel: string, handler: MessageHandler) => {
  let channelHandlers = handlers.get(channel);

  if (!channelHandlers) {
    channelHandlers = new Set<MessageHandler>();

    handlers.set(channel, channelHandlers);

    await subscriber.subscribe(channel);
  }

  channelHandlers.add(handler);
};

export const unsubscribe = async (channel: string, handler: MessageHandler) => {
  const channelHandlers = handlers.get(channel);

  if (!channelHandlers) return;

  channelHandlers.delete(handler);

  if (channelHandlers.size === 0) {
    handlers.delete(channel);

    await subscriber.unsubscribe(channel);
  }
};
