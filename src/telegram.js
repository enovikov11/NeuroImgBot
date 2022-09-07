const fetch = require('node-fetch'), {createReadStream} = require('fs'),
    FormData = require('form-data'), {execSync} = require('child_process'),
    secrets = require('../secrets.json');
const botBase = `https://api.telegram.org/bot${secrets.TELEGRAM_API_KEY}/`;
const downloadBase = `https://api.telegram.org/file/bot${secrets.TELEGRAM_API_KEY}/`;

async function apiRaw({method, body, headers}) {
    await new Promise(res => setTimeout(res, 100));

    const {result, ok, error} = await fetch(`${botBase}${method}`, {
        method: 'POST', body, headers, timeout: 60000, redirect: 'error'
    }).then(res => res.json());

    if (!ok) {
        throw new Error(JSON.stringify({method, data, result, error}));
    }

    return result;
}

async function api(method, data) {
    return await apiRaw({
        method,
        body: JSON.stringify(data),
        headers: {'Content-Type': 'application/json'}
    });
}

async function sendMessage({text, chatId, replyToMessageid}) {
    return await api('sendMessage', {chat_id: chatId, text, reply_to_message_id: replyToMessageid});
}

async function setWebhook({url, allowedUpdates}) {
    return await api('setWebhook', {url, allowed_updates: allowedUpdates});
}

async function sendPhotosChained({photos, chatId, replyToMessageid}) {
    const body = new FormData();

    body.append('chat_id', chatId);
    body.append('reply_to_message_id', replyToMessageid);

    const media = [];

    for (let i = 0; i < photos.length; i++) {
        const photo = photos[i], id = `photo${i}`;
        media.push({type: 'photo', media: `attach://${id}`});
        body.append(id, createReadStream(photo));
    }

    body.append('media', JSON.stringify(media));

    return await apiRaw({method: 'sendMediaGroup', body, headers: body.getHeaders()});
}

async function downloadPhoto(photo, path) {
    const {file_id, file_unique_id} = photo[photo.length - 1];
    const result = await api('getFile', {file_id, file_unique_id});

    if (result?.file_path) {
        execSync(`rm ${path} || true`);
        execSync(`curl ${downloadBase}${result?.file_path} > ${path}`);
    }
}

module.exports = {api, sendMessage, setWebhook, sendPhotosChained};
