import { describe, expect, it } from "vitest";
import { isPublicAddress } from "./renderCustomDomains";

describe("Render domain TLS probe address filtering", () => {
  it("allows globally routable IPv4 addresses", () => {
    expect(isPublicAddress("8.8.8.8")).toBe(true);
    expect(isPublicAddress("216.24.57.1")).toBe(true);
  });

  it("rejects private, loopback, link-local, carrier-grade NAT, and reserved IPv4", () => {
    for (const address of [
      "0.0.0.1", "10.0.0.1", "100.64.0.1", "127.0.0.1",
      "169.254.1.1", "172.16.0.1", "192.0.2.1", "192.168.1.1",
      "198.18.0.1", "198.51.100.1", "203.0.113.1", "224.0.0.1",
    ]) {
      expect(isPublicAddress(address), address).toBe(false);
    }
  });

  it("allows global-unicast IPv6 and rejects local/documentation ranges", () => {
    expect(isPublicAddress("2606:4700:4700::1111")).toBe(true);
    expect(isPublicAddress("fc00::1")).toBe(false);
    expect(isPublicAddress("fe80::1")).toBe(false);
    expect(isPublicAddress("2001:db8::1")).toBe(false);
  });

  it("rejects malformed addresses", () => {
    expect(isPublicAddress("example.com")).toBe(false);
    expect(isPublicAddress("")).toBe(false);
  });
});
