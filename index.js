const functions = require('@google-cloud/functions-framework');
const mailchimpTx = require('@mailchimp/mailchimp_transactional')(process.env.MAILCHIMP_API_KEY);

const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize(process.env.POSTGRES_DATABASE, process.env.POSTGRES_USERNAME, process.env.POSTGRES_PASSWORD, {
	host: process.env.POSTGRES_HOST,
	dialect: 'postgres',
});

(async () => {
	try {
		await sequelize.authenticate();
		console.log('Connection has been established successfully.');

		try {
			const response = await mailchimpTx.users.ping();
			console.log(response);
			console.log('Sent a successful ping to Mailchimp.');
		} catch (error) {
			console.error('Unable to send to Mailchimp.', error);
		}
	} catch (error) {
		console.error('Unable to connect to the database.', error);
	}
})();

const Verify = sequelize.define(
	'Verify',
	{
		username: {
			type: DataTypes.STRING,
			allowNull: false,
			unique: true,
		},
		first_name: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		last_name: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		verify_token: {
			type: DataTypes.UUID,
			defaultValue: DataTypes.UUIDV4,
			allowNull: false,
		},
		token_created_at: {
			type: DataTypes.DATE,
			defaultValue: DataTypes.NOW,
			allowNull: false,
		},
		verified: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false,
		},
	},
	{
		freezeTableName: true,
		timestamps: true,
		createdAt: 'object_created',
		updatedAt: 'object_updated',
	}
);

(async () => {
	try {
		await Verify.sync(); // This creates the table if it doesn't exist (and does nothing if it already exists)
		console.log('Database sync successfully.');
	} catch (error) {
		console.error('Unable to sync the database.', error);
	}
})();

// Register a CloudEvent callback with the Functions Framework that will
// be executed when the Pub/Sub trigger topic receives a message.
functions.cloudEvent('verifyLink', async (cloudEvent) => {
	// const response = await mailchimpTx.users.ping();
	// console.log(response);

	if (!cloudEvent?.data?.message?.data) {
		console.error('No Pub/Sub message provided!');
		return;
	}

	console.log(JSON.parse(atob(cloudEvent.data.message.data)));
	const userInfo = JSON.parse(atob(cloudEvent.data.message.data));

	let newVerifyUserInfo;

	try {
		const verifyUserInfo = { username: userInfo.username, first_name: userInfo.first_name, last_name: userInfo.last_name };

		await Verify.create(verifyUserInfo);

		newVerifyUserInfo = await Verify.findOne({ where: { username: verifyUserInfo.username } });

		console.log(newVerifyUserInfo);

		console.log('Verify token created.');
		console.log(newVerifyUserInfo);
	} catch (error) {
		console.error('Received error while creating verify token.', error);
		return;
	}

	if (!newVerifyUserInfo?.dataValues?.first_name || !newVerifyUserInfo?.dataValues?.verify_token || !newVerifyUserInfo?.dataValues?.username) {
		console.error('Verify token created unsuccessfully.');
		return;
	}

	const message = {
		from_email: 'hello@qianweiyin.me',
		subject: 'Please Verify Your Email',
		text: `
    Hello ${newVerifyUserInfo.dataValues.first_name},

    Welcome to CSYE6225 | Qianwei Yin!
    To enable your account, confirm this email address by clicking this link: http://qianweiyin.me:3000/v1/user/verify?token=${newVerifyUserInfo.dataValues.verify_token}. Link will expire in 2 minutes.
    `,
		to: [
			{
				email: newVerifyUserInfo.dataValues.username,
				type: 'to',
			},
		],
	};

	try {
		const response = await mailchimpTx.messages.send({
			message,
		});
		console.log(response);
	} catch (error) {
		console.error('Received error while sending email.', error);
	}
});
