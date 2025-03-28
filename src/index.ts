import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

const BASE_URL = "https://api.domeneshop.no/v0";

interface DomeneshopClientOptions {
  token: string;
  secret: string;
}

export interface DomainServices {
  // Schema just says 'object', define specific properties if known
}

export type DomainStatus =
  | "active"
  | "expired"
  | "deactivated"
  | "pendingDeleteRestorable";

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

export type DnsRecordType = "A" | "AAAA" | "CNAME" | "MX" | "SRV" | "TXT";

export interface DnsRecordBase {
  id: number;
  host: string;
  ttl: number;
}

export interface DnsRecordA extends DnsRecordBase {
  type: "A";
  data: string;
}

export interface DnsRecordAAAA extends DnsRecordBase {
  type: "AAAA";
  data: string;
}

export interface DnsRecordCNAME extends DnsRecordBase {
  type: "CNAME";
  data: string;
}

export interface DnsRecordMX extends DnsRecordBase {
  type: "MX";
  data: string;
  priority: number;
}

export interface DnsRecordSRV extends DnsRecordBase {
  type: "SRV";
  data: string;
  priority: number;
  weight: number;
  port: number;
}

export interface DnsRecordTXT extends DnsRecordBase {
  type: "TXT";
  data: string;
}

export type DnsRecord =
  | DnsRecordA
  | DnsRecordAAAA
  | DnsRecordCNAME
  | DnsRecordMX
  | DnsRecordSRV
  | DnsRecordTXT;

type OmitId<T extends DnsRecordBase> = Omit<T, "id">;

export type DnsRecordData =
  | OmitId<DnsRecordA>
  | OmitId<DnsRecordAAAA>
  | OmitId<DnsRecordCNAME>
  | OmitId<DnsRecordMX>
  | OmitId<DnsRecordSRV>
  | OmitId<DnsRecordTXT>;

export interface ListDnsRecordsParams {
  host?: string;
  type?: DnsRecordType;
}

export interface AddDnsRecordResponse {
  id: number;
}

export interface UpdateDynDnsParams {
  hostname: string;
  myip?: string;
}

export interface HttpForward {
  host: string;
  frame: boolean;
  url: string;
}

export type HttpForwardData = HttpForward;

export type InvoiceStatus = "unpaid" | "paid" | "settled";
export type InvoiceType = "invoice" | "credit_node";
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

export class DomeneshopClient {
  private client: AxiosInstance;

  constructor(options: DomeneshopClientOptions) {
    this.client = axios.create({
      baseURL: BASE_URL,
      auth: {
        username: options.token,
        password: options.secret,
      },
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.client.request<T>(config);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        console.error(
          `API Error: ${error.response.status} - ${JSON.stringify(
            error.response.data
          )}`
        );
        throw new Error(`Domeneshop API Error: ${error.response.status}`);
      } else {
        console.error(`Request Error: ${error}`);
        throw new Error("An unexpected error occurred");
      }
    }
  }

  async listDomains(params?: ListDomainsParams): Promise<Domain[]> {
    return this.request<Domain[]>({
      method: "GET",
      url: "/domains",
      params: params,
    });
  }

  async getDomainById(domainId: number): Promise<Domain> {
    if (!domainId) {
      throw new Error("domainId is required");
    }
    return this.request<Domain>({
      method: "GET",
      url: `/domains/${domainId}`,
    });
  }

  async listDnsRecords(
    domainId: number,
    params?: ListDnsRecordsParams
  ): Promise<DnsRecord[]> {
    if (!domainId) {
      throw new Error("domainId is required");
    }
    return this.request<DnsRecord[]>({
      method: "GET",
      url: `/domains/${domainId}/dns`,
      params: params,
    });
  }

  async addDnsRecord(
    domainId: number,
    recordData: DnsRecordData
  ): Promise<AddDnsRecordResponse> {
    if (!domainId) {
      throw new Error("domainId is required");
    }
    return this.request<AddDnsRecordResponse>({
      method: "POST",
      url: `/domains/${domainId}/dns`,
      data: recordData,
    });
  }

  async getDnsRecordById(
    domainId: number,
    recordId: number
  ): Promise<DnsRecord> {
    if (!domainId || !recordId) {
      throw new Error("domainId and recordId are required");
    }
    return this.request<DnsRecord>({
      method: "GET",
      url: `/domains/${domainId}/dns/${recordId}`,
    });
  }

  async updateDnsRecordById(
    domainId: number,
    recordId: number,
    recordData: DnsRecordData
  ): Promise<void> {
    if (!domainId || !recordId) {
      throw new Error("domainId and recordId are required");
    }
    await this.request<void>({
      method: "PUT",
      url: `/domains/${domainId}/dns/${recordId}`,
      data: recordData,
    });
  }

  async deleteDnsRecordById(domainId: number, recordId: number): Promise<void> {
    if (!domainId || !recordId) {
      throw new Error("domainId and recordId are required");
    }
    await this.request<void>({
      method: "DELETE",
      url: `/domains/${domainId}/dns/${recordId}`,
    });
  }

  async updateDynDns(params: UpdateDynDnsParams): Promise<void> {
    if (!params || !params.hostname) {
      throw new Error("hostname is required for DynDNS update");
    }
    await this.request<void>({
      method: "GET",
      url: "/dyndns/update",
      params: params,
    });
  }

  async listHttpForwards(domainId: number): Promise<HttpForward[]> {
    if (!domainId) {
      throw new Error("domainId is required");
    }
    return this.request<HttpForward[]>({
      method: "GET",
      url: `/domains/${domainId}/forwards`,
    });
  }

  async addHttpForward(
    domainId: number,
    forwardData: HttpForwardData
  ): Promise<void> {
    if (!domainId) {
      throw new Error("domainId is required");
    }
    await this.request<void>({
      method: "POST",
      url: `/domains/${domainId}/forwards`,
      data: forwardData,
    });
  }

  async getHttpForwardByHost(
    domainId: number,
    host: string
  ): Promise<HttpForward> {
    if (!domainId || host === undefined || host === null) {
      throw new Error("domainId and host are required");
    }
    const encodedHost = encodeURIComponent(host);
    return this.request<HttpForward>({
      method: "GET",
      url: `/domains/${domainId}/forwards/${encodedHost}`,
    });
  }

  async updateHttpForwardByHost(
    domainId: number,
    host: string,
    forwardData: HttpForwardData
  ): Promise<HttpForward> {
    if (!domainId || host === undefined || host === null) {
      throw new Error("domainId and host are required");
    }
    if (forwardData.host !== host) {
      throw new Error(
        "Forward host cannot be modified. Delete and recreate if needed."
      );
    }
    const encodedHost = encodeURIComponent(host);
    return this.request<HttpForward>({
      method: "PUT",
      url: `/domains/${domainId}/forwards/${encodedHost}`,
      data: forwardData,
    });
  }

  async deleteHttpForwardByHost(domainId: number, host: string): Promise<void> {
    if (!domainId || host === undefined || host === null) {
      throw new Error("domainId and host are required");
    }
    const encodedHost = encodeURIComponent(host);
    await this.request<void>({
      method: "DELETE",
      url: `/domains/${domainId}/forwards/${encodedHost}`,
    });
  }

  async listInvoices(params?: ListInvoicesParams): Promise<Invoice[]> {
    return this.request<Invoice[]>({
      method: "GET",
      url: "/invoices",
      params: params,
    });
  }

  async getInvoiceById(invoiceId: number): Promise<Invoice> {
    if (!invoiceId) {
      throw new Error("invoiceId is required");
    }
    return this.request<Invoice>({
      method: "GET",
      url: `/invoices/${invoiceId}`,
    });
  }
}
