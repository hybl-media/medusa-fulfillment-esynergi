# medusa-fulfillment-esynergi

Adds Esynergi as a fulfilment provider in Medusa Commerce.

On each new fulfillment an order is created in Esynergi.

## Options

The following options should be added to your `medusa-config.js`

```
    account: [esynergi account url] (required)
    email: [esynergi acount email] (required)
    password: [esynergi account password] (required)
    returnSupplier: [esynergi return supplier no.]
```