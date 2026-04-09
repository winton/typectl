export async function fetchUser(id: string) {
  return { id, name: "Alice", email: "alice@example.com" }
}

export async function fetchPosts(userId: string) {
  return [
    { title: "First post", likes: 3 },
    { title: "Second post", likes: 7 },
  ]
}

export function formatProfile(
  user: { id: string; name: string; email: string },
  posts: { title: string; likes: number }[]
) {
  return {
    displayName: user.name,
    email: user.email,
    postCount: posts.length,
    totalLikes: posts.reduce((sum, p) => sum + p.likes, 0),
  }
}
