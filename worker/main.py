from torch import autocast
from diffusers import StableDiffusionPipeline, StableDiffusionImg2ImgPipeline
import requests
import json
from io import BytesIO


with open('./secrets.json') as secrets_file:
    secrets = json.load(secrets_file)

txt2img = StableDiffusionPipeline.from_pretrained("CompVis/stable-diffusion-v1-4", use_auth_token=True)
# img2img = StableDiffusionImg2ImgPipeline.from_pretrained("CompVis/stable-diffusion-v1-4", use_auth_token=True)

def telegram(method, data = None, files = None):
    requests.post(f"https://api.telegram.org/bot{secrets['TELEGRAM_API_KEY']}/{method}", data = data, files = files)

def delete_message(chat_id, message_id):
    telegram("deleteMessage", {'chat_id': chat_id, 'message_id': message_id})

# def send_photo(chat_id, )

def process(text):
    print(text)
    global txt2img

    task = json.loads(text)
    if task is None:
        return
    
    is_image = "requestPhoto" in task

    txt2img.to("cpu" if is_image else "cuda")
    # img2img = img2img.to("cuda" if is_image else "cpu")

    images = []

    with autocast("cuda"):
        for i in range(task["count"]):
            if is_image:
                pass
                # download image
                # image = img2img(prompt = "peach", init_image = image, strength = 0.025, num_inference_steps = 50, guidance_scale = 7.5).images[0]
            else:
                byte_io = BytesIO()

                image = txt2img(prompt = task["request"], num_inference_steps = task["steps"], guidance_scale = task["scale"]).images[0]

                image.save(byte_io, 'jpg')
                byte_io.seek(0)
                images.append(byte_io)
    


    # for image in images:
        
    
    delete_message(task["chatId"], task["enqueuedMessageId"])

while True:
    process(requests.post(f"{secrets['SERVER_BASE']}{secrets['SERVER_SECRET']}/get-task-longpoll").text)

