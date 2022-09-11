import time
import os
import json


with open('./secrets.json') as secrets_file:
    secrets = json.load(secrets_file)

print("Script started " + str(time.time()))
os.system("git pull")
print("Git pulled " + str(time.time()))
os.system(f"sshfs -o reconnect {secrets['HOST']}:/home/enovikov11/models-ramdisk /home/enovikov11/.cache/huggingface/diffusers")
print("sshfs mounted " + str(time.time()))
os.system("/home/enovikov11/anaconda3/envs/neuroimgbot/bin/python3.8 /home/enovikov11/NeuroImgBot/worker/runner.py")

