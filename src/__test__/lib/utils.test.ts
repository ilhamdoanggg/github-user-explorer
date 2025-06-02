import { cn } from "@/lib/utils"
import { describe, it, expect } from 'vitest'


describe("cn utility", () => {
  it("merges and deduplicates tailwind classes", () => {
    expect(cn("p-4", "p-2")).toBe("p-2")
  })

  it("works with arrays", () => {
    expect(cn(["text-sm", "text-lg"])).toBe("text-lg")
  })
})
