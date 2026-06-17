"use client";

import { Box, Flex } from "@chakra-ui/react";
import { useState } from "react";
import { NavItem } from "./app-nav-item";
import { appNavItems } from "./app-nav-config";

export function AppSidebar() {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box
      bg="gray.900"
      color="white"
      w={expanded ? "240px" : "72px"}
      transition="all 0.2s"
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
