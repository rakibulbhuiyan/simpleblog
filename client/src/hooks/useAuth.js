import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../lib/api.js";

export const ME_KEY = ["me"];

export function useAuth() {
  const { data, isPending } = useQuery({
    queryKey: ME_KEY,
    queryFn: api.me,
    staleTime: 5 * 60 * 1000,
  });

  return { user: data ?? null, isLoading: isPending };
}

// Shared by login and register: store the user, then refresh everything that
// depends on who is signed in (likes, drafts, ...).
export function useAuthMutation(mutationFn) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (user) => {
      queryClient.setQueryData(ME_KEY, user);
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== "me" });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.logout,
    onSuccess: () => {
      queryClient.setQueryData(ME_KEY, null);
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "me" });
    },
  });
}
