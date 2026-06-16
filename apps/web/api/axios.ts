import axios from "axios";

export const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const uploadFileToS3 = async (
  uploadUrl: string,
  file: File
): Promise<void> => {
  const response = await axios.put(uploadUrl, file, {
    headers: {
      "Content-Type": file.type,
    },
  });

  if (response.status !== 200) {
    throw new Error("Failed to upload file");
  }
};
