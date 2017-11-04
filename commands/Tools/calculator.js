const { Command, util, StopWatch } = require('../../index');
const math = require('mathjs');

module.exports = class extends Command {

	constructor(...args) {
		super(...args, {
			aliases: ['calculate', 'calc', 'math'],
			mode: 1,
			cooldown: 10,

			usage: '<equation:string>',
			description: 'Calculate arbitrary maths.',
			extend: {
				EXPLANATION: [
					'Take a look in mathjs.org/docs/index.html#documentation'
				].join(' '),
				ARGUMENTS: '<equation>',
				EXP_USAGE: [
					['equation', 'The math equation to calculate.']
				],
				EXAMPLES: [
					'[3, 5] + [1, sin(6)]',
					'35 degC to degF',
					'120 km/h to km/second'
				],
				REMINDER: 'This command supports matrices, complex numbers, fractions, big numbers, and even, algebra.'
			}
		});
	}

	run(msg, [equation], settings, i18n) {
		const start = new StopWatch(3);
		try {
			const evaled = math.eval(equation);
			start.stop();
			return msg.send(i18n.get('COMMAND_CALC', start.friendlyDuration, util.codeBlock('js', util.clean(evaled))));
		} catch (error) {
			start.stop();
			return msg.send(i18n.get('COMMAND_CALC_FAILURE', start.friendlyDuration, util.codeBlock('js', error)));
		}
	}

};
