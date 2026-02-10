# domeneshop-js

[![npm version](https://badge.fury.io/js/%40villdyr%2Fdomeneshop-js.svg)](https://badge.fury.io/js/%40villdyr%2Fdomeneshop-js)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A zero-dependency TypeScript client for the [Domeneshop API](https://api.domeneshop.no/docs/). Manage domains, DNS records, HTTP forwards, dynamic DNS, and invoices.

- Zero runtime dependencies (uses native `fetch`)
- Full TypeScript support with discriminated union types for DNS records
- Supports both ESM and CommonJS
- Covers the complete Domeneshop API v0

## Installation

```bash
npm install @villdyr/domeneshop-js
```

## Quick Start

```typescript
import { DomeneshopClient } from "@villdyr/domeneshop-js";

const client = new DomeneshopClient({
  token: "YOUR_API_TOKEN",
  secret: "YOUR_API_SECRET",
});

// List all your domains
const domains = await client.listDomains();

// Add a DNS record
const { id } = await client.createDnsRecord(domains[0].id, {
  host: "www",
  type: "A",
  data: "1.2.3.4",
});
```

Generate API credentials at [domeneshop.no/admin?view=api](https://www.domeneshop.no/admin?view=api).

## API Reference

### Constructor

```typescript
new DomeneshopClient({ token, secret, baseUrl? })
```

| Option    | Type     | Description                                                        |
| --------- | -------- | ------------------------------------------------------------------ |
| `token`   | `string` | **Required.** API token.                                           |
| `secret`  | `string` | **Required.** API secret.                                          |
| `baseUrl` | `string` | Override the base URL. Defaults to `https://api.domeneshop.no/v0`. |

### Domains

```typescript
// List all domains (optionally filter by name)
const domains = await client.listDomains();
const filtered = await client.listDomains({ domain: "example.no" });

// Get a single domain
const domain = await client.getDomain(domainId);
```

### DNS Records

Supported record types: **A**, **AAAA**, **ANAME**, **CAA**, **CNAME**, **DS**, **MX**, **NS**, **SRV**, **TLSA**, **TXT**.

```typescript
// List all records for a domain
const records = await client.listDnsRecords(domainId);

// Filter by host and/or type
const aRecords = await client.listDnsRecords(domainId, {
  host: "www",
  type: "A",
});

// Create a record (ttl is optional, defaults to 3600)
const { id } = await client.createDnsRecord(domainId, {
  host: "www",
  type: "A",
  data: "1.2.3.4",
  ttl: 300,
});

// Create an MX record
await client.createDnsRecord(domainId, {
  host: "@",
  type: "MX",
  data: "mail.example.no",
  priority: 10,
});

// Create an SRV record
await client.createDnsRecord(domainId, {
  host: "_sip._tcp",
  type: "SRV",
  data: "sip.example.no",
  priority: 10,
  weight: 60,
  port: 5060,
});

// Get, update, or delete a record
const record = await client.getDnsRecord(domainId, recordId);
await client.updateDnsRecord(domainId, recordId, { host: "www", type: "A", data: "5.6.7.8" });
await client.deleteDnsRecord(domainId, recordId);
```

### Dynamic DNS

```typescript
// Update DDNS (creates the record if it doesn't exist)
await client.updateDynDns({ hostname: "home.example.no" });

// Specify an IP explicitly
await client.updateDynDns({ hostname: "home.example.no", myip: "1.2.3.4" });
```

### HTTP Forwards

```typescript
// List forwards
const forwards = await client.listForwards(domainId);

// Create a 301 redirect
await client.createForward(domainId, {
  host: "www",
  frame: false,
  url: "https://example.com",
});

// Get, update, or delete a forward
const forward = await client.getForward(domainId, "www");
await client.updateForward(domainId, "www", { host: "www", frame: false, url: "https://new.example.com" });
await client.deleteForward(domainId, "www");
```

### Invoices

```typescript
// List all invoices (past 3 years)
const invoices = await client.listInvoices();

// Filter by status: "unpaid" | "paid" | "settled"
const unpaid = await client.listInvoices({ status: "unpaid" });

// Get a single invoice
const invoice = await client.getInvoice(invoiceId);
```

## Error Handling

All API errors throw a `DomeneshopError` with the HTTP status code and response body:

```typescript
import { DomeneshopClient, DomeneshopError } from "@villdyr/domeneshop-js";

try {
  await client.getDomain(999);
} catch (error) {
  if (error instanceof DomeneshopError) {
    console.error(error.status); // e.g. 404
    console.error(error.body);   // parsed response body
  }
}
```

## TypeScript

All types are exported for direct use:

```typescript
import type {
  Domain,
  DomainServices,
  DnsRecord,
  DnsRecordA,
  DnsRecordMX,
  DnsRecordSRV,
  DnsRecordData,
  HttpForward,
  Invoice,
} from "@villdyr/domeneshop-js";
```

DNS records use discriminated unions — narrow by the `type` field:

```typescript
const records = await client.listDnsRecords(domainId);

for (const record of records) {
  switch (record.type) {
    case "A":
      console.log(record.data); // IPv4 address
      break;
    case "MX":
      console.log(record.data, record.priority);
      break;
    case "SRV":
      console.log(record.data, record.priority, record.weight, record.port);
      break;
  }
}
```

## License

MIT
