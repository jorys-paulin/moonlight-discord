/**
 * Moonlight Discord
 */

import { InteractionResponseType, InteractionType, verifyKey } from 'discord-interactions';

export interface Env {
	// Discord application ID
	DISCORD_APPLICATION_ID: string;

	// Discord public key
	DISCORD_PUBLIC_KEY: string;

	// Discord token
	DISCORD_TOKEN: string;
}

// Returns a JSON reponse
function createJsonResponse(value: any) {
	return new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json;charset=UTF-8' } });
}

// Returns an error as JSON
function errorResponse(error: string) {
	return new Response(JSON.stringify({ error }), { status: 400, headers: { 'Content-Type': 'application/json;charset=UTF-8' } });
}

// Returns a Discord message
function messageResponse(message: { content: string }) {
	return new Response(JSON.stringify({ type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: message }), {
		headers: { 'Content-Type': 'application/json;charset=UTF-8' },
	});
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Index page
		if (request.method === 'GET' && url.pathname === '/') {
			return Response.redirect('https://moonlight-stream.org/discord', 302);
		}

		// Interactions route
		if (request.method === 'POST' && url.pathname === '/') {
			const signature = request.headers.get('X-Signature-Ed25519');
			const timestamp = request.headers.get('X-Signature-Timestamp');
			const body = await request.text();

			// Check signature
			if (!signature || !timestamp || !verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY)) {
				return new Response('Baq Request Signature', { status: 401 });
			}

			const interaction = JSON.parse(body);

			// Ping
			if (interaction.type === InteractionType.PING) {
				return createJsonResponse({ type: InteractionResponseType.PONG });
			}

			// Application commands
			if (interaction.type === InteractionType.APPLICATION_COMMAND) {
				const commandName = interaction.data.name;

				// Wiki
				if (commandName === 'wiki') {
					return messageResponse({ content: 'https://github.com/moonlight-stream/moonlight-docs/wiki' });
				}
				// Setup guide
				if (commandName === 'setup') {
					return messageResponse({ content: 'https://github.com/moonlight-stream/moonlight-docs/wiki/Setup-Guide' });
				}
				// Faq
				if (commandName === 'faq') {
					return messageResponse({ content: 'https://github.com/moonlight-stream/moonlight-docs/wiki/Frequently-Asked-Questions' });
				}
				// Gamepad tester
				if (commandName === 'gamepadtester') {
					return messageResponse({ content: 'https://gamepad-tester.com/' });
				}
				// Shortcuts
				if (commandName === 'shortcuts') {
					return messageResponse({
						content: 'https://github.com/moonlight-stream/moonlight-docs/wiki/Setup-Guide#keyboardmousegamepad-input-options',
					});
				}

				// Duplicate message
				if (commandName === 'Duplicate message') {
					return messageResponse({ content: "Please don't post your message in multiple channels" });
				}
				// Cheese
				if (commandName === 'Cheese') {
					return messageResponse({ content: ':cheese:' });
				}

				return errorResponse('Unknown Command');
			}

			return errorResponse('Unknown Type');
		}

		// Default route
		return new Response('Not Found', { status: 404 });
	},
};
