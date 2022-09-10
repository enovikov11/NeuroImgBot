const express = require('express'), bodyParser = require('body-parser'), secrets = require('../secrets.json'),
    { sendMessage, setWebhook } = require('./telegram'), { parseRequest } = require('./query'),
    { clearWatchdog, ensureRunning } = require('./yandex-cloud-manager'), app = express();

app.use(bodyParser.json());

let tasks = [], longpollTriggers = [];

app.post(`/${secrets.SERVER_SECRET}/get-task-longpoll`, async (req, res) => {
    if (tasks.length) {
        res.json(tasks.shift());
        clearWatchdog();
        return;
    }

    longpollTriggers.push(() => { try { res.json(null) } catch (e) { } });
});

app.post(`/${secrets.SERVER_SECRET}/tg-callback`, async (req, res) => {
    res.json({ ok: true });
    const update = req.body, message = update?.message, chatId = message?.chat?.id, messageId = message?.message_id,
        request = message?.text || message?.caption, parsedRequest = parseRequest(request);

    console.log(update);

    try {
        if (!secrets.ALLOWED_GUIDS.includes(chatId)) {
            await sendMessage({ chatId, text: `Ask @enovikov11 for access` });
            return;
        }

        if (message?.from?.is_bot || !parsedRequest) {
            return;
        }

        const task = {
            ...parsedRequest,
            chatId,
            messageId
        };

        if (message?.photo) {
            const { file_id: fileId, file_unique_id: fileUniqueId } = message?.photo[message?.photo.length - 1];
            task.requestPhoto = { fileId, fileUniqueId };
        }

        const { message_id: enqueuedMessageId } = await sendMessage({ chatId, replyToMessageid: messageId, disableNotification: true, text: `Enqueued, tasks before: ${tasks.length}` });
        task.enqueuedMessageId = enqueuedMessageId;

        tasks.push(task);
        longpollTriggers.forEach(trigger => trigger());
        ensureRunning();
    } catch (e) {
        console.error(e);
    }
});

async function main() {
    await setWebhook({ url: `${secrets.SERVER_BASE}${secrets.SERVER_SECRET}/tg-callback`, allowed_updates: ['message', 'edited_message'] });
    app.listen(8000);
}

main().catch(console.error);
