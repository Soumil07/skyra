import { WSMessageReactionRemove } from '@lib/types/DiscordAPI';
import { Events } from '@lib/types/Enums';
import { GuildSettings } from '@lib/types/settings/GuildSettings';
import { isTextBasedChannel, resolveEmoji } from '@utils/util';
import { TextChannel } from 'discord.js';
import { Event } from 'klasa';

export default class extends Event {

	public async run(channel: TextChannel, data: WSMessageReactionRemove) {
		// If the channel is not a text channel then stop processing
		if (!isTextBasedChannel(channel)) return;

		const parsed = resolveEmoji(data.emoji);
		if (!parsed) return;

		const roleEntry = channel.guild.settings.get(GuildSettings.ReactionRoles)
			.find(entry => entry.emoji === parsed && entry.channel === data.channel_id && (entry.message ? entry.message === data.message_id : true));
		if (!roleEntry) return;

		try {
			const member = await channel.guild.members.fetch(data.user_id);
			if (member.roles.has(roleEntry.role)) await member.roles.remove(roleEntry.role);
		} catch (error) {
			this.client.emit(Events.ApiError, error);
		}
	}

}
