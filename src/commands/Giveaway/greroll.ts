import { SkyraCommand } from '@lib/structures/SkyraCommand';
import { Colors } from '@lib/types/constants/Constants';
import { Events } from '@lib/types/Enums';
import { kRawEmoji } from '@orm/entities/GiveawayEntity';
import { CLIENT_ID } from '@root/config';
import { APIErrors } from '@utils/constants';
import { fetchReactionUsers } from '@utils/util';
import { DiscordAPIError, HTTPError, Message } from 'discord.js';
import { CommandStore, KlasaMessage } from 'klasa';
import { FetchError } from 'node-fetch';

export default class extends SkyraCommand {

	public constructor(store: CommandStore, file: string[], directory: string) {
		super(store, file, directory, {
			aliases: ['gr', 'groll'],
			description: language => language.tget('COMMAND_GIVEAWAYREROLL_DESCRIPTION'),
			extendedHelp: language => language.tget('COMMAND_GIVEAWAYREROLL_EXTENDED'),
			requiredPermissions: ['READ_MESSAGE_HISTORY'],
			runIn: ['text'],
			usage: '[winners:number{1,100}] [message:message]',
			usageDelim: ' '
		});
	}

	public async run(message: KlasaMessage, [winnerAmount = 1, rawTarget]: [number, KlasaMessage | undefined]) {
		const target = await this.resolveMessage(message, rawTarget);
		const { title } = target.embeds[0];
		const winners = await this.pickWinners(target, winnerAmount);
		const content = winners
			? message.language.tget('GIVEAWAY_ENDED_MESSAGE', winners.map(winner => `<@${winner}>`), title)
			: message.language.tget('GIVEAWAY_ENDED_MESSAGE_NO_WINNER', title);
		return message.sendMessage(content);
	}

	private async resolveMessage(message: KlasaMessage, rawTarget: KlasaMessage | undefined) {
		const target = rawTarget
			// If rawMessage is defined then we check everything sans the colour
			? this.validateMessage(rawTarget) ? rawTarget : null
			// If rawTarget was undefined then we fetch it from the API and we check embed colour
			: (await message.channel.messages.fetch({ limit: 100 })).find(msg => this.validatePossibleMessage(msg)) || null;
		if (target) return target as KlasaMessage;
		throw message.language.tget('COMMAND_GIVEAWAYREROLL_INVALID');
	}

	private async pickWinners(message: KlasaMessage, winnerAmount: number) {
		const participants = await this.fetchParticipants(message);
		if (participants.length < winnerAmount) return null;

		let m = participants.length;
		while (m) {
			const i = Math.floor(Math.random() * m--);
			[participants[m], participants[i]] = [participants[i], participants[m]];
		}
		return participants.slice(0, winnerAmount);
	}

	private async fetchParticipants(message: KlasaMessage): Promise<string[]> {
		try {
			const users = await fetchReactionUsers(message.client, message.channel.id, message.id, kRawEmoji);
			users.delete(CLIENT_ID);
			return [...users];
		} catch (error) {
			if (error instanceof DiscordAPIError) {
				if (error.code === APIErrors.UnknownMessage || error.code === APIErrors.UnknownEmoji) return [];
			} else if (error instanceof HTTPError || error instanceof FetchError) {
				if (error.code === 'ECONNRESET') return this.fetchParticipants(message);
				this.store.client.emit(Events.ApiError, error);
			}
			return [];
		}
	}

	/**
	 * Validates that this message is a message from Skyra and is a giveaway
	 */
	private validateMessage(message: Message) {
		return message.author !== null
			&& message.author.id === CLIENT_ID
			&& message.embeds.length === 1
			&& message.reactions.has(kRawEmoji);
	}

	/**
	 * Validates that this is a Skyra giveaway and that it has ended
	 */
	private validatePossibleMessage(message: Message) {
		return this.validateMessage(message) && message.embeds[0].color === Colors.Red;
	}

}
