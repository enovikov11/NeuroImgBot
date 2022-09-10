from torch import autocast
from diffusers import StableDiffusionPipeline, StableDiffusionImg2ImgPipeline
import requests

txt2img = StableDiffusionPipeline.from_pretrained("CompVis/stable-diffusion-v1-4", use_auth_token=True)
img2img = StableDiffusionImg2ImgPipeline.from_pretrained("CompVis/stable-diffusion-v1-4", use_auth_token=True)

txt2img = txt2img.to("cuda")

with autocast("cuda"):
    image = txt2img(prompt = "cherry", height = 512, width = 512, num_inference_steps = 50, guidance_scale = 7.5).images[0]
    image.save("1230.png")

txt2img = txt2img.to("cpu")
img2img = img2img.to("cuda")

with autocast("cuda"):
    image = img2img(prompt = "peach", init_image = image, strength = 0.025, num_inference_steps = 50, guidance_scale = 7.5).images[0]
    image.save("4560.png")
