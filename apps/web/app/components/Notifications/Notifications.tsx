import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Popover,
  Portal,
  Separator,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Bell, BellOff, CircleAlert, Gavel, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";

import { useGetAllNotifications } from "../../../hooks/useGetAllNotifications";
import { NotificationResponse } from "@repo/types";
import { useMarkNotificationRead } from "../../../hooks/useMarkNotificationRead";
import { useMarkAllNotificationsRead } from "../../../hooks/useMarkAllNotificationsRead";

const MotionBox = motion(Box);

const formatRelativeTime = (date: string) => {
  const now = Date.now();
  const created = new Date(date).getTime();

  const diff = Math.floor((now - created) / 1000);

  if (diff < 60) return "Just now";

  if (diff < 3600) {
    const minutes = Math.floor(diff / 60);
    return `${minutes} min${minutes > 1 ? "s" : ""} ago`;
  }

  if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  }

  const days = Math.floor(diff / 86400);

  if (days === 1) {
    return "Yesterday";
  }

  return `${days} days ago`;
};

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "AUCTION_WON":
      return Trophy;

    case "OUTBID":
      return CircleAlert;

    case "BID_PLACED":
      return Gavel;

    default:
      return Bell;
  }
};

export const Notification = () => {
  const {
    data: notifications = [],
    isLoading,
    isError,
  } = useGetAllNotifications();

  const router = useRouter();

  const { mutateAsync: markesAsReadSingleNotification } =
    useMarkNotificationRead();

  const { mutate } = useMarkAllNotificationsRead();

  const unreadCount = useMemo(() => {
    return notifications.filter((notification) => !notification.is_read).length;
  }, [notifications]);

  const handleMarkAllRead = () => {
    mutate();
  };

  const handleNotificationClick = async (
    notification: NotificationResponse
  ) => {
    try {
      const markedNotification = await markesAsReadSingleNotification(
        notification.id
      );

      router.push(`auctions/${markedNotification.entity_id}`);
    } catch (error) {}
  };

  return (
    <Popover.Root
      positioning={{
        placement: "bottom-end",
      }}
      lazyMount
      unmountOnExit
    >
      <Popover.Trigger asChild>
        <Box position="relative" display="inline-flex">
          <motion.div
            whileHover={{
              scale: 1.05,
            }}
            whileTap={{
              scale: 0.92,
            }}
          >
            <IconButton
              aria-label="Notifications"
              variant="ghost"
              rounded="full"
            >
              <Bell size={20} />
            </IconButton>
          </motion.div>

          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{
                  scale: 0,
                  opacity: 0,
                }}
                animate={{
                  scale: 1,
                  opacity: 1,
                }}
                exit={{
                  scale: 0,
                  opacity: 0,
                }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 25,
                }}
                style={{
                  position: "absolute",
                  top: 2,
                  right: 2,
                }}
              >
                <Badge
                  rounded="full"
                  colorPalette="red"
                  minW="18px"
                  h="18px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  fontSize="2xs"
                  fontWeight="bold"
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      </Popover.Trigger>

      <Portal>
        <Popover.Positioner>
          <Popover.Content
            w="400px"
            maxH="550px"
            overflow="hidden"
            borderRadius="xl"
            shadow="2xl"
            borderWidth="1px"
            bg="white"
          >
            <Popover.Arrow />

            <Popover.Header py={4}>
              <Flex justify="space-between" align="center">
                {unreadCount > 0 ? (
                  <Box>
                    <Text fontWeight="bold" fontSize="lg">
                      Notifications
                    </Text>

                    <Text fontSize="xs" color="fg.muted">
                      {unreadCount} unread
                    </Text>
                  </Box>
                ) : null}

                {unreadCount > 0 && (
                  <Button
                    size="xs"
                    variant="ghost"
                    colorPalette="blue"
                    onClick={handleMarkAllRead}
                  >
                    Mark all as Read
                  </Button>
                )}
              </Flex>
            </Popover.Header>

            <Separator />
            <Popover.Body p={0}>
              {isLoading ? (
                <Flex py={16} justify="center" align="center">
                  <Spinner size="lg" />
                </Flex>
              ) : isError ? (
                <Flex py={16} justify="center" align="center">
                  <Text color="red.500">Failed to load notifications.</Text>
                </Flex>
              ) : notifications.length === 0 ? (
                <Flex
                  py={16}
                  px={6}
                  direction="column"
                  justify="center"
                  align="center"
                  gap={4}
                >
                  <BellOff size={32} opacity={0.6} />

                  <VStack gap={1}>
                    <Text fontWeight="semibold">You're all caught up</Text>

                    <Text fontSize="sm" color="fg.muted" textAlign="center">
                      New notifications will appear here.
                    </Text>
                  </VStack>
                </Flex>
              ) : (
                <VStack gap={0} align="stretch" maxH="420px" overflowY="auto">
                  <AnimatePresence initial={false}>
                    {notifications.map((notification) => {
                      const Icon = getNotificationIcon(notification.type);

                      return (
                        <MotionBox
                          key={notification.id}
                          layout
                          initial={{
                            opacity: 0,
                            y: -12,
                          }}
                          animate={{
                            opacity: 1,
                            y: 0,
                          }}
                          exit={{
                            opacity: 0,
                            y: -12,
                          }}
                          whileHover={{
                            backgroundColor: "var(--chakra-colors-bg-muted)",
                          }}
                          transition={{
                            duration: 0.2,
                          }}
                          cursor="pointer"
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <HStack
                            align="start"
                            gap={4}
                            px={4}
                            py={4}
                            borderBottomWidth="1px"
                            _hover={{
                              bg: "gray.100",
                            }}
                            bg={
                              notification.is_read
                                ? "transparent"
                                : "blue.subtle"
                            }
                          >
                            <Flex
                              w="42px"
                              h="42px"
                              rounded="full"
                              bg="bg.emphasized"
                              justify="center"
                              align="center"
                              flexShrink={0}
                            >
                              <Icon size={18} />
                            </Flex>

                            <Box flex={1}>
                              <Flex
                                justify="space-between"
                                align="start"
                                gap={3}
                              >
                                <Text
                                  fontWeight={
                                    notification.is_read ? "medium" : "bold"
                                  }
                                >
                                  {notification.title}
                                </Text>

                                {!notification.is_read && (
                                  <Box
                                    mt="6px"
                                    w="8px"
                                    h="8px"
                                    rounded="full"
                                    bg="blue.500"
                                    flexShrink={0}
                                  />
                                )}
                              </Flex>

                              <Text mt={1} fontSize="sm" color="fg.muted">
                                {notification.message}
                              </Text>

                              <Text mt={2} fontSize="xs" color="fg.muted">
                                {formatRelativeTime(notification.created_at)}
                              </Text>
                            </Box>
                          </HStack>
                        </MotionBox>
                      );
                    })}
                  </AnimatePresence>
                </VStack>
              )}
            </Popover.Body>

            <Separator />

            {/* <Popover.Footer p={2}>
              <Button variant="ghost" width="full" size="sm">
                View all notifications
              </Button>
            </Popover.Footer> */}
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
};
