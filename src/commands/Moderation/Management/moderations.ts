import { Cache } from '@klasa/cache';
import { chunk } from '@klasa/utils';
import { DbSet } from '@lib/structures/DbSet';
import { RichDisplayCommand, RichDisplayCommandOptions } from '@lib/structures/RichDisplayCommand';
import { UserRichDisplay } from '@lib/structures/UserRichDisplay';
import { PermissionLevels } from '@lib/types/Enums';
import { ModerationEntity } from '@orm/entities/ModerationEntity';
import { ApplyOptions } from '@skyra/decorators';
import { BrandingColors, Moderation } from '@utils/constants';
import { cutText } from '@utils/util';
import { MessageEmbed } from 'discord.js';
import { KlasaMessage, KlasaUser } from 'klasa';

@ApplyOptions<RichDisplayCommandOptions>({
	aliases: ['moderation'],
	bucket: 2,
	cooldown: 10,
	description: language => language.tget('COMMAND_MODERATIONS_DESCRIPTION'),
	extendedHelp: language => language.tget('COMMAND_MODERATIONS_EXTENDED'),
	permissionLevel: PermissionLevels.Moderator,
	requiredPermissions: ['MANAGE_MESSAGES'],
	runIn: ['text'],
	usage: '<mutes|warnings|warns|all:default> [user:username]'
})
export default class extends RichDisplayCommand {

	public async run(message: KlasaMessage, [action, target]: ['mutes' | 'warnings' | 'warns' | 'all', KlasaUser?]) {
		const response = await message.sendEmbed(new MessageEmbed()
			.setDescription(message.language.tget('SYSTEM_LOADING'))
			.setColor(BrandingColors.Secondary));

		const entries = (await (target ? message.guild!.moderation.fetch(target.id) : message.guild!.moderation.fetch()))
			.filter(this.getFilter(action, target));
		if (!entries.size) throw message.language.tget('COMMAND_MODERATIONS_EMPTY');

		const display = new UserRichDisplay(new MessageEmbed()
			.setColor(await DbSet.fetchColor(message))
			.setAuthor(this.client.user!.username, this.client.user!.displayAvatarURL({ size: 128, format: 'png', dynamic: true }))
			.setTitle(message.language.tget('COMMAND_MODERATIONS_AMOUNT', entries.size)));

		// Fetch usernames
		const usernames = await (target ? this.fetchAllModerators(entries) : this.fetchAllUsers(entries));

		// Set up the formatter
		const durationDisplay = message.language.duration.bind(message.language);
		const displayName = action === 'all';
		const format = target
			? this.displayModerationLogFromModerators.bind(this, usernames, durationDisplay, displayName)
			: this.displayModerationLogFromUsers.bind(this, usernames, durationDisplay, displayName);

		for (const page of chunk([...entries.values()], 10)) {
			display.addPage((template: MessageEmbed) => {
				for (const entry of page) {
					const { name, value } = format(entry);
					template.addField(name, value);
				}

				return template;
			});
		}

		await display.start(response, message.author.id);
		return response;
	}

	private displayModerationLogFromModerators(users: Map<string, string>, duration: DurationDisplay, displayName: boolean, entry: ModerationEntity) {
		const appealOrInvalidated = entry.appealType || entry.invalidated;
		const remainingTime = appealOrInvalidated || entry.duration === null || entry.createdAt === null ? null : (entry.createdTimestamp + entry.duration!) - Date.now();
		const expiredTime = remainingTime !== null && remainingTime <= 0;
		const formattedModerator = users.get(entry.moderatorID!);
		const formattedReason = entry.reason ? cutText(entry.reason, 800) : 'None';
		const formattedDuration = remainingTime === null || expiredTime ? '' : `\nExpires in: ${duration(remainingTime)}`;
		const formatter = appealOrInvalidated || expiredTime ? '~~' : '';

		return {
			name: `\`${entry.caseID}\`${displayName ? ` | ${entry.title}` : ''}`,
			value: `${formatter}Moderator: **${formattedModerator}**.\n${formattedReason}${formattedDuration}${formatter}`
		};
	}

	private displayModerationLogFromUsers(users: Map<string, string>, duration: DurationDisplay, displayName: boolean, entry: ModerationEntity) {
		const appealOrInvalidated = entry.appealType || entry.invalidated;
		const remainingTime = appealOrInvalidated || entry.duration === null || entry.createdAt === null ? null : (entry.createdTimestamp + entry.duration!) - Date.now();
		const expiredTime = remainingTime !== null && remainingTime <= 0;
		const formattedUser = users.get(entry.userID!);
		const formattedReason = entry.reason ? cutText(entry.reason, 800) : 'None';
		const formattedDuration = remainingTime === null || expiredTime ? '' : `\nExpires in: ${duration(remainingTime)}`;
		const formatter = appealOrInvalidated || expiredTime ? '~~' : '';

		return {
			name: `\`${entry.caseID}\`${displayName ? ` | ${entry.title}` : ''}`,
			value: `${formatter}Moderator: **${formattedUser}**.\n${formattedReason}${formattedDuration}${formatter}`
		};
	}

	private async fetchAllUsers(entries: Cache<number, ModerationEntity>) {
		const users = new Map() as Map<string, string>;
		for (const entry of entries.values()) {
			const id = entry.userID!;
			if (!users.has(id)) users.set(id, (await entry.fetchUser()).username);
		}
		return users;
	}

	private async fetchAllModerators(entries: Cache<number, ModerationEntity>) {
		const moderators = new Map() as Map<string, string>;
		for (const entry of entries.values()) {
			const id = entry.moderatorID!;
			if (!moderators.has(id)) moderators.set(id, (await entry.fetchModerator()).username);
		}
		return moderators;
	}

	private getFilter(type: 'mutes' | 'warnings' | 'warns' | 'all', target: KlasaUser | undefined) {
		switch (type) {
			case 'mutes':
				return target
					? (entry: ModerationEntity) => entry.isType(Moderation.TypeCodes.Mute)
						&& !entry.invalidated && !entry.appealType && entry.userID === target.id
					: (entry: ModerationEntity) => entry.isType(Moderation.TypeCodes.Mute)
						&& !entry.invalidated && !entry.appealType;
			case 'warns':
			case 'warnings':
				return target
					? (entry: ModerationEntity) => entry.isType(Moderation.TypeCodes.Warning)
						&& !entry.invalidated && !entry.appealType && entry.userID === target.id
					: (entry: ModerationEntity) => entry.isType(Moderation.TypeCodes.Warning)
						&& !entry.invalidated && !entry.appealType;
			case 'all':
			default:
				return target
					? (entry: ModerationEntity) => entry.duration !== null
						&& !entry.invalidated && !entry.appealType && entry.userID === target.id
					: (entry: ModerationEntity) => entry.duration !== null
						&& !entry.invalidated && !entry.appealType;
		}
	}

}

type DurationDisplay = (time: number) => string;
