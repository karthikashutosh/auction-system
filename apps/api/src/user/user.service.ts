import { findById } from "./user.repository";

export async function getMe(userId: string) {
  const user = await findById(userId);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}
