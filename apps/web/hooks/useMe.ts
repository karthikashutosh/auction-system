import { useQuery } from "@tanstack/react-query";
import { getUserProfile } from "../api/auth.api";
import { useAuthStore } from "../store/auth.store";

export const useMe = () => {
    
    const setUser = useAuthStore(
        (state) => state.setUser
      );
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
    const user = await getUserProfile();
  
        setUser(user);
  
        return user;
      },
    retry: false,
  });
};