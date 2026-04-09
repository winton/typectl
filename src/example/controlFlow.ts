import { wrap } from "../typectl"
import { fetchUser, fetchPosts, formatProfile } from "./functions"

const fetchUserW = wrap(fetchUser)
const fetchPostsW = wrap(fetchPosts)
const formatProfileW = wrap(formatProfile)

export default function getProfile(userId: string) {
  const user = fetchUserW(userId)
  const posts = fetchPostsW(userId)
  const profile = formatProfileW(user, posts)
  return { user, posts, profile }
}
