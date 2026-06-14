import { db } from "../db"

export const findExistingUser = async (email:string)  => {
    const results = await db.query(`SELECT * FROM users WHERE email =$1 LIMIT 1`,[email])
    return results.rows[0]
}


export const createUser = async (name:string,email:string,password:string) => {
    const results = await db.query(`INSERT INTO users (name,email,password_hash) VALUES ($1,$2,$3) RETURNING *`,[name,email,password])
    return results.rows[0]
}