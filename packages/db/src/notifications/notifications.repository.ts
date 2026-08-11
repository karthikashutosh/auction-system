import { NotificationControlType } from "@repo/types";
import { db } from "../db";

export const notificationReadRespository = async (
  data: NotificationControlType
) => {
  const { notificationId, userId } = data;
  const query = `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id =$2 RETURNING *`;

  const result = await db.query(query, [notificationId, userId]);

  return result.rows[0];
};

export const notificationAllReadRespository = async (userId: string) => {
  const query = `
          UPDATE notifications
          SET is_read = true
          WHERE user_id = $1
          RETURNING *;
        `;
  const result = await db.query(query, [userId]);

  return result.rows;
};
