const axios = require('axios');
const createApp = require('ringcentral-chatbot/dist/apps').default;
const { Bot } = require('ringcentral-chatbot/dist/models');
const { Glossary } = require('./glossaryModel');
const { Template } = require('adaptivecards-templating');

const helpMessage = 'Commands:\n- **get <glossary name>**: Get glossary by name(case-sensitive)\n- **add**: Add glossary\n- **help**: Show help info';
const textCardTemplate = require('./textCard.json');
const getCardTemplate = require('./getCard.json');
const addCardTemplate = require('./addCard.json');

let tempCardId;

const handle = async event => {
    switch (event.type) {
        case 'Message4Bot':
            await handleMessage4Bot(event)
            break
        default:
            break
    }
}

const handleMessage4Bot = async event => {
    const { text, group, bot } = event;
    const commandParts = text.split(' ');
    const commandRoot = commandParts[0];
    switch (commandRoot.toLowerCase()) {
        case 'help':
            await bot.sendMessage(group.id, { text: helpMessage });
            break;
        case 'get':
            const commandObject = commandParts[1];
            const glossary = await Glossary.findOne({ where: { name: commandObject } });
            if (glossary != null) {
                const getCardData = {
                    name: glossary.name,
                    description: glossary.description,
                    reference: glossary.reference
                }
                await SendGetCard(getCardData, bot, group.id);
            }
            else {
                const textCardData = {
                    title: "Glossary Not Found",
                    text: `**${commandObject}** not found. Please use **add** command to add a new glossary.`
                }
                await SendTextCard(textCardData, bot, group.id);
            }
            break
        case 'add':
            const cardData = {
                botId: bot.id,
                groupId: group.id
            }
            const cardResponse = await SendAddCard(cardData, bot, group.id);
            tempCardId = cardResponse.id;
            console.log(`temp card id ${tempCardId}`);
            break
        default:
            await bot.sendMessage(group.id, { text: helpMessage });
            break;
    }
}

async function SendTextCard(cardData, bot, groupId) {
    const template = new Template(textCardTemplate);
    const card = template.expand({
        $root: cardData
    });
    await bot.sendAdaptiveCard(groupId, card);
}
async function SendGetCard(cardData, bot, groupId) {
    const template = new Template(getCardTemplate);
    const card = template.expand({
        $root: cardData
    });
    await bot.sendAdaptiveCard(groupId, card);
}
async function SendAddCard(cardData, bot, groupId) {
    const template = new Template(addCardTemplate);
    const card = template.expand({
        $root: cardData
    });
    const response = await bot.sendAdaptiveCard(groupId, card);
    return response;
}

const app = createApp(handle);
app.listen(process.env.RINGCENTRAL_CHATBOT_EXPRESS_PORT)

app.post('/interactive-messages', async (req, res) => {
    try {
        const submitData = req.body.data;
        console.log(submitData);
        const bot = await Bot.findByPk(submitData.botId);
        const glossary = await Glossary.findOne({ where: { name: submitData.name } });
        if (glossary) {
            const existTextCardData = {
                title: 'Glossary Exist',
                text: 'Your submission is added to a review list. Glossary will be updated if review passes.'
            }
            await updateTextCard(existTextCardData, bot, tempCardId);
        }
        else {
            await Glossary.create({
                name: submitData.name,
                description: submitData.description,
                reference: submitData.reference ?? ''
            });
            const newAddedTextCardData = {
                title: 'New Glossary Added',
                text: `${submitData.name} has been added to the glossary database.`
            }
            await updateTextCard(newAddedTextCardData, bot, tempCardId);
        }
    }
    catch (e) {
        console.log(e)
    }
    res.status(200);
    res.json('OK');
});

async function updateTextCard(cardData, bot, cardId) {
    const config = {
        headers: {
            Authorization: `Bearer ${bot.token.access_token}`
        }
    };

    const template = new Template(textCardTemplate);
    const card = template.expand({
        $root: cardData
    });

    await axios.put(
        `${process.env.RINGCENTRAL_SERVER}/restapi/v1.0/glip/adaptive-cards/${cardId}`,
        card,
        config);
}