"use client";

import { Box, Flex } from "@chakra-ui/react";
import { useState } from "react";

import { NavItem } from "./app-nav-item";
import { appNavItems } from "./app-nav-config";

export function AppSidebar() {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box
      bg="sidebar.bg"
      color="sidebar.text"
      borderRightWidth="1px"
      borderColor="sidebar.border"
      shadow="sm"
      w={expanded ? "240px" : "50px"}
      transition="width 0.2s ease"
      overflow="hidden"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <Flex direction="column" py={4} gap={2}>
        {appNavItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            expanded={expanded}
          />
        ))}
      </Flex>
    </Box>
  );
}
