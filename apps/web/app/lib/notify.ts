import { toast } from "sonner";

type ToastOptions = {
  title: string;
  description?: string;
};

export const notify = {
  success: ({ title, description }: ToastOptions) => {
    toast.success(title, {
      description,
      duration: 6000,
    });
  },

  error: ({ title, description }: ToastOptions) => {
    toast.error(title, {
      description,
      duration: 8000,
    });
  },

  warning: ({ title, description }: ToastOptions) => {
    toast.warning(title, {
      description,
    });
  },

  info: ({ title, description }: ToastOptions) => {
    toast.info(title, {
      description,
      duration: 6000,
    });
  },
};
