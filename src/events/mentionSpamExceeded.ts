// Copyright (c) 2018 BDISTIN. All rights reserved. MIT license.
import { Events } from '@lib/types/Enums';
import { GuildSettings } from '@lib/types/settings/GuildSettings';
import { Moderation } from '@utils/constants';
import { Event, KlasaMessage } from 'klasa';
import { CLIENT_ID } from '@root/config';

export default class extends Event {

	public async run(message: KlasaMessage) {
		const lock = message.guild!.moderation.createLock();
		await message.guild!.members.ban(message.author.id, { days: 0, reason: message.language.tget('CONST_MONITOR_NMS') })
			.catch(error => this.client.emit(Events.ApiError, error));
		await message.sendLocale('MONITOR_NMS_MESSAGE', [message.author]).catch(error => this.client.emit(Events.ApiError, error));
		message.guild!.security.nms.delete(message.author.id);

		const reason = message.language.tget('MONITOR_NMS_MODLOG', message.guild!.settings.get(GuildSettings.NoMentionSpam.MentionsAllowed));
		try {
			await message.guild!.moderation.create({
				userID: message.author.id,
				moderatorID: CLIENT_ID,
				type: Moderation.TypeCodes.Ban,
				reason
			}).create();
		} catch (error) {
			this.client.emit(Events.Wtf, error);
		} finally {
			lock();
		}
	}

}
