import { describe, it, expect, beforeAll } from "vitest"
import {
    signRecoveryToken,
    verifyRecoveryToken,
    RECOVERY_COOKIE_MAX_AGE,
} from "@/lib/recovery"

const USER = "11111111-1111-4111-8111-111111111111"
const OTHER = "22222222-2222-4222-8222-222222222222"
const NOW = 1_700_000_000_000

beforeAll(() => {
    // The signing key is read from the environment at call time.
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-secret-key"
})

describe("recovery token", () => {
    it("verifies a freshly minted token for the same user", () => {
        const token = signRecoveryToken(USER, NOW)
        expect(verifyRecoveryToken(token, USER, NOW)).toBe(true)
    })

    it("verifies signature + expiry without a user binding (display gate)", () => {
        const token = signRecoveryToken(USER, NOW)
        expect(verifyRecoveryToken(token, undefined, NOW)).toBe(true)
    })

    it("rejects a token bound to a different user", () => {
        const token = signRecoveryToken(USER, NOW)
        expect(verifyRecoveryToken(token, OTHER, NOW)).toBe(false)
    })

    it("rejects an expired token", () => {
        const token = signRecoveryToken(USER, NOW)
        const afterExpiry = NOW + RECOVERY_COOKIE_MAX_AGE * 1000 + 1
        expect(verifyRecoveryToken(token, USER, afterExpiry)).toBe(false)
    })

    it("accepts right up to the expiry boundary", () => {
        const token = signRecoveryToken(USER, NOW)
        const atExpiry = NOW + RECOVERY_COOKIE_MAX_AGE * 1000
        expect(verifyRecoveryToken(token, USER, atExpiry)).toBe(true)
    })

    it("rejects a forged static value", () => {
        expect(verifyRecoveryToken("1", USER, NOW)).toBe(false)
        expect(verifyRecoveryToken("anything", USER, NOW)).toBe(false)
    })

    it("rejects a tampered signature", () => {
        const token = signRecoveryToken(USER, NOW)
        const [encoded] = token.split(".")
        expect(verifyRecoveryToken(`${encoded}.deadbeef`, USER, NOW)).toBe(false)
    })

    it("rejects a tampered payload (re-pointed to another user) under the original signature", () => {
        const token = signRecoveryToken(USER, NOW)
        const [, sig] = token.split(".")
        const forgedPayload = Buffer.from(`${OTHER}.${NOW + 10_000}`).toString("base64url")
        expect(verifyRecoveryToken(`${forgedPayload}.${sig}`, OTHER, NOW)).toBe(false)
    })

    it("rejects empty / malformed input", () => {
        expect(verifyRecoveryToken(undefined, USER, NOW)).toBe(false)
        expect(verifyRecoveryToken("", USER, NOW)).toBe(false)
        expect(verifyRecoveryToken("no-dot-here", USER, NOW)).toBe(false)
        expect(verifyRecoveryToken("a.b.c", USER, NOW)).toBe(false)
    })

    it("fails closed when no signing secret is configured", () => {
        const saved = process.env.SUPABASE_SERVICE_ROLE_KEY
        const savedAlt = process.env.SUPABASE_SERVICE_ROLE
        delete process.env.SUPABASE_SERVICE_ROLE_KEY
        delete process.env.SUPABASE_SERVICE_ROLE
        try {
            const token = signRecoveryToken(USER, NOW)
            expect(verifyRecoveryToken(token, USER, NOW)).toBe(false)
        } finally {
            if (saved !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = saved
            if (savedAlt !== undefined) process.env.SUPABASE_SERVICE_ROLE = savedAlt
        }
    })
})
