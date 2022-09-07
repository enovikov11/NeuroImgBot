const express = require('express'), bodyParser = require('body-parser'), secrets = require('../secrets.json'),
    {sendMessage, setWebhook} = require('./telegram'), {parseRequest} = require('./query'),
    {startWorker, stopWorker} = require('./yandex-cloud'),
    app = express();

app.use(bodyParser.json());

let tasks = [], triggerLongpoll = () => {
}, shutdownTimer = null, workersPromise = Promise.resolve();

const MAX_IDLE = 10 * 60 * 1000, MAX_TASK = 3 * 60 * 1000;

function tasksChanged() {
    const wait = MAX_IDLE + (tasks.length + 1) * MAX_TASK;

    if (shutdownTimer === null) {
        workersPromise.then(startWorker).catch(console.error);
    } else {
        clearTimeout(shutdownTimer);
    }

    shutdownTimer = setTimeout(() => {
        workersPromise.then(stopWorker).catch(console.error);
        shutdownTimer = null;
    }, wait);
}

// Supports only 1 worker
app.post(`/${secrets.SERVER_SECRET}/get-task-longpoll`, async (req, res) => {
    if (tasks.length) {
        res.json(tasks.shift());
        tasksChanged();
        return;
    }

    triggerLongpoll = function () {
        try {
            res.json(null);
        } catch (e) {
        }
    }
});

app.post(`/${secrets.SERVER_SECRET}/tg-callback`, async (req, res) => {
    res.json({ok: true});
    const update = req.body, message = update?.message, chatId = message?.chat?.id,
        request = message?.text || message?.caption, parsedRequest = parseRequest(request);

    try {
        if (!secrets.ALLOWED_GUIDS.includes(chatId)) {
            await sendMessage({chatId, text: `Ask @enovikov11 for access`});
            return;
        }

        if (message?.from?.is_bot || !parsedRequest) {
            return;
        }

        const task = {
            ...parsedRequest,
            chatId
        };

        if (message?.photo) {
            const {file_id: fileId, file_unique_id: fileUniqueId} = message?.photo[message?.photo.length - 1];
            task.requestPhoto = {fileId, fileUniqueId};
        }

        tasks.push(task);
        triggerLongpoll();
        tasksChanged();
    } catch (e) {
        console.error(e);
    }
});

async function main() {
    await setWebhook({url: `${secrets.SERVER_BASE}${secrets.SERVER_SECRET}/tg-callback`, allowed_updates: ['message']});
    app.listen(8000);
}

main().catch(console.error);
