const DEFAULT_BASE_URL = "https://api.domeneshop.no/v0";

// =============================================================================
// Errors
// =============================================================================

/** Error thrown when the Domeneshop API returns a non-2xx response. */
export class DomeneshopError extends Error {
  /** HTTP status code from the API response. */
  public readonly status: number;
  /** Parsed response body from the API, if available. */
  public readonly body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "DomeneshopError";
    this.status = status;
    this.body = body;
  }
}

// =============================================================================
// Types — Domains
// =============================================================================

export type DomainStatus =
  | "active"
  | "expired"
  | "deactivated"
  | "pendingDeleteRestorable";

export type WebhotelType =
  | "none"
  | "websmall"
  | "webmedium"
  | "weblarge"
  | "webxlarge";

export interface DomainServices {
  registrar: boolean;
  dns: boolean;
  email: boolean;
  webhotel: WebhotelType;
}

export interface Domain {
  id: number;
  domain: string;
  expiry_date: string;
  registered_date: string;
  renew: boolean;
  registrant: string;
  status: DomainStatus;
  nameservers: string[];
  services: DomainServices;
}

export interface ListDomainsParams {
  domain?: string;
}

// =============================================================================
// Types — DNS Records
// =============================================================================

export type DnsRecordType =
  | "A"
  | "AAAA"
  | "ANAME"
  | "CAA"
  | "CNAME"
  | "DS"
  | "MX"
  | "NS"
  | "SRV"
  | "TLSA"
  | "TXT";

interface DnsRecordBase {
  id: number;
  host: string;
  ttl: number;
  data: string;
}

export interface DnsRecordA extends DnsRecordBase {
  type: "A";
}

export interface DnsRecordAAAA extends DnsRecordBase {
  type: "AAAA";
}

export interface DnsRecordANAME extends DnsRecordBase {
  type: "ANAME";
}

export interface DnsRecordCNAME extends DnsRecordBase {
  type: "CNAME";
}

export interface DnsRecordNS extends DnsRecordBase {
  type: "NS";
}

export interface DnsRecordTXT extends DnsRecordBase {
  type: "TXT";
}

export interface DnsRecordMX extends DnsRecordBase {
  type: "MX";
  priority: number;
}

export interface DnsRecordSRV extends DnsRecordBase {
  type: "SRV";
  priority: number;
  weight: number;
  port: number;
}

export interface DnsRecordTLSA extends DnsRecordBase {
  type: "TLSA";
  usage: number;
  selector: number;
  dtype: number;
}

export interface DnsRecordDS extends DnsRecordBase {
  type: "DS";
  tag: number;
  alg: number;
  digest: string;
}

export interface DnsRecordCAA extends DnsRecordBase {
  type: "CAA";
  flags: number;
  tag: string;
}

export type DnsRecord =
  | DnsRecordA
  | DnsRecordAAAA
  | DnsRecordANAME
  | DnsRecordCAA
  | DnsRecordCNAME
  | DnsRecordDS
  | DnsRecordMX
  | DnsRecordNS
  | DnsRecordSRV
  | DnsRecordTLSA
  | DnsRecordTXT;

/** Input type for creating or updating a DNS record. The `id` field is omitted and `ttl` is optional (defaults to 3600). */
type DnsRecordInput<T extends DnsRecordBase> = Omit<T, "id" | "ttl"> & {
  ttl?: number;
};

export type DnsRecordData =
  | DnsRecordInput<DnsRecordA>
  | DnsRecordInput<DnsRecordAAAA>
  | DnsRecordInput<DnsRecordANAME>
  | DnsRecordInput<DnsRecordCAA>
  | DnsRecordInput<DnsRecordCNAME>
  | DnsRecordInput<DnsRecordDS>
  | DnsRecordInput<DnsRecordMX>
  | DnsRecordInput<DnsRecordNS>
  | DnsRecordInput<DnsRecordSRV>
  | DnsRecordInput<DnsRecordTLSA>
  | DnsRecordInput<DnsRecordTXT>;

export interface ListDnsRecordsParams {
  host?: string;
  type?: DnsRecordType;
}

export interface CreateDnsRecordResponse {
  id: number;
}

// =============================================================================
// Types — Dynamic DNS
// =============================================================================

export interface UpdateDynDnsParams {
  /** Fully qualified hostname to update. */
  hostname: string;
  /** IPv4 or IPv6 address. If omitted, the API uses the requester's IP. */
  myip?: string;
}

// =============================================================================
// Types — HTTP Forwards
// =============================================================================

export interface HttpForward {
  /** Subdomain for the forward, or `@` for the root domain. */
  host: string;
  /** Whether to use an iframe embed instead of a 301 redirect. */
  frame: boolean;
  /** Target URL (must include scheme, e.g. `https://example.com`). */
  url: string;
}

export type HttpForwardData = HttpForward;

// =============================================================================
// Types — Invoices
// =============================================================================

export type InvoiceStatus = "unpaid" | "paid" | "settled";
export type InvoiceType = "invoice" | "credit_note";
export type InvoiceCurrency = "NOK" | "SEK" | "DKK" | "GBP" | "USD";

export interface Invoice {
  id: number;
  type: InvoiceType;
  amount: number;
  currency: InvoiceCurrency;
  due_date?: string;
  issued_date: string;
  paid_date?: string;
  status: InvoiceStatus;
  url: string;
}

export interface ListInvoicesParams {
  status?: InvoiceStatus;
}

// =============================================================================
// Client
// =============================================================================

export interface DomeneshopClientOptions {
  /** API token generated at https://www.domeneshop.no/admin?view=api */
  token: string;
  /** API secret generated at https://www.domeneshop.no/admin?view=api */
  secret: string;
  /** Override the API base URL. Defaults to `https://api.domeneshop.no/v0`. */
  baseUrl?: string;
}

export class DomeneshopClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(options: DomeneshopClientOptions) {
    if (!options.token) throw new Error("token is required");
    if (!options.secret) throw new Error("secret is required");

    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.headers = {
      Authorization: "Basic " + btoa(`${options.token}:${options.secret}`),
    };
  }

  private async request<T>(
    method: string,
    path: string,
    options?: {
      params?: Record<string, string | undefined>;
      body?: unknown;
    },
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);

    if (options?.params) {
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined) {
          url.searchParams.set(key, value);
        }
      }
    }

    const headers: Record<string, string> = { ...this.headers };
    if (options?.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      ...(options?.body !== undefined
        ? { body: JSON.stringify(options.body) }
        : {}),
    });

    if (!response.ok) {
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        try {
          body = await response.text();
        } catch {
          // ignore
        }
      }
      throw new DomeneshopError(
        `Domeneshop API error: ${response.status} ${response.statusText}`,
        response.status,
        body,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    if (!text) {
      return undefined as T;
    }

    return JSON.parse(text) as T;
  }

  // ---------------------------------------------------------------------------
  // Domains
  // ---------------------------------------------------------------------------

  /** List all domains on your account. */
  async listDomains(params?: ListDomainsParams): Promise<Domain[]> {
    return this.request<Domain[]>("GET", "/domains", {
      params: { domain: params?.domain },
    });
  }

  /** Get a single domain by its ID. */
  async getDomain(domainId: number): Promise<Domain> {
    return this.request<Domain>("GET", `/domains/${domainId}`);
  }

  // ---------------------------------------------------------------------------
  // DNS Records
  // ---------------------------------------------------------------------------

  /** List DNS records for a domain, optionally filtered by host and/or record type. */
  async listDnsRecords(
    domainId: number,
    params?: ListDnsRecordsParams,
  ): Promise<DnsRecord[]> {
    return this.request<DnsRecord[]>("GET", `/domains/${domainId}/dns`, {
      params: { host: params?.host, type: params?.type },
    });
  }

  /** Create a new DNS record. Returns the ID of the created record. */
  async createDnsRecord(
    domainId: number,
    record: DnsRecordData,
  ): Promise<CreateDnsRecordResponse> {
    return this.request<CreateDnsRecordResponse>(
      "POST",
      `/domains/${domainId}/dns`,
      { body: record },
    );
  }

  /** Get a single DNS record by its ID. */
  async getDnsRecord(
    domainId: number,
    recordId: number,
  ): Promise<DnsRecord> {
    return this.request<DnsRecord>(
      "GET",
      `/domains/${domainId}/dns/${recordId}`,
    );
  }

  /** Update an existing DNS record. */
  async updateDnsRecord(
    domainId: number,
    recordId: number,
    record: DnsRecordData,
  ): Promise<void> {
    return this.request<void>(
      "PUT",
      `/domains/${domainId}/dns/${recordId}`,
      { body: record },
    );
  }

  /** Delete a DNS record. */
  async deleteDnsRecord(
    domainId: number,
    recordId: number,
  ): Promise<void> {
    return this.request<void>(
      "DELETE",
      `/domains/${domainId}/dns/${recordId}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Dynamic DNS
  // ---------------------------------------------------------------------------

  /** Update a Dynamic DNS record. Creates the record if it does not exist. The record type (A or AAAA) is detected automatically. */
  async updateDynDns(params: UpdateDynDnsParams): Promise<void> {
    return this.request<void>("GET", "/dyndns/update", {
      params: { hostname: params.hostname, myip: params.myip },
    });
  }

  // ---------------------------------------------------------------------------
  // HTTP Forwards
  // ---------------------------------------------------------------------------

  /** List all HTTP forwards for a domain. */
  async listForwards(domainId: number): Promise<HttpForward[]> {
    return this.request<HttpForward[]>(
      "GET",
      `/domains/${domainId}/forwards/`,
    );
  }

  /** Create a new HTTP forward for a domain. */
  async createForward(
    domainId: number,
    forward: HttpForwardData,
  ): Promise<void> {
    return this.request<void>(
      "POST",
      `/domains/${domainId}/forwards/`,
      { body: forward },
    );
  }

  /** Get a specific HTTP forward by its host. */
  async getForward(domainId: number, host: string): Promise<HttpForward> {
    return this.request<HttpForward>(
      "GET",
      `/domains/${domainId}/forwards/${encodeURIComponent(host)}`,
    );
  }

  /** Update an existing HTTP forward. Note: the host field cannot be changed — delete and recreate instead. */
  async updateForward(
    domainId: number,
    host: string,
    forward: HttpForwardData,
  ): Promise<HttpForward> {
    return this.request<HttpForward>(
      "PUT",
      `/domains/${domainId}/forwards/${encodeURIComponent(host)}`,
      { body: forward },
    );
  }

  /** Delete an HTTP forward. */
  async deleteForward(domainId: number, host: string): Promise<void> {
    return this.request<void>(
      "DELETE",
      `/domains/${domainId}/forwards/${encodeURIComponent(host)}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Invoices
  // ---------------------------------------------------------------------------

  /** List invoices for your account (past 3 years), optionally filtered by status. */
  async listInvoices(params?: ListInvoicesParams): Promise<Invoice[]> {
    return this.request<Invoice[]>("GET", "/invoices", {
      params: { status: params?.status },
    });
  }

  /** Get a single invoice by its ID. */
  async getInvoice(invoiceId: number): Promise<Invoice> {
    return this.request<Invoice>("GET", `/invoices/${invoiceId}`);
  }
}
