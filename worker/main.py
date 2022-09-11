from torch import autocast
from diffusers import StableDiffusionPipeline, StableDiffusionImg2ImgPipeline
import requests
import json
from io import BytesIO
from PIL import Image
import time
import os


with open('./secrets.json') as secrets_file:
    secrets = json.load(secrets_file)

txt2img = None
img2img = None

def telegram(method, data = None, files = None):
    response = requests.post(f"https://api.telegram.org/bot{secrets['TELEGRAM_API_KEY']}/{method}", data = data, files = files)
    return json.loads(response.text)['result']

def delete_message(chat_id, message_id):
    telegram("deleteMessage", {'chat_id': chat_id, 'message_id': message_id})

def send_message(chat_id, text, reply_to_message_id):
    result_json = telegram("sendMessage", {'chat_id': chat_id, 'text': text, 'reply_to_message_id': reply_to_message_id, 'disable_notification': True})
    return result_json['message_id']

def send_photos(chat_id, images, caption, reply_to_message_id):
    if len(images) == 1:
        telegram("sendPhoto", {'chat_id': chat_id, 'caption': caption, 'reply_to_message_id': reply_to_message_id}, {'photo': ('image.png', images[0], 'image/png')})
    else:
        media = []
        files = {}
        for i in range(len(images)):
            files["photo" + str(i)] = ('image' + str(i) + '.png', images[i], 'image/png')

            media_item = {'type': 'photo', 'media': "attach://photo" + str(i)}

            if i == 0:
                media_item['caption'] = caption

            media.append(media_item)
        
        telegram("sendMediaGroup", {'chat_id': chat_id, 'reply_to_message_id': reply_to_message_id, 'media': json.dumps(media)}, files)

def get_photo(file_id, file_unique_id):
    file_json = telegram("getFile", {'file_id': file_id, 'file_unique_id': file_unique_id})
    file_body = requests.get(f"https://api.telegram.org/file/bot{secrets['TELEGRAM_API_KEY']}/{file_json['file_path']}")
    return Image.open(BytesIO(file_body.content))

def process(text):
    print(text)
    global txt2img
    global img2img

    task = json.loads(text)
    if task is None:
        return
    
    is_image = "requestPhoto" in task

    if is_image:
        if not img2img:
            img2img = StableDiffusionImg2ImgPipeline.from_pretrained("CompVis/stable-diffusion-v1-4", use_auth_token=True)
    else:
        if not txt2img:
            txt2img = StableDiffusionPipeline.from_pretrained("CompVis/stable-diffusion-v1-4", use_auth_token=True)

    delete_message(task["chatId"], task["enqueuedMessageId"])
    processing_message = send_message(task["chatId"], 'Processing', task["messageId"])

    if txt2img:
        txt2img.to("cpu" if is_image else "cuda")
    
    if img2img:
        img2img.to("cuda" if is_image else "cpu")

    images = []

    with autocast("cuda"):
        for i in range(task["count"]):
            if is_image:
                init_image = get_photo(task["requestPhoto"]["fileId"], task["requestPhoto"]["fileUniqueId"])
                image = img2img(prompt = task["request"], init_image = init_image, strength = task["strength"], num_inference_steps = task["steps"], guidance_scale = task["scale"]).images[0]
            else:
                image = txt2img(prompt = task["request"], num_inference_steps = task["steps"], guidance_scale = task["scale"]).images[0]
            
            byte_io = BytesIO()
            image.save(byte_io, 'png')
            byte_io.seek(0)
            images.append(byte_io)

    send_photos(chat_id = task["chatId"], images = images, caption = task["origRequest"], reply_to_message_id = task["messageId"])    
    delete_message(task["chatId"], processing_message)

os.system(f"sshfs -o reconnect {secrets['HOST']}:/home/enovikov11/models-ramdisk /home/enovikov11/.cache/huggingface/diffusers")

while True:
    response = requests.post(f"{secrets['SERVER_BASE']}{secrets['SERVER_SECRET']}/get-task-longpoll")
    if response.status_code == 200:
        process(response.text)
    else:
        requests.post(f"{secrets['SERVER_BASE']}{secrets['SERVER_SECRET']}/notify-stopped")
        os.system("sudo shutdown now -h")
