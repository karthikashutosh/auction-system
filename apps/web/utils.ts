export const formatAuctionDate = (date: string) => {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
};

export function formatRelativeTime(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();

  const minutes = Math.floor(diff / (1000 * 60));

  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  return `${days}d ago`;
}

export const formatTimeRemaining = (endTime: string) => {
  const diff = new Date(endTime).getTime() - Date.now();

  if (diff <= 0) {
    return "Auction Over";
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days > 0) {
    return `${days}d left`;
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours > 0) {
    return `${hours}h left`;
  }

  const minutes = Math.floor(diff / (1000 * 60));

  if (minutes > 0) {
    return `${minutes}m left`;
  }

  const seconds = Math.floor(diff / 1000);

  return `${seconds}s left`;
};
