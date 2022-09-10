### Prerequisites
- Telegram bot and group
- Yandex Cloud VMs: light manager VM with static ip, GPU worker VM

### Telegram setup
- Create telegram bot via @BotFather and get API key
- Create group
- Add bot to group
- Make bot admin
- Add @myidbot
- Get group id /getgroupid@myidbot
- Kick @myidbot

### Manger setup
- `sudo apt install git tmux`
- `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash`

### Manager start
- `cd NeuroImgBot`
- `nvm use --lts`

### Worker setup
- `curl -sSL https://storage.yandexcloud.net/yandexcloud-yc/install.sh | bash`
- `wget https://repo.anaconda.com/archive/Anaconda3-2021.11-Linux-x86_64.sh`
- `sudo apt install tmux git libice6 libsm6 libxt6 libxrender1 libfontconfig1 libcups2`
- `conda env create -f environment.yaml`

### Worker start
- `cd NeuroImgBot-worker`
- `conda activate ldm`
- `python scripts/worker.py`
