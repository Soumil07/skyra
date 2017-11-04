const { Command, announcement } = require('../../index');

module.exports = class extends Command {

	constructor(...args) {
		super(...args, {
			botPerms: ['MANAGE_ROLES'],
			guildOnly: true,
			cooldown: 15,

			description: 'Subscribe to this servers\' announcements.',
			extend: {
				EXPLANATION: [
					'This command serves the purpose of **giving** you the subscriber role, which must be configured by the',
					'server\'s administrators. When a moderator or administrator use the **announcement** command, you',
					'will be mentioned. This feature is meant to replace everyone/here tags and mention only the interested',
					'users.'
				].join(' ')
			}
		});
	}

	async run(msg, args, settings, i18n) {
		const role = announcement(msg);
		await msg.member.addRole(role);
		return msg.send(i18n.get('COMMAND_SUBSCRIBE_SUCCESS', role.name));
	}

};
