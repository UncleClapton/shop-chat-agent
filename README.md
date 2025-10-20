# Shop Chat Agent - Simplified Product Search Chatbot

This version of the Shop Chat Agent is a streamlined implementation designed to facilitate basic product searches through a chat interface.

## Not intended for Production deployment

This implementation is meant for educational and demonstration purposes only. It lacks advanced features, optimizations, and security measures required for production use. Users should not deploy this version in a live environment.

## Setup

1. Clone this repository to your local machine.
    * `git clone https://github.com/uncleclapton/shop-chat-agent.git`
2. Navigate to the project directory.
    * `cd shop-chat-agent`
3. Install project dependencies.
    * `yarn install`
4. Setup local DB & Prisma.
    * `yarn setup`
5. Configure environment variables
    * Copy `.env.example` to `.env` and fill in the required values.
6. The service is now ready to run!

## Run

To start the development server, run the following command:

```bash
yarn start
```

The server will be accessible at `http://localhost:3000`.

## Dev Notes

* Some configuration options have been hardcoded for simplicity.
  * See `app/services/config.server.ts` to customize these settings.
* You may customize the system prompt used by the chat agent in `app/services/claude.server.ts`.
* See the postman collection in `docs/postman.json` for example requests.

## Routes

### `GET /chat?conversation_id={conversationId}`

Fetches the chat history for a given conversation ID.

* **Parameters:**
  * `conversation_id` (string): The ID of the conversation to fetch.

### `POST /chat?conversation_id={conversationId}`

Sends a message to the chat agent within the specified conversation. If no conversation ID is provided, a new conversation will be created.

Responds with a server-sent events (SSE) stream which will relay the chat agent's responses, product search results, as well as the conversation ID.

* **Parameters:**
  * `conversation_id` (string) (optional): The ID of the conversation to send the message to.

* **Body:**
  * `message` (string): The message to send to the chat agent.
  * `shopDomain` (string): The domain of the shop to query products from.
    * e.g., `https://mystorename.myshopify.com`
  * `shopName` (string): The name of the shop to query products from.
