# MCP Tools Documentation

This document describes the available Model Context Protocol (MCP) tools for the Shopify chat agent.

## Table of Contents

1. [search_shop_catalog](#search_shop_catalog)
2. [get_cart](#get_cart)
3. [update_cart](#update_cart)
4. [search_shop_policies_and_faqs](#search_shop_policies_and_faqs)
5. [get_product_details](#get_product_details)

---

## search_shop_catalog

**Description:** Search for products from the online store, hosted on Shopify.

This tool can be used to search for products using natural language queries, specific filter criteria, or both.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | A natural language query. |
| `filters` | array | No | Filters to apply to the search. Only apply filters from the `available_filters` returned in a previous response. |
| `country` | string | No | ISO 3166-1 alpha-2 country code for which to return localized results (e.g., 'US', 'CA', 'GB'). |
| `language` | string | No | ISO 639-1 language code for which to return localized results (e.g., 'EN', 'FR', 'DE'). |
| `limit` | integer | No | Maximum number of products to return. Defaults to 10, maximum is 250. For better user experience, use the default of 10 and ask the user if they want to see more results. |
| `after` | string | No | Pagination cursor to fetch the next page of results. Use the `endCursor` from the previous response. Only use this when the user explicitly asks to see more results. |
| `context` | string | Yes | Additional information about the request such as user demographics, mood, location, or other relevant details that could help in tailoring the response appropriately. |

### Filter Object Properties

The `filters` array can contain objects with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `available` | boolean | Filter on if the product is available for sale (default: true) |
| `category` | object | Category ID to filter by: `{ "id": "string" }` |
| `price` | object | Price range to filter by: `{ "min": number, "max": number }` |
| `productMetafield` | object | Filter on a product metafield: `{ "key": string, "namespace": string, "value": string }` |
| `productType` | string | Product type to filter by |
| `productVendor` | string | Product vendor to filter by |
| `tag` | string | Tag to filter by |
| `taxonomyMetafield` | object | Taxonomy metafield to filter by: `{ "key": string, "namespace": string, "value": string }` |
| `variantMetafield` | object | Variant metafield to filter by: `{ "key": string, "namespace": string, "value": string }` |
| `variantOption` | object | Variant option to filter by: `{ "name": string, "value": string }` |

### Best Practices

- Searches return `available_filters` which can be used for refined follow-up searches
- When filtering, use ONLY the filters from `available_filters` in follow-up searches
- For specific filter searches (category, variant option, product type, etc.), use simple terms without the filter name (e.g., "red" not "red color")
- For filter-specific searches (e.g., "find burton in snowboards" or "show me all available products in gray / green color"), use a two-step approach:
  1. Perform a normal search to discover available filters
  2. If relevant filters are returned, do a second search using the proper filter (productType, category, variantOption, etc.) with just the specific search term
- Results are paginated, with initial results limited to improve experience
- Use the `after` parameter with `endCursor` to fetch additional pages when users request more results

### Response

The response includes product details, available variants, filter options, and pagination info.

---

## get_cart

**Description:** Get the cart including items, shipping options, discount info, and checkout url for a given cart id.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cart_id` | string | Yes | Shopify cart id, formatted like: `gid://shopify/Cart/c1-66330c6d752c2b242bb8487474949791?key=fa8913e951098d30d68033cf6b7b50f3` |

### Response

Returns cart details including:

- Line items in the cart
- Shipping options
- Discount information
- Checkout URL

---

## update_cart

**Description:** Perform updates to a cart, including adding/removing/updating line items, buyer information, shipping details, discount codes, gift cards and notes in one consolidated call. Shipping options become available after adding items and delivery address. When creating a new cart, only `add_items` is required.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cart_id` | string | No | Identifier for the cart being updated. If not provided, a new cart will be created. |
| `add_items` | array | No | Items to add to the cart. Required when creating a new cart. |
| `update_items` | array | No | Existing cart line items to update quantities for. Use quantity 0 to remove an item. |
| `remove_line_ids` | array | No | List of line item IDs to remove explicitly. |
| `buyer_identity` | object | No | Information about the buyer including email, phone, and delivery address. |
| `delivery_addresses_to_add` | array | No | Information about the delivery addresses to add. |
| `delivery_addresses_to_replace` | array | No | Delivery addresses to apply to the cart, replaces all existing cart delivery addresses. Removes all delivery addresses when empty. |
| `selected_delivery_options` | array | No | The delivery options to select for the cart. |
| `discount_codes` | array | No | Discount or promo codes to apply to the cart. Only prompt if customer mentions having a discount code. |
| `gift_card_codes` | array | No | Gift card codes to apply to the cart. Only prompt if customer mentions having a gift card. |
| `note` | string | No | A note or special instructions for the cart. Optional - can ask if customer wants to add special instructions. |

### Add Items Object

Items to be added must have:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `product_variant_id` | string | Yes | The variant ID of the product |
| `quantity` | integer | Yes | Quantity to add (minimum: 1) |

### Update Items Object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | Yes | Line item ID |
| `quantity` | integer | Yes | New quantity (0 to remove, minimum: 0) |

### Buyer Identity Object

| Property | Type | Description |
|----------|------|-------------|
| `email` | string | Email address |
| `phone` | string | Phone number |
| `country_code` | string | ISO country code, used for regional pricing |

### Delivery Address Object

| Property | Type | Description |
|----------|------|-------------|
| `first_name` | string | First name |
| `last_name` | string | Last name |
| `phone` | string | Phone number |
| `address1` | string | Primary address line |
| `address2` | string | Secondary address line |
| `city` | string | City |
| `province_code` | string | Province/state code |
| `zip` | string | Postal code |
| `country_code` | string | ISO country code, used for regional pricing |

### Selected Delivery Options Object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `group_id` | string | Yes | The ID of the delivery group to select |
| `option_handle` | string | Yes | The handle of the delivery option to select |

### Response

Returns the updated cart details.

---

## search_shop_policies_and_faqs

**Description:** Used to get facts about the store's policies, products, or services.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | A natural language query. |
| `context` | string | No | Additional information about the request such as user demographics, mood, location, or other relevant details that could help in tailoring the response appropriately. |

### Example Queries

- What is your return policy?
- What is your shipping policy?
- What is your phone number?
- What are your hours of operation?

### Response

Returns relevant policy information and FAQ answers from the store.

---

## get_product_details

**Description:** Look up a product by ID and optionally specify variant options to select a specific variant.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `product_id` | string | Yes | The product ID, e.g. `gid://shopify/Product/123` |
| `options` | object | No | Optional variant options to select a specific variant, e.g. `{"Size": "10", "Color": "Black"}` |

### Response

Returns detailed product information including:

- Product name, description, and images
- Available variants
- Pricing information
- Stock availability
- Selected variant details (if options provided)

---

## Usage Workflow

### Example: Product Search and Add to Cart

1. **Search for products** using `search_shop_catalog` with a natural language query
2. **Review available filters** returned in the search response
3. **Refine search** if needed using appropriate filters from `available_filters`
4. **Get detailed product info** using `get_product_details` if additional details are needed
5. **Create or update cart** using `update_cart` to add selected items
6. **Get cart status** using `get_cart` to show order summary
7. **Apply discounts** (if provided by customer) using `update_cart` with `discount_codes`
8. **Proceed to checkout** using the checkout URL from the cart

### Example: Policy Lookup

- Use `search_shop_policies_and_faqs` to answer customer questions about shipping, returns, store hours, contact information, etc.
