import { wrapPick } from "../typectl"

const functions = import("./functions")
const fetchUser = wrapPick(functions, "fetchUser")
const fetchPosts = wrapPick(functions, "fetchPosts")
const formatProfile = wrapPick(functions, "formatProfile")

export default function getProfile(userId: string) {
  const user = fetchUser(userId)
  const posts = fetchPosts(userId)
  const profile = formatProfile(user, posts)
  return { user, posts, profile }
}
