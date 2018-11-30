import { Inhibitor, KlasaMessage, RateLimitManager } from 'klasa';
import { SkyraCommand } from '../lib/structures/SkyraCommand';

export default class extends Inhibitor {

	public spamProtection = true;

	private ratelimit = new RateLimitManager(1, 30000);

	public async run(message: KlasaMessage, command: SkyraCommand): Promise<void> {
		if (!command.spam || !message.guild) return;

		const channelID = message.guild.settings.get('channels.spam') as string;
		if (channelID === message.channel.id) return;
		if (await message.hasAtLeastPermissionLevel(5)) return;

		const channel = message.guild.channels.get(channelID);
		if (!channel) {
			await message.guild.settings.reset('channels.spam');
			return;
		}

		try {
			this.ratelimit.acquire(message.channel.id).drip();
		} catch {
			throw message.language.get('INHIBITOR_SPAM', channel);
		}
	}

}
