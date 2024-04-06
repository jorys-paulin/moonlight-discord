/**
 * Moonlight Discord
 */

import { InteractionResponseType, InteractionType, verifyKey } from 'discord-interactions';

// Commands
// @ts-expect-error
import ports from './commands/ports.txt';
// @ts-expect-error
import sunshine from './commands/sunshine.txt';
// @ts-expect-error
import gfeserverinfo from './commands/gfeserverinfo.txt';
// @ts-expect-error
import scripts from './commands/scripts.txt';
// @ts-expect-error
import zerotier from './commands/zerotier.txt';

export interface Env {
	// Discord application ID
	DISCORD_APPLICATION_ID: string;

	// Discord public key
	DISCORD_PUBLIC_KEY: string;

	// Discord token
	DISCORD_TOKEN: string;
}

// Returns a Discord message
function messageResponse(message: { content: string }) {
	return Response.json({ type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: message });
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
				return new Response('Bad Request Signature', { status: 401 });
			}

			// Parse the interaction payload
			const interaction = JSON.parse(body);

			// Ping
			if (interaction.type === InteractionType.PING) {
				return Response.json({ type: InteractionResponseType.PONG });
			}

			// Application commands
			if (interaction.type === InteractionType.APPLICATION_COMMAND) {
				const commandName = interaction.data.name;

				// Wiki
				if (commandName === 'wiki') {
					return messageResponse({ content: 'https://github.com/moonlight-stream/moonlight-docs/wiki' });
				}

				// Setup guide
				if (commandName === 'setup-guide') {
					const allowedSections = [
						'quick-setup-instructions',
						'streaming-over-the-internet',
						'moonlight-client-setup-instructions',
						'additional-requirements-for-hdr-streaming',
						'keyboardmousegamepad-input-options',
						'adding-custom-programs-that-are-not-automatically-found',
						'using-moonlight-to-stream-your-entire-desktop',
					];

					// Link directly to a section
					if (interaction.data.options && interaction.data.options[0]) {
						const section = interaction.data.options[0].value;

						// Only allow sections in list
						if (!allowedSections.includes(section)) {
							return messageResponse({ content: "The requested section of the setup guide isn't accepted" });
						}

						return messageResponse({ content: 'https://github.com/moonlight-stream/moonlight-docs/wiki/Setup-Guide#' + section });
					}

					return messageResponse({ content: 'https://github.com/moonlight-stream/moonlight-docs/wiki/Setup-Guide' });
				}

				// Faq
				if (commandName === 'faq') {
					return messageResponse({ content: 'https://github.com/moonlight-stream/moonlight-docs/wiki/Frequently-Asked-Questions' });
				}

				// Gamepad tester
				if (commandName === 'gamepadtester') {
					return messageResponse({
						content: 'Please open this on your host **while** being connected with Moonlight:\nhttps://gamepad-tester.com/',
					});
				}

				// Shortcuts
				if (commandName === 'shortcuts') {
					return messageResponse({
						content: 'https://github.com/moonlight-stream/moonlight-docs/wiki/Setup-Guide#keyboardmousegamepad-input-options',
					});
				}

				// Ports
				if (commandName === 'ports') {
					return messageResponse({
						content: ports,
					});
				}

				// Sunshine
				if (commandName === 'sunshine') {
					return messageResponse({
						content: sunshine,
					});
				}

				// GFE server info
				if (commandName === 'gfeserverinfo') {
					return messageResponse({
						content: gfeserverinfo,
					});
				}

				// Scripts
				if (commandName === 'scripts') {
					return messageResponse({
						content: scripts,
					});
				}

				// ZeroTier
				if (commandName === 'zerotier') {
					return messageResponse({
						content: zerotier,
					});
				}

				// Duplicate message
				if (commandName === 'Duplicate message') {
					// Grab the target message's author
					const target_id = interaction.data.target_id;
					const target_message = interaction.data.resolved.messages[target_id];

					return messageResponse({ content: `<@${target_message.author.id}> Please don't post your message in multiple channels` });
				}

				// Cheese
				if (commandName === 'Cheese') {
					return messageResponse({ content: ':cheese:' });
				}

				// Bob l'éponge
				if (commandName === "Bob l'éponge") {
					return messageResponse({ content: 'https://fr-academic.com/pictures/frwiki/66/Bob_l%27%C3%A9ponge.jpg' });
				}

				return Response.json({ error: 'Unknown Command' }, { status: 400 });
			}

			return Response.json({ error: 'Unknown Interaction Type' }, { status: 400 });
		}

		// Default route
		return new Response('Not Found', { status: 404 });
	},
};
