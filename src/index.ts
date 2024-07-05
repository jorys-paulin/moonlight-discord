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

	// Discord commands KV
	DISCORD_CUSTOM_COMMANDS: KVNamespace;
}

interface KVCommandsMetadata {
	name: string;
	description: string;
}

interface ApplicationCommand {
	id: string;
	name: string;
	description: string;
}

// Returns a Discord message
function messageResponse(message: { content: string }) {
	return Response.json({ type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: message });
}

// Reserved commands
const reservedCommands = ['wiki', 'setup-guide', 'faq', 'commands'];

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

				// Custom commands
				if (commandName === 'commands') {
					// Only accept subcommands
					if (!interaction.data.options) {
						return Response.json({ error: 'No Subcommand Provided' }, { status: 400 });
					}

					// Only allow execution in guilds
					if (!interaction.guild_id) {
						return messageResponse({ content: 'Custom commands can only be used while in a guild' });
					}

					// Create subcommand
					if (interaction.data.options[0].name === 'create') {
						return Response.json({
							type: InteractionResponseType.MODAL,
							data: {
								custom_id: 'create_command',
								title: 'Create a new command',
								components: [
									{
										type: 1,
										components: [{ type: 4, custom_id: 'name', style: 1, label: 'Name', min_length: 1, max_length: 32 }],
									},
									{
										type: 1,
										components: [{ type: 4, custom_id: 'description', style: 2, label: 'Description', min_length: 1, max_length: 100 }],
									},
									{
										type: 1,
										components: [{ type: 4, custom_id: 'content', style: 2, label: 'Content', min_length: 1, max_length: 2000 }],
									},
								],
							},
						});
					}

					// Update subcommand
					if (interaction.data.options[0].name === 'update') {
						const id = interaction.data.options[0].options[0].value;

						// Invalid ID
						if (!id || typeof id !== 'string') {
							return messageResponse({ content: 'An invalid command has been requested' });
						}

						// Try fetching the command from KV
						const { value, metadata } = await env.DISCORD_CUSTOM_COMMANDS.getWithMetadata<KVCommandsMetadata>(
							interaction.guild_id + ':' + id
						);

						// Command not found
						if (!value) {
							return messageResponse({ content: "The requested command couldn't be found" });
						}

						return Response.json({
							type: InteractionResponseType.MODAL,
							data: {
								custom_id: 'update_command:' + id,
								title: 'Edit a command',
								components: [
									{
										type: 1,
										components: [
											{
												type: 4,
												custom_id: 'name',
												style: 1,
												label: 'Name',
												min_length: 1,
												max_length: 32,
												value: metadata?.name,
											},
										],
									},
									{
										type: 1,
										components: [
											{
												type: 4,
												custom_id: 'description',
												style: 2,
												label: 'Description',
												min_length: 1,
												max_length: 100,
												value: metadata?.description,
											},
										],
									},
									{
										type: 1,
										components: [
											{
												type: 4,
												custom_id: 'content',
												style: 2,
												label: 'Content',
												min_length: 1,
												max_length: 2000,
												value: value,
											},
										],
									},
								],
							},
						});
					}

					// Delete subcommand
					if (interaction.data.options[0].name === 'delete') {
						const id = interaction.data.options[0].options[0].value;

						// Invalid ID
						if (!id || typeof id !== 'string') {
							return messageResponse({ content: 'A valid command is required' });
						}

						// Delete on Discord
						try {
							const response = await fetch(
								`https://discord.com/api/v10/applications/${env.DISCORD_APPLICATION_ID}/guilds/${interaction.guild_id}/commands/${id}`,
								{ method: 'DELETE', headers: { Authorization: 'Bot ' + env.DISCORD_TOKEN, 'Content-Type': 'application/json' } }
							);

							// TODO: better error-handling (like for "command doesn't exist")
							if (!response.ok) {
								console.error('delete_command', await response.json());
								return messageResponse({ content: 'An error occured while deleting the command on Discord' });
							}

							// Delete from KV
							await env.DISCORD_CUSTOM_COMMANDS.delete(interaction.guild_id + ':' + id);

							console.log('delete_command', id);
							return messageResponse({ content: 'The command has been sucessfully deleted!' });
						} catch (error) {
							console.error('delete_command', error);
							return messageResponse({ content: 'An error occured while deleting the command' });
						}
					}
				}

				// Custom commands
				const command = await env.DISCORD_CUSTOM_COMMANDS.get(interaction.guild_id + ':' + interaction.data.id);
				if (command) {
					return messageResponse({ content: command });
				}

				return Response.json({ error: 'Unknown Command' }, { status: 400 });
			}

			// Autocomplete
			if (interaction.type === InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE) {
				// Custom commands autocomplete
				if (interaction.data.name === 'commands') {
					const commands = await env.DISCORD_CUSTOM_COMMANDS.list<KVCommandsMetadata>({ limit: 25, prefix: interaction.guild_id + ':' });

					let choices = commands.keys.map((command) => {
						const id = command.name.split(':')[1];
						return {
							name: command.metadata?.name || id,
							value: id,
						};
					});

					// Filter by user input
					const commandName = interaction.data.options[0].options[0].value;
					if (commandName) {
						choices = choices.filter((command) => command.name.includes(commandName));
					}

					return Response.json({
						type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
						data: { choices },
					});
				}

				const choices = [
					"We're no strangers to love",
					'You know the rules, and so do I',
					"A full commitment is what I'm thinking of",
					"You wouldn't get this from any other guy",
					"I just wanna tell you how I'm feeling",
					'Gotta make you understand',
				];
				return Response.json({
					type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
					data: { choices: choices.map((c) => ({ name: c, value: c.toLowerCase() })) },
				});
			}

			// Modal submit
			if (interaction.type === InteractionType.MODAL_SUBMIT) {
				// Create custom command
				if (interaction.data.custom_id === 'create_command') {
					const name = interaction.data.components[0].components[0].value.toLowerCase().replace(' ', '').trim();
					const description = interaction.data.components[1].components[0].value;
					const content = interaction.data.components[2].components[0].value;

					// Check for registered commands
					if (reservedCommands.includes(name)) {
						return messageResponse({ content: "The given command name can't be used because it is reserved" });
					}

					// Try creating the command on Discord
					try {
						const response = await fetch(
							`https://discord.com/api/v10/applications/${env.DISCORD_APPLICATION_ID}/guilds/${interaction.guild_id}/commands`,
							{
								method: 'POST',
								body: JSON.stringify({ name, description }),
								headers: { Authorization: 'Bot ' + env.DISCORD_TOKEN, 'Content-Type': 'application/json' },
							}
						);

						if (!response.ok) {
							console.error('create_command', await response.json());
							return messageResponse({ content: 'An error occured while creating the command on Discord' });
						}

						const command = (await response.json()) as ApplicationCommand;

						// Add the command in KV
						const metadata: KVCommandsMetadata = {
							name: command.name,
							description: command.description,
						};
						await env.DISCORD_CUSTOM_COMMANDS.put(interaction.guild_id + ':' + command.id, content, { metadata });

						console.log('create_command', command.id, command.name);
						return messageResponse({ content: `Your command has been successfully created: </${command.name}:${command.id}>` });
					} catch (error) {
						console.error('create_command', error);
						return messageResponse({ content: 'An error occured while creating the command' });
					}
				}

				// Update custom commmand
				if (interaction.data.custom_id.startsWith('update_command:')) {
					const id = interaction.data.custom_id.replace('update_command:', '');
					const name = interaction.data.components[0].components[0].value.toLowerCase().replace(' ', '-').trim();
					const description = interaction.data.components[1].components[0].value;
					const content = interaction.data.components[2].components[0].value;

					// Check for registered commands
					if (reservedCommands.includes(name)) {
						return messageResponse({ content: "The given command name can't be used because it is reserved" });
					}

					// Try updating the command on Discord
					try {
						const response = await fetch(
							`https://discord.com/api/v10/applications/${env.DISCORD_APPLICATION_ID}/guilds/${interaction.guild_id}/commands/${id}`,
							{
								method: 'PATCH',
								body: JSON.stringify({ name, description }),
								headers: { Authorization: 'Bot ' + env.DISCORD_TOKEN, 'Content-Type': 'application/json' },
							}
						);

						if (!response.ok) {
							console.error('update_command', await response.json());
							return messageResponse({ content: 'An error occured while updating the command on Discord' });
						}

						const command = (await response.json()) as ApplicationCommand;

						// Update the command in KV
						const metadata: KVCommandsMetadata = {
							name: command.name,
							description: command.description,
						};
						await env.DISCORD_CUSTOM_COMMANDS.put(interaction.guild_id + ':' + command.id, content, { metadata });

						console.log('update_command', command.id, command.name);
						return messageResponse({ content: 'Your command has been sucessfully updated!' });
					} catch (error) {
						console.error('update_command', error);
						return messageResponse({ content: 'An error occured while updating the command' });
					}
				}
			}

			return Response.json({ error: 'Unknown Interaction Type' }, { status: 400 });
		}

		// Default route
		return new Response('Not Found', { status: 404 });
	},
};
