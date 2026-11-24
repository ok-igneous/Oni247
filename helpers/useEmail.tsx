import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getEmailOverview } from "../endpoints/email/overview_GET.schema";
import { postSendEmail } from "../endpoints/email/send_POST.schema";
import { getEmailSettings } from "../endpoints/email/settings_GET.schema";
import { postEmailSettings } from "../endpoints/email/settings_POST.schema";
import { postTestEmail } from "../endpoints/email/test_POST.schema";
import { getEmailWorkspace } from "../endpoints/email/workspace_GET.schema";
import { postEmailWorkspace } from "../endpoints/email/workspace_POST.schema";

const KEY = ["email-overview"] as const;
const SETTINGS_KEY = ["email-settings"] as const;

export const useEmailOverview = () => useQuery({ queryKey: KEY, queryFn: () => getEmailOverview(), retry: false });

export const useEmailSettings = () => useQuery({ queryKey: SETTINGS_KEY, queryFn: () => getEmailSettings(), retry: false });

const WORKSPACE_KEY = ["email-workspace"] as const;
export const useEmailWorkspace = () => useQuery({ queryKey: WORKSPACE_KEY, queryFn: () => getEmailWorkspace(), retry: false });
export const useEmailWorkspaceAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postEmailWorkspace,
    onSettled: () => void queryClient.invalidateQueries({ queryKey: WORKSPACE_KEY }),
  });
};

export const useSaveEmailSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postEmailSettings,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
      void queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
};

export const useTestEmail = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => postTestEmail(),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
      void queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
};

export const useSendEmail = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postSendEmail,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
      void queryClient.invalidateQueries({ queryKey: ["email-workspace"] });
    },
  });
};
