const {exec} = require('child_process');

async function runCommand(type) {
    const command = `yc compute instance ${type} stbldffsn-worker --format json`;
    return new Promise((res, rej) => exec(command, {timeout: 5 * 60 * 1000}, (error, stdout) => {
        if (error) {
            rej(error);
        }

        try {
            res(JSON.parse(stdout).status);
        } catch (e) {
            rej(e);
        }
    }));
}

async function startWorker() {
    return await runCommand('start');
}

async function stopWorker() {
    return await runCommand('stop');
}

module.exports = {startWorker, stopWorker};
