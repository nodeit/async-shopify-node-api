/**
 * Shopify Oauth2 Async node.js API
 *
 *
 *
 */

const request = require('request-promise-native');
const crypto = require('crypto');
const uuidv4 = require('uuid/v4');

const env = process.env;


function ShopifyAPI(shopUrl, accessToken=null) {

    if (!(this instanceof ShopifyAPI)) return new ShopifyAPI(shopUrl, accessToken);

    this.accessToken = accessToken;
    this.shopUrl = this.buildBaseUrl(shopUrl);
    this.nonce = this.generateNonce();
    this.setupConfig();

}

ShopifyAPI.prototype.setupConfig = function() {

    const config = {
        verbose: env.SHOPIFY_API_VERBOSE || true,
        shopify: {
            shopify_api_key: env.SHOPIFY_API_KEY,
            shopify_api_secret: env.SHOPIFY_API_SECRET,
            shopify_api_redirect_url: env.SHOPIFY_API_REDIRECT_URL,
            shopify_api_scope: env.SHOPIFY_API_SCOPE
        }
    };

    // Make sure config values aren't null
    Object.keys(config.shopify).forEach(function(key) {
        if (config.shopify[key] == null) // check for null AND undefined
            throw new Error(`Missing shopify config value for: "${key}"`);
    });

    this.config = config;

};

ShopifyAPI.prototype.generateNonce = function() {
    return uuidv4();
};

ShopifyAPI.prototype.buildBaseUrl = function(url) {
    let newUrl = url;
    if (!url.endsWith('.myshopify.com'))
        newUrl = `${newUrl}.myshopify.com`;
    if (!url.startsWith('https://'))
        newUrl = `https://${newUrl}`;
    return newUrl;
};

ShopifyAPI.prototype.log = function(msg) {
    if (this.config.verbose) console.log(msg);
};

ShopifyAPI.prototype.includeHeadersInResponse = function(body, response) {
    return {
        headers: response.headers,
        data: body
    };
};

ShopifyAPI.prototype.request = async function(endpoint, method='GET', data=null) {

    const options = {
        baseUrl: this.shopUrl,
        uri: endpoint,
        method: method,
        json: true,
        transform: this.includeHeadersInResponse,
        headers: {
            'User-Agent': 'async-shopify-node-api',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Shopify-Access-Token': this.accessToken
        }
    };

    if (data) options.body = data;

    return await request(options);

};

ShopifyAPI.prototype.buildAuthUrl = function() {
    let authUrl = `${this.shopUrl}/admin/oauth/authorize?`;
    authUrl += `client_id=${this.config.shopify.shopify_api_key}`;
    authUrl += `&scope=${this.config.shopify.shopify_api_scope}`;
    authUrl += `&redirect_uri=${this.config.shopify.shopify_api_redirect_url}`;
    authUrl += `&state=${this.nonce}`;
    return authUrl;
};

ShopifyAPI.prototype.isValidSignature = function(params) {

    const hmac = params['hmac'];
    const parameters = [];

    Object.keys(params).forEach(key => {
       if (key !== 'hmac' && key !== 'signature') {
           parameters.push(`${key}=${params[key]}`);
       }
    });

    const message = parameters.sort().join('&');

    const digest = crypto
                    .createHmac('SHA256', this.config.shopify.shopify_api_secret)
                    .update(message)
                    .digest('hex');

    return (digest === hmac);

};

ShopifyAPI.prototype.exchangeTemporaryToken = async function(params) {

    const data = {
        client_id: this.config.shopify.shopify_api_key,
        client_secret: this.config.shopify.shopify_api_secret,
        code: params['code']
    };

    if (!this.isValidSignature(params)) {
        throw new Error('Signature is not authentic!');
    }

    const response = await this.request('/admin/oauth/access_token', 'POST', data);

    return response.data['access_token'];

};

module.exports = ShopifyAPI;