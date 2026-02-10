import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  DomeneshopClient,
  DomeneshopError,
  type Domain,
  type DnsRecord,
  type HttpForward,
  type Invoice,
} from "../src/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : status === 201 ? "Created" : "Error",
    headers: new Headers({ "content-type": "application/json" }),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as unknown as Response;
}

function emptyResponse(status = 204): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "No Content",
    headers: new Headers(),
    json: () => Promise.reject(new Error("No body")),
    text: () => Promise.resolve(""),
  } as unknown as Response;
}

function errorResponse(status: number, body?: unknown): Response {
  return {
    ok: false,
    status,
    statusText: "Error",
    headers: new Headers(),
    json: () =>
      body !== undefined
        ? Promise.resolve(body)
        : Promise.reject(new Error("No body")),
    text: () =>
      body !== undefined
        ? Promise.resolve(JSON.stringify(body))
        : Promise.resolve(""),
  } as unknown as Response;
}

function client(baseUrl?: string): DomeneshopClient {
  return new DomeneshopClient({
    token: "test-token",
    secret: "test-secret",
    baseUrl,
  });
}

function lastFetchUrl(): string {
  return mockFetch.mock.calls[0][0];
}

function lastFetchOptions(): RequestInit {
  return mockFetch.mock.calls[0][1];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockFetch.mockReset();
});

// ---------------------------------------------------------------------------
// Constructor
// ---------------------------------------------------------------------------

describe("constructor", () => {
  it("throws if token is missing", () => {
    expect(
      () => new DomeneshopClient({ token: "", secret: "s" }),
    ).toThrow("token is required");
  });

  it("throws if secret is missing", () => {
    expect(
      () => new DomeneshopClient({ token: "t", secret: "" }),
    ).toThrow("secret is required");
  });

  it("creates a client with valid credentials", () => {
    expect(() => client()).not.toThrow();
  });

  it("uses the default base URL", () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    client().listDomains();
    expect(lastFetchUrl()).toMatch(
      /^https:\/\/api\.domeneshop\.no\/v0\//,
    );
  });

  it("allows overriding the base URL", () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    client("https://custom.api/v0").listDomains();
    expect(lastFetchUrl()).toMatch(/^https:\/\/custom\.api\/v0\//);
  });

  it("sends Basic auth header", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await client().listDomains();
    const headers = lastFetchOptions().headers as Record<string, string>;
    const expected = "Basic " + btoa("test-token:test-secret");
    expect(headers.Authorization).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe("error handling", () => {
  it("throws DomeneshopError on non-2xx response", async () => {
    mockFetch.mockResolvedValueOnce(
      errorResponse(404, { error: "Not found" }),
    );
    await expect(client().getDomain(999)).rejects.toThrow(DomeneshopError);
  });

  it("includes status code in the error", async () => {
    mockFetch.mockResolvedValueOnce(
      errorResponse(403, { error: "Forbidden" }),
    );
    try {
      await client().getDomain(1);
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(DomeneshopError);
      expect((e as DomeneshopError).status).toBe(403);
    }
  });

  it("includes the response body in the error", async () => {
    mockFetch.mockResolvedValueOnce(
      errorResponse(400, { error: "Bad request" }),
    );
    try {
      await client().getDomain(1);
      expect.unreachable("should have thrown");
    } catch (e) {
      expect((e as DomeneshopError).body).toEqual({ error: "Bad request" });
    }
  });

  it("handles non-JSON error responses", async () => {
    const res = {
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      headers: new Headers(),
      json: () => Promise.reject(new Error("not json")),
      text: () => Promise.resolve("plain text error"),
    } as unknown as Response;
    mockFetch.mockResolvedValueOnce(res);

    try {
      await client().getDomain(1);
      expect.unreachable("should have thrown");
    } catch (e) {
      expect((e as DomeneshopError).status).toBe(500);
      expect((e as DomeneshopError).body).toBe("plain text error");
    }
  });
});

// ---------------------------------------------------------------------------
// Domains
// ---------------------------------------------------------------------------

describe("domains", () => {
  const sampleDomain: Domain = {
    id: 1,
    domain: "example.no",
    expiry_date: "2026-01-01",
    registered_date: "2020-01-01",
    renew: true,
    registrant: "John Doe",
    status: "active",
    nameservers: ["ns1.hyp.net", "ns2.hyp.net"],
    services: { registrar: true, dns: true, email: false, webhotel: "none" },
  };

  it("listDomains", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([sampleDomain]));
    const result = await client().listDomains();
    expect(result).toEqual([sampleDomain]);
    expect(lastFetchOptions().method).toBe("GET");
  });

  it("listDomains with domain filter", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([sampleDomain]));
    await client().listDomains({ domain: "example.no" });
    expect(lastFetchUrl()).toContain("domain=example.no");
  });

  it("getDomain", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(sampleDomain));
    const result = await client().getDomain(1);
    expect(result).toEqual(sampleDomain);
    expect(lastFetchUrl()).toContain("/domains/1");
  });
});

// ---------------------------------------------------------------------------
// DNS Records
// ---------------------------------------------------------------------------

describe("dns records", () => {
  const aRecord: DnsRecord = {
    id: 10,
    host: "www",
    ttl: 3600,
    type: "A",
    data: "1.2.3.4",
  };

  const mxRecord: DnsRecord = {
    id: 11,
    host: "@",
    ttl: 3600,
    type: "MX",
    data: "mail.example.no",
    priority: 10,
  };

  it("listDnsRecords", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([aRecord, mxRecord]));
    const result = await client().listDnsRecords(1);
    expect(result).toHaveLength(2);
    expect(lastFetchUrl()).toContain("/domains/1/dns");
  });

  it("listDnsRecords with host filter", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([aRecord]));
    await client().listDnsRecords(1, { host: "www" });
    expect(lastFetchUrl()).toContain("host=www");
  });

  it("listDnsRecords with type filter", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([mxRecord]));
    await client().listDnsRecords(1, { type: "MX" });
    expect(lastFetchUrl()).toContain("type=MX");
  });

  it("createDnsRecord", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 12 }, 201));
    const result = await client().createDnsRecord(1, {
      host: "test",
      type: "A",
      data: "5.6.7.8",
    });
    expect(result).toEqual({ id: 12 });
    expect(lastFetchOptions().method).toBe("POST");
    expect(JSON.parse(lastFetchOptions().body as string)).toEqual({
      host: "test",
      type: "A",
      data: "5.6.7.8",
    });
  });

  it("createDnsRecord with optional ttl", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 13 }, 201));
    await client().createDnsRecord(1, {
      host: "test",
      type: "A",
      data: "5.6.7.8",
      ttl: 600,
    });
    expect(JSON.parse(lastFetchOptions().body as string).ttl).toBe(600);
  });

  it("getDnsRecord", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(aRecord));
    const result = await client().getDnsRecord(1, 10);
    expect(result).toEqual(aRecord);
    expect(lastFetchUrl()).toContain("/domains/1/dns/10");
  });

  it("updateDnsRecord", async () => {
    mockFetch.mockResolvedValueOnce(emptyResponse());
    await client().updateDnsRecord(1, 10, {
      host: "www",
      type: "A",
      data: "9.8.7.6",
      ttl: 3600,
    });
    expect(lastFetchOptions().method).toBe("PUT");
    expect(lastFetchUrl()).toContain("/domains/1/dns/10");
  });

  it("deleteDnsRecord", async () => {
    mockFetch.mockResolvedValueOnce(emptyResponse());
    await client().deleteDnsRecord(1, 10);
    expect(lastFetchOptions().method).toBe("DELETE");
    expect(lastFetchUrl()).toContain("/domains/1/dns/10");
  });
});

// ---------------------------------------------------------------------------
// Dynamic DNS
// ---------------------------------------------------------------------------

describe("dyndns", () => {
  it("updateDynDns with hostname only", async () => {
    mockFetch.mockResolvedValueOnce(emptyResponse());
    await client().updateDynDns({ hostname: "dyn.example.no" });
    expect(lastFetchUrl()).toContain("hostname=dyn.example.no");
    expect(lastFetchOptions().method).toBe("GET");
  });

  it("updateDynDns with hostname and IP", async () => {
    mockFetch.mockResolvedValueOnce(emptyResponse());
    await client().updateDynDns({
      hostname: "dyn.example.no",
      myip: "1.2.3.4",
    });
    expect(lastFetchUrl()).toContain("hostname=dyn.example.no");
    expect(lastFetchUrl()).toContain("myip=1.2.3.4");
  });
});

// ---------------------------------------------------------------------------
// HTTP Forwards
// ---------------------------------------------------------------------------

describe("forwards", () => {
  const forward: HttpForward = {
    host: "www",
    frame: false,
    url: "https://example.com",
  };

  it("listForwards", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([forward]));
    const result = await client().listForwards(1);
    expect(result).toEqual([forward]);
    expect(lastFetchUrl()).toContain("/domains/1/forwards/");
  });

  it("createForward", async () => {
    mockFetch.mockResolvedValueOnce(emptyResponse(201));
    await client().createForward(1, forward);
    expect(lastFetchOptions().method).toBe("POST");
    expect(JSON.parse(lastFetchOptions().body as string)).toEqual(forward);
  });

  it("getForward", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(forward));
    const result = await client().getForward(1, "www");
    expect(result).toEqual(forward);
    expect(lastFetchUrl()).toContain("/domains/1/forwards/www");
  });

  it("getForward encodes host", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(forward));
    await client().getForward(1, "@");
    expect(lastFetchUrl()).toContain("/forwards/%40");
  });

  it("updateForward", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(forward));
    const result = await client().updateForward(1, "www", forward);
    expect(result).toEqual(forward);
    expect(lastFetchOptions().method).toBe("PUT");
  });

  it("deleteForward", async () => {
    mockFetch.mockResolvedValueOnce(emptyResponse());
    await client().deleteForward(1, "www");
    expect(lastFetchOptions().method).toBe("DELETE");
    expect(lastFetchUrl()).toContain("/domains/1/forwards/www");
  });
});

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

describe("invoices", () => {
  const invoice: Invoice = {
    id: 1001,
    type: "invoice",
    amount: 11900,
    currency: "NOK",
    due_date: "2026-03-01",
    issued_date: "2026-02-01",
    status: "unpaid",
    url: "https://www.domeneshop.no/invoice?nr=1001",
  };

  it("listInvoices", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([invoice]));
    const result = await client().listInvoices();
    expect(result).toEqual([invoice]);
    expect(lastFetchOptions().method).toBe("GET");
  });

  it("listInvoices with status filter", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([invoice]));
    await client().listInvoices({ status: "unpaid" });
    expect(lastFetchUrl()).toContain("status=unpaid");
  });

  it("getInvoice", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(invoice));
    const result = await client().getInvoice(1001);
    expect(result).toEqual(invoice);
    expect(lastFetchUrl()).toContain("/invoices/1001");
  });
});

// ---------------------------------------------------------------------------
// Request mechanics
// ---------------------------------------------------------------------------

describe("request mechanics", () => {
  it("does not set Content-Type for GET requests", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await client().listDomains();
    const headers = lastFetchOptions().headers as Record<string, string>;
    expect(headers["Content-Type"]).toBeUndefined();
  });

  it("sets Content-Type for requests with body", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1 }, 201));
    await client().createDnsRecord(1, {
      host: "test",
      type: "A",
      data: "1.2.3.4",
    });
    const headers = lastFetchOptions().headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("handles 204 No Content responses", async () => {
    mockFetch.mockResolvedValueOnce(emptyResponse(204));
    const result = await client().deleteDnsRecord(1, 10);
    expect(result).toBeUndefined();
  });
});
