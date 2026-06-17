import {
  LayoutDashboard,
  Gavel,
  BadgeDollarSign,
  Store,
  User,
} from "lucide-react";

export const appNavItems = [
  {
    label: "Marketplace",
    href: "/marketplace",
    icon: Store,
  },
  //   {
  //     label: "Dashboard",
  //     href: "/dashboard",
  //     icon: LayoutDashboard,
  //   },
  {
    label: "My Auctions",
    href: "/my-auctions",
    icon: Gavel,
  },
  {
    label: "My Bids",
    href: "/bids",
    icon: BadgeDollarSign,
  },
  {
    label: "Profile",
    href: "/profile",
    icon: User,
  },
];
