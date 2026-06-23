import IORedis from "ioredis";

export const redis = new IORedis({
  host: "localhost",
  port: 6379,
});

export const subscriber = new IORedis({
  host: "localhost",
  port: 6379,
});

export const bullRedis = new IORedis({
  host: "localhost",
  port: 6379,
  maxRetriesPerRequest: null,
});
