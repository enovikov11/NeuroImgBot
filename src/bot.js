const express = require('express'), bodyParser = require('body-parser'),
    secrets = require('../secrets.json'),
    {api, sendMessage, setWebhook, sendPhotosChained} = require('./telegram'),
    {parseRequest} = require('./query'),
    app = express();

app.use(bodyParser.json());

app.post(`/${secrets.SERVER_SECRET}/tg-callback`, async (req, res) => {
    res.json({ok: true});
    const update = req.body, message = update?.message, chatId = message?.chat?.id,
        request = message?.text || message?.caption, replyToMessageid = message?.message_id,
        parsedRequest = parseRequest(request);

    try {
        if (!secrets.ALLOWED_GUIDS.includes(chatId)) {
            await sendMessage({chatId, text: `Ask @enovikov11 for access`});
            return;
        }

        if (message?.from?.is_bot || !parsedRequest) {
            return;
        }

        const stubPhotos = await sendPhotosChained({
            photos: new Array(parsedRequest.count).fill('./preloader.jpg'),
            chatId,
            replyToMessageid
        });

        const task = {
            ...parsedRequest,
            chatId,
            stubPhotoMessages: stubPhotos.map(message => message.message_id)
        };

        if (message?.photo) {
            const {file_id: fileId, file_unique_id: fileUniqueId} = message?.photo[message?.photo.length - 1];
            task.requestPhoto = {fileId, fileUniqueId};
        }

        console.log(task);
    } catch (e) {
        console.error(e);
    }
});

async function main() {
    await setWebhook({url: `${secrets.SERVER_BASE}${secrets.SERVER_SECRET}/tg-callback`, allowed_updates: ['message']});
    app.listen(8000);
}

main().catch(console.error);
