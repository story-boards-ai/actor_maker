What really matters for a style LoRA

How many images?
There isn’t one “right” number; it’s a trade-off between style strength and prompt-following. Credible ranges from the field:

Very small sets (≈8–15 images) can work for style if quality is high and images are very “on-style.” fal’s Thomas Cole demo used 9 curated, high-res images and got usable style transfer; step count then becomes sensitive (over-train hurts prompt following).
blog.fal.ai

Small–medium sets (≈20–30 images) are a common sweet spot; several practitioners find ~40 steps per image a good target (e.g., 26×40 ≈ 1,040 steps) with LR ≈ 4e-4 for LoRA on Flux.
pelayoarbues.com

Larger sets (50–200+) let you train longer, but if style purity varies or scenes are too diverse, the LoRA can blur/average and lose “snap.” If you push steps high on a small set, you can also lose prompt-following (classic failure mode shown at ~2,000 steps on a tiny set).
blog.fal.ai

Baseline vendor defaults for Flux LoRA start near iterations/steps ≈ 300–1,000 with LR ≈ 1e-4 for LoRA (10× higher than full-finetune). These are sane starting points.
docs.bfl.ai

My rule of thumb for style LoRA:
Start with 25–60 highly on-style images (no compression, 1:1 or bucketed), then target ~30–60 steps per image. That gives a 750–3,600 total-step window. Save checkpoints every 250–500 steps and pick the best. Scale up once you see what over/under-training looks like on your style. (fal shows why: 500 vs 1000 vs 2000 steps behave very differently.)
blog.fal.ai

Captioning (quick recap)

For style LoRA, put your unique trigger token in every caption, and describe the scene/objects, not the style descriptors (let the LoRA encode style). If you need stronger prompt-following on long prompts, one successful trick is duplicating images: half with long, content-rich captions + “…in the style of <token>”, half with just the token—then train longer without entangling style with scene.
blog.fal.ai

Parameters: map to your exact workflow

You pasted a ComfyUI/Kijai Flux-LoRA graph. Here’s what to adjust, with best-practice ranges and the “why,” tied to sources where possible.

Dataset nodes

TrainDatasetAdd (node 109)

width/height: 512×512 is fine when enable_bucket: true; you can keep buckets 256–1024 to cover variety. High-quality 1:1 inputs (or clean crops) are commonly recommended, though some debate the “must be square” claim; buckets are a practical answer.
finetuners.ai

batch_size: 1–2 for 24–48 GB GPUs; 2 is okay if VRAM fits.

num_repeats: Think of repeats as per-epoch exposure. With max_train_steps controlling the true budget, repeats mainly alter how often examples recycle; you can leave 10 or drop to 1–3 and control exposure via steps. (Checkpoint early/often either way.)

class_tokens: put your STYLE_TOKEN here so it’s prepended to captions (and keep it in the .txt too if you want double reinforcement). fal/BFL docs both rely on a trigger token.
blog.fal.ai
+1

TrainDatasetGeneralConfig (node 108)

flip_aug: Off for styles with directional text/graphics; okay to enable for painterly styles.

color_aug: Usually off for style preservation.

caption_dropout_rate: Keep 0–0.1. (Small dropout can improve robustness if your captions vary.) Pelayo used 0.1 successfully.
pelayoarbues.com

Init & Loop

InitFluxLoRATraining (node 107)

network_dim: 16–32 are the most cited sweet spots for Flux LoRA; BFL’s lora_rank default 32 and guidance to choose 16 or 32 aligns. Start 16 for compactness; go 32 if the style is complex. Keep network_alpha = network_dim.
docs.bfl.ai

learning_rate: Real-world wins cluster around 1e-4 to 4e-4 for LoRA on Flux. BFL lists 1e-4 default for LoRA; Pelayo had success at 4e-4 on ~1k steps. Your current 1e-3 is high—tends to “burn” style or wobble. Suggested start: 1e-4 (safer), or 4e-4 if you’re targeting fewer steps.
docs.bfl.ai
+1

max_train_steps: Set this to your planned total steps (see recipe below). Your Loop is also set to 1000; match the two so you don’t silently cap early.

optimizer_settings (node 95):

optimizer_type: adamw8bit is fine and popular. If you’re extremely VRAM-bound, Adafactor is also used in Flux LoRA stacks.
RunComfy

lr_scheduler: cosine or cosine_with_restarts both work; restarts can help escape plateaus during longer runs.

lr_warmup_steps: 0–100; keep 0 unless you see early spikes.

max_grad_norm: 1.0 is standard.

train_text_encoder, clip_l_lr, T5_lr: Keep encoders frozen (disabled, 0 lr). Most style LoRAs stick to transformer LoRA only; Pelayo even narrowed to selected DiT blocks.
pelayoarbues.com

gradient_dtype: bf16 is widely used for Flux training; good.

fp8_base: OK if your stack supports it; several practitioners experiment with FP8 to save memory. (Community posts show hacky FP8 paths; treat as optional.)
X (formerly Twitter)

attention_mode: sdpa is fine on PyTorch 2.x.

Weighting & timesteps

weighting_scheme: logit_normal, timestep_sampling: shift, mode_scale: ~1.29, sigmoid_scale: 1, model_prediction_type: raw: these are the common Flux-trainer defaults that align with rectified-flow training. Keep them unless you’re doing controlled ablations.

Min-SNR Gamma (min_snr_gamma: 5 in node 95): Be aware of Flux caveats. In several toolchains this has no effect (stubbed for Flux) or is considered not appropriate for rectified-flow schedulers. Don’t expect it to help; feel free to set 0 / disable until your trainer actually wires it for Flux.
GitHub
+1

FluxTrainLoop (node 4)

You’ve set steps: 1000. That’s a single chunk. It’s good practice to train in 250–500-step chunks, saving after each chunk (your FluxTrainSave can handle this) so you can A/B checkpoints and bail before over-baking. fal explicitly shows different behavior at 500/1000/2000.
blog.fal.ai

Validation (node 37)

guidance_scale: 3–3.5 matches common inference guidance for Flux LoRAs trained with guidance 1.0. (HF discussion confirms 3.5 is around baseline.) Your 3.0 is fine.
Hugging Face Forums

width/height: validate near your deployment size (e.g., 1024² if that’s your target).

timestep_sampling: shift, base_shift/max_shift: leave as you have unless you’re explicitly studying schedule effects.

Step & image recipes (pick one and iterate)

Recipe A (small, sharp dataset):

Images: 24–36

LR: 1e-4 (safer) or 4e-4 (fewer steps)

net_dim/alpha: 16 (or 32 if complex style)

Total steps: start at 1,000–1,500; save every 250–300; compare 500 vs 1,000 vs 1,500 checkpoints for prompt-following vs style strength. (fal’s finding: >~1500–2000 on tiny sets can hurt prompt-following.)
blog.fal.ai

Recipe B (medium dataset):

Images: 50–80 curated, consistent style

LR: 1e-4

net_dim/alpha: 16–32

Total steps: 2,000–3,500 (≈30–45 steps/image). Save every 500.

Use the “dup long+short captions” trick if you need both strong style and long-prompt compliance.
blog.fal.ai

Recipe C (you insist on ~300 images):

Recognize the risk: big, varied sets can dilute style.

Cull to the most on-style 80–150 first if possible. If you truly use 300, keep scene diversity but style-consistent.

LR: 1e-4; net_dim: 32

Total steps: 6,000–12,000 (≈20–40 steps/image). Save frequent checkpoints (every 500–750) and select by validation prompts.

Caption each image (scene/objects only) + include the STYLE_TOKEN.

Concrete edits for your JSON (safe starting point)

Node 107 (InitFluxLoRATraining)

network_dim: 16 (or 32 if style is complex)

network_alpha: same as network_dim

learning_rate: 0.0001 (start safe; try 0.0004 later)
docs.bfl.ai
+1

max_train_steps: 1500 (for a first pass on ~25–40 imgs)

Keep encoders frozen (train_text_encoder: disabled, lr 0)
pelayoarbues.com

Leave timestep/weighting defaults as-is

Node 4 (FluxTrainLoop): change steps: 500 and repeat the loop 2–3 times with saves; pick best checkpoint.
blog.fal.ai

Node 95 (OptimizerConfig)

Keep adamw8bit, max_grad_norm: 1, lr_scheduler: cosine_with_restarts, lr_warmup_steps: 0

Set min_snr_gamma: 0 (Flux trainers often no-op this; don’t rely on it)
GitHub
+1

Node 109 (TrainDatasetAdd)

Keep enable_bucket: true, min_bucket_reso: 256, max_bucket_reso: 1024, batch_size: 1–2

Ensure every image has a .txt caption with your STYLE_TOKEN; keep style adjectives out of captions.
blog.fal.ai

Node 37 (Validation)

Keep guidance_scale: 3 (you can also test 3.5).
Hugging Face Forums

Quick cross-source harmonization (why these picks)

Steps & images: fal’s controlled step tests (500/1000/2000) show the prompt-following loss when over-trained on tiny datasets; Pelayo’s ~40 steps/image rule and LR 4e-4 worked on 25–27 images; BFL defaults anchor LR 1e-4 for LoRA with ~300 iterations minimum and advise scaling iterations with concept complexity. Put together: pick your dataset size first, then target 30–60 steps/image and adjust LR in the 1e-4–4e-4 band.
blog.fal.ai
+2
pelayoarbues.com
+2

Rank/dim: BFL’s doc explicitly recommends 16 or 32 LoRA rank for Flux finetunes—exactly the range practitioners use.
docs.bfl.ai

Captioning: fal shows the long+short caption duplication trick to separate style from content, matching what we discussed earlier.
blog.fal.ai

Guidance at inference: HF discussion suggests ~3.5 nominal guidance for Flux models trained with guidance 1.0; your validation at 3 aligns.
Hugging Face Forums

Min-SNR: multiple maintainers/users note it’s either not wired or not intended for Flux’s rectified-flow setup in common repos; don’t count on it.
GitHub
+1
