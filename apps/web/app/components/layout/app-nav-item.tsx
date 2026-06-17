"use client";

import { Flex, Text } from "@chakra-ui/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  icon: React.ElementType;
  label: string;
  href: string;
  expanded: boolean;
};

export function NavItem({ icon: Icon, label, href, expanded }: Props) {
  const pathname = usePathname();

  const isActive = pathname === href;

  return (
    <Link href={href}>
      <Flex
        align="center"
        gap={3}
        px={4}
        py={3}
        cursor="pointer"
        borderRadius="md"
        bg={isActive ? "gray.700" : "transparent"}
        _hover={{
          bg: "gray.800",
        }}
      >
        <Icon size={20} />

        {expanded && (
          <Text whiteSpace="nowrap" overflow="hidden">
            {label}
          </Text>
        )}
      </Flex>
    </Link>
  );
}
