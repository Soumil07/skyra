import { DbSet } from '@lib/structures/DbSet';
import { SkyraCommand, SkyraCommandOptions } from '@lib/structures/SkyraCommand';
import { CdnUrls } from '@lib/types/Constants';
import { ApplyOptions } from '@skyra/decorators';
import { MessageEmbed } from 'discord.js';
import { KlasaMessage } from 'klasa';

@ApplyOptions<SkyraCommandOptions>({
	aliases: ['escape'],
	bucket: 2,
	cooldown: 60,
	description: language => language.tget('COMMAND_ESCAPEROPE_DESCRIPTION'),
	extendedHelp: language => language.tget('COMMAND_ESCAPEROPE_EXTENDED')
})
export default class extends SkyraCommand {

	public async run(message: KlasaMessage) {
		if (message.deletable) await message.nuke().catch(() => null);

		return message.sendEmbed(new MessageEmbed()
			.setColor(await DbSet.fetchColor(message))
			.setImage(CdnUrls.EscapeRopeGif)
			.setDescription(message.language.tget('COMMAND_ESCAPEROPE_OUTPUT', message.author))
			.setAuthor(
				message.member?.displayName ?? message.author.username,
				message.author.displayAvatarURL({ size: 128, format: 'png', dynamic: true })
			));
	}

}
