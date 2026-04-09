import { describe, it, expect } from "vitest"
import getProfile from "./controlFlow"

describe("example", () => {
  it("builds a profile without awaits in the control flow", async () => {
    const { user, posts, profile } = getProfile("user-1")

    expect(await user).toEqual({
      id: "user-1",
      name: "Alice",
      email: "alice@example.com",
    })

    expect(await posts).toEqual([
      { userId: "user-1", title: "First post", likes: 3 },
      { userId: "user-1", title: "Second post", likes: 7 },
    ])

    expect(await profile).toEqual({
      displayName: "Alice",
      email: "alice@example.com",
      postCount: 2,
      totalLikes: 10,
    })
  })
})
