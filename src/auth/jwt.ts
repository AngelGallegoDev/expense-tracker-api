import jwt from "jsonwebtoken"

const secret = process.env.JWT_SECRET
if (!secret) throw new Error("JWT_SECRET missing")

export function signAccessToken(userId: number) {
  return jwt.sign({}, secret, { subject: String(userId), expiresIn: "1h" })
}

export function verifyAccessToken(token: string) {
  const payload = jwt.verify(token, secret)
  if (typeof payload === "string") throw new Error("Invalid token payload")
  const userId = Number(payload.sub)
  if (!Number.isInteger(userId) || userId <= 0) throw new Error("Invalid token subject")
  return { userId }
}
