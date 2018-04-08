const { Command, Resolver, util: { getContent, getImage } } = require('../../index');
const SNOWFLAKE_REGEXP = Resolver.regex.snowflake;

module.exports = class extends Command {

	constructor(...args) {
		super(...args, {
			botPerms: ['EMBED_LINKS'],
			cooldown: 10,
			description: msg => msg.language.get('COMMAND_QUOTE_DESCRIPTION'),
			extendedHelp: msg => msg.language.get('COMMAND_QUOTE_EXTENDED'),
			usage: '[channel:channel] (message:message)',
			usageDelim: ' '
		});

		this.createCustomResolver('message', async (arg, possible, msg, [channel = msg.channel]) => {
			if (!arg || !SNOWFLAKE_REGEXP.test(arg)) throw msg.language.get('RESOLVER_INVALID_MSG', 'Message');
			const message = await channel.messages.fetch(arg).catch(() => null);
			if (message) return message;
			throw msg.language.get('SYSTEM_MESSAGE_NOT_FOUND');
		});
	}

	async run(msg, [, message]) {
		const embed = new this.client.methods.Embed()
			.setAuthor(message.author.tag, message.author.displayAvatarURL({ size: 128 }))
			.setDescription(getContent(message))
			.setImage(getImage(message))
			.setTimestamp(message.createdAt);

		return msg.sendMessage({ embed });
	}

};