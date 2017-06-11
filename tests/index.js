const test = require('tape');
const nock = require('nock');

const Shopify = require('../src');

const env = process.env;

test('config', function(t) {

    const s = new Shopify('config-shop');

    const actual = s.config;
    const env = process.env;
    const expected = {
        verbose: env.SHOPIFY_API_VERBOSE || true,
        shopify: {
            shopify_api_key: env.SHOPIFY_API_KEY,
            shopify_api_secret: env.SHOPIFY_API_SECRET,
            shopify_api_redirect_url: env.SHOPIFY_API_REDIRECT_URL,
            shopify_api_scope: env.SHOPIFY_API_SCOPE
        }
    };

    t.deepEqual(actual, expected, 'should have correct config');
    t.end();

});

test('shopUrl', function(t) {

    let s = new Shopify('myshop');

    let actual = s.shopUrl;
    let expected = 'https://myshop.myshopify.com';

    t.equal(actual, expected, 'should append shopify domain');

    s = new Shopify('myshop.myshopify.com');
    actual = s.shopUrl;
    expected = 'https://myshop.myshopify.com';

    t.equal(actual, expected, 'should not append shopify domain');

    t.end();

});

test('request', function(t) {
    (async function() {

        const productJSON = require('./json/products.json');

        const getProducts = nock('https://export-test.myshopify.com')
                            .get('/admin/products.json')
                            .reply(200, productJSON);

        const s = new Shopify('export-test', 'blah');

        const res = await s.request('/admin/products.json');

        getProducts.done();

        const actual = res.data;
        const expected = productJSON;

        t.deepEqual(actual, expected, 'should return correct response');

        t.end();

    })().catch(e => t.fail(e));
});

test('build auth url', function(t) {
    (async function() {

        const s = new Shopify('auth-url', 'blah');

        const actual = s.buildAuthUrl();

        let expected = `https://auth-url.myshopify.com/admin/oauth/authorize?`;
        expected += `client_id=${env.SHOPIFY_API_KEY}`;
        expected += `&scope=${env.SHOPIFY_API_SCOPE}`;
        expected += `&redirect_uri=${env.SHOPIFY_API_REDIRECT_URL}`;
        expected += `&state=${s.nonce}`;

        t.equal(actual, expected);

        t.end();

    })().catch(e => t.fail(e));
});

test('isValidSignature', function(t) {

    const s = new Shopify('some-shop', 'whoa');

    const params = {
        'shop': 'some-shop.myshopify.com',
        'code': 'a94a110d86d2452eb3e2af4cfb8a3828',
        'timestamp': '1337178173',
        'signature': '6e39a2ea9e497af6cb806720da1f1bf3',
        'hmac': '62c96e47cdef32a33c6fa78d761e049b3578b8fc115188a9ffcd774937ab7c78',
        'state': 'abc123'
    };

    // For testing only, temporarily updating a config param
    s.config.shopify.shopify_api_secret = 'hush';

    t.ok(s.isValidSignature(params), 'signature is valid');

    t.end();
});


test('exchangeTemporaryToken', function(t) {
    (async function() {

        const s = new Shopify('some-shop', 'derp');

        const params = {
            'shop': 'some-shop.myshopify.com',
            'code': 'a94a110d86d2452eb3e2af4cfb8a3828',
            'timestamp': '1337178173',
            'signature': '6e39a2ea9e497af6cb806720da1f1bf3',
            'hmac': '62c96e47cdef32a33c6fa78d761e049b3578b8fc115188a9ffcd774937ab7c78',
            'state': 'abc123'
        };

        // For testing only, temporarily updating a config param
        s.config.shopify.shopify_api_secret = 'hush';

        const exchangeToken = nock('https://some-shop.myshopify.com')
            .post('/admin/oauth/access_token')
            .reply(200, {
                'access_token': 'abcd'
            });

        const token = await s.exchangeTemporaryToken(params);

        exchangeToken.done();

        t.equal(token, 'abcd', 'correct token returned');

        t.end();

    })().catch(e => t.fail(e));
});