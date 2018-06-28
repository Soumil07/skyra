const { Command, klasaUtil: { exec, codeBlock }, MessageAttachment } = require('../../../index');
const { post } = require('snekfetch');

module.exports = class extends Command {

	constructor(...args) {
		super(...args, {
			aliases: ['execute'],
			description: (msg) => msg.language.get('COMMAND_EXEC_DESCRIPTION'),
			extendedHelp: (msg) => msg.language.get('COMMAND_EXEC_EXTENDED'),
			guarded: true,
			permissionLevel: 10,
			usage: '<expression:string>'
		});
	}

	async run(msg, [input]) {
		const result = await exec(input, { timeout: 'timeout' in msg.flags ? Number(msg.flags.timeout) : 60000 })
			.catch(error => ({ stdout: null, stderr: error }));
		const output = result.stdout ? `**\`OUTPUT\`**${codeBlock('prolog', result.stdout)}` : '';
		const outerr = result.stderr ? `**\`ERROR\`**${codeBlock('prolog', result.stderr)}` : '';
		const joined = [output, outerr].join('\n');

		return msg.sendMessage(joined.length > 2000 ? await this.getHaste(joined).catch(() => new MessageAttachment(Buffer.from(joined), 'output.txt')) : joined);
	}

	async getHaste(result) {
		const { body } = await post('https://hastebin.com/documents').send(result);
		return `https://hastebin.com/${body.key}.js`;
	}

};