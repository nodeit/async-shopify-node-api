# Async Shopify Node Api

This module provides an async/await wrapper around
the shopify api.

You can now make async calls without the callback mess.

```javascript
const products = await Shopify.get('/admin/products.json');

products.forEach(product => {
   // access to each product object here 
});
```

## Development and Testing

```bash
docker-compose up
```

Changes will be automatically picked up and tests will be run. 