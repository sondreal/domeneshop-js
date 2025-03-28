# domeneshop-js

[![npm version](https://badge.fury.io/js/%40villdyr%2Fdomeneshop-js.svg)](https://badge.fury.io/js/%40villdyr%2Fdomeneshop-js)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A JavaScript/TypeScript wrapper for the [Domeneshop API](https://api.domeneshop.no/docs/).

## Description

This library provides a convenient way to interact with the Domeneshop API using JavaScript or TypeScript. It simplifies common tasks such as managing domains, DNS records, and more.

## Installation

Install the package using npm:

```bash
npm install @villdyr/domeneshop-js
```

Or using yarn:

```bash
yarn add @villdyr/domeneshop-js
```

## Usage

```typescript
import { Domeneshop } from "@villdyr/domeneshop-js";

// Initialize the client with your API credentials
// You can generate credentials at https://api.domeneshop.no/auth
const client = new Domeneshop({
  apiToken: "YOUR_API_TOKEN",
  apiSecret: "YOUR_API_SECRET",
});

async function listDomains() {
  try {
    const domains = await client.domains.listDomains();
    console.log("Domains:", domains);
  } catch (error) {
    console.error("Error fetching domains:", error);
  }
}

listDomains();
```

_(Note: Replace `'YOUR_API_TOKEN'` and `'YOUR_API_SECRET'` with your actual Domeneshop API credentials.)_

## API Documentation

For detailed information about the Domeneshop API endpoints, please refer to the official [Domeneshop API Documentation](https://api.domeneshop.no/docs/).

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests on the [GitHub repository](https://github.com/sondreal/domeneshop-js).

Before contributing, please ensure you have read the contribution guidelines (if available).

## Issues

If you encounter any bugs or have feature requests, please report them on the [issue tracker](https://github.com/sondreal/domeneshop-js/issues).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details (if a LICENSE file exists, otherwise refer to the MIT license terms).

---

_Author: Sondre Dyrnes_
_Homepage: [https://github.com/sondreal/domeneshop-js](https://github.com/sondreal/domeneshop-js)_
