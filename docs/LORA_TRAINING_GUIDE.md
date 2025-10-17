Here’s a compact, evidence-based cheat-sheet for training character LoRAs for FLUX (Flux.1-dev / Flux 1.x)—with concrete defaults, rules of thumb, and how the moving parts (steps, epochs, repeats, LR, rank/alpha, schedulers, batch/grad-accum) fit together.

1. The core math (so you can plan runs)

Total training steps ≈ num_images × repeats × epochs ÷ grad_accumulation.
This is the same accounting used by kohya-style trainers (which ComfyUI-FluxTrainer wraps).
GitHub
+1

For character LoRAs on FLUX, community + vendor guidance clusters around ~1,000–3,000 total steps as a productive band for small (10–40 img) datasets, with faster overfitting if you push LR too high.
RunDiffusion
+2
Reddit
+2

2. Baseline recipes by dataset size (character LoRA)

These are starting points that typically avoid overfit while learning identity. Use cosine w/ warmup and watch sample outputs every ~200–300 steps.

Dataset Target steps Example (epochs × repeats) LR (start) LoRA rank/alpha Notes
10–15 imgs 1,200–1,800 8×10 (≈80 repeats/epoch) 3e-4 → 5e-4 max (prefer 2e-4–3e-4 for safety) rank 16–32, alpha ≈ rank/2 Smaller sets burn easily; keep LR modest.
RunDiffusion
+2
GitHub
+2

20–30 imgs 1,500–2,500 6×10 or 5×12 2e-4–4e-4 rank 16–32, alpha ≈ rank/2 Common sweet spot for identity.
Reddit
+1

40–80 imgs 2,000–3,000 5×10 or 4×12 1e-4–3e-4 rank 16–32, alpha ≈ rank/2 Lower LR as data grows to avoid style drift.
Modal

Why these ranges?

Practitioners report good persona/style results ~1–2k steps on FLUX; pushing beyond ~3k with small sets often “burns” features unless LR is very low.
RunDiffusion
+2
Reddit
+2

Higher LR values (1e-3 / 1e-4) can burn within 500–1000 steps on tiny datasets; safer to start lower and rely on schedulers.
GitHub

3. Learning rate, scheduler, optimizer

LR starting point (character): 2e-4–3e-4 (conservative), rarely > 5e-4 unless you have >30 images and regularization/augs in place. Community reports show 8e-4 defaults in some GUIs but note higher burn risk; several guides recommend dialing down.
NextDiffusion
+1

Scheduler: cosine w/ warmup (~20% of steps) is consistently favored over constant_with_warmup for stability and reduced overfit risk on FLUX LoRAs. Example flags: --lr_scheduler cosine --lr_warmup_steps 0.2 --lr_decay_steps 0.8.
GitHub

Warmup: 10–20% of total steps is a sensible band (lets LR ramp gently on small sets).
Medium

Optimizer: AdamW (defaults from kohya/FluxGym stacks are fine). If your stack exposes Adafactor, keep relative_step=False when using explicit LR.
GitHub

4. Rank (dim) & Alpha (strength shaping)

Rank: FLUX vendor docs suggest 16 or 32; 16 is faster/leaner, 32 captures finer identity subtleties. For character LoRAs, 16–32 is the practical range; higher ranks risk background/wardrobe overfit.
docs.bfl.ai
+2
Modal
+2

Alpha: set around rank/2 (e.g., 16/8, 32/16). This maintains usable weight scale and keeps training responsive; alpha too high can mute learning. (Alpha acts like a scaling that interacts with LR; effective strength ≈ alpha/rank.)
GitHub
+2
Aituts
+2

5. Batch size & gradient accumulation

If VRAM is tight, use batch_size=1–2 with grad_accumulation to hit an effective batch of 8–16. Keep the total steps math in mind (Section 1). This is standard practice in kohya-style and ComfyUI-FluxTrainer loops.
GitHub

6. Captions, token, and data prep (character-specific)

Use a unique token (e.g., a rare word/name) consistently in every caption so the LoRA binds identity to that token. BFL’s finetune guide exposes a token/TOK concept for LoRA finetuning.
docs.bfl.ai

Caption content: short, consistent, factual: "<UNIQUE_TOKEN> person, brown eyes, curly hair, beard, medium build". Avoid scene/style words that you want to preserve from base model (let FLUX handle scenes/poses).

Avoid “over-keywording” clothes/expressions unless those are essential; otherwise you’ll lock them in. (A common failure mode: a few images with parted lips or specific smile → the LoRA “bakes it in”.)
Reddit

Resolution: train at 512–768 px short side with random crop/resize (identity survives; composition generalizes). (ComfyUI-FluxTrainer expects standard non-diffusers VAE and fp8/fp16 FLUX weights.)
GitHub

Augmentations: light flips, slight color/contrast jitter help generalize; avoid heavy artistic augs for a character LoRA.

7. Concrete, copy-ready presets

Use these as starting jobs, then adjust by samples/loss:

Preset A (12–20 imgs, conservative)

Steps target: 1,500; LR 2e-4; rank/alpha 16/8

Example plan: epochs=10, repeats=8 → 12–20 imgs × 8 × 10 ≈ 960–1,600 steps (top up to 1.5k via slight repeat bump)

Scheduler: cosine, warmup 0.2.
GitHub

Preset B (20–30 imgs, standard)

Steps target: 2,000; LR 2.5e-4; rank/alpha 32/16

Plan: epochs=6, repeats=10 → 20–30 × 10 × 6 ≈ 1,200–1,800 steps (add one epoch if under 2k).

Scheduler: cosine, warmup 0.2.
RunDiffusion

Preset C (40–60 imgs, gentle)

Steps target: 2,400–3,000; LR 1.5e-4–2e-4; rank/alpha 32/16

Plan: epochs=5, repeats=10 → 40–60 × 10 × 5 ≈ 2,000–3,000 steps.

Scheduler: cosine, warmup 0.2.
GitHub

For all: save checkpoints every 200–300 steps; stop early if identity is stable and negatives appear (burnt lips/teeth, locked clothing). Community reports show identity appearing as early as ~1000–2000 steps on FLUX; beyond that, lower LR or stop.
RunDiffusion
+1

8. Early-stopping & overfit checklist

Signs of burn/overfit: frozen expressions, repeated clothing/background, loss of prompt flexibility. Fixes:

Drop LR by ×0.5–×0.25, switch to cosine warmdown, or stop at the best earlier checkpoint.
GitHub

Reduce repeats/epochs (keep steps ≤ ~2–3k for small sets).
RunDiffusion

Trim outliers (poses/expressions you don’t want copied).
Reddit

9. Tooling realities (ComfyUI / FluxGym / BFL)

ComfyUI-FluxTrainer: requires fp8/fp16 FLUX and non-diffusers VAE (ae.safetensors). It wraps kohya scripts; defaults are not “gold”—tune as above.
GitHub

FluxGym & hosted trainers: often default to higher LRs (e.g., 8e-4) and constant_with_warmup; many practitioners switch to cosine + warmup and lower LR for cleaner convergence.
NextDiffusion
+1

BFL official finetune guide: exposes LoRA rank 16/32 options and a token system for captioning—use a unique token for your character.
docs.bfl.ai

10. Quick reference (TL;DR knobs)

Steps: plan 1–3k depending on data size/quality.
RunDiffusion

LR: start 2e-4–3e-4 (go lower with fewer images).
GitHub
+1

Rank/Alpha: 16–32 / rank/2.
docs.bfl.ai
+1

Scheduler: cosine + warmup ~20%.
GitHub

Repeats/Epochs: just bookkeeping to hit your target steps (see formula).
GitHub

Captions: consistent unique token + stable identity traits; avoid locking poses/clothes unless desired.
docs.bfl.ai
+1

If you want, I can turn this into ready-to-run ComfyUI-FluxTrainer JSONs for your usual dataset sizes (10, 20, 30, 50 images) with the scheduler/LR/rank presets above, plus checkpoint-saving every 250 steps.

⚖️ 4. How to balance repeats vs. epochs

Both repeats and epochs multiply your total steps.
It’s best to only tune one of them and use the other to hit your step target.

Recommended rule of thumb:

Keep repeats = 1–3 per image for most cases.

Adjust epochs to reach your desired total steps.

Example:
Images Repeats Epochs Total Steps Notes
20 1 50 1,000 Conservative — smoother progression
20 2 25 1,000 Equivalent total, faster cycling
20 10 5 1,000 Works too, but makes overfit checkpoints harder to interpret

Rank & Alpha:
Scenario Recommended
Small dataset (10–30 imgs) rank = 16 or 32, alpha = rank/2
Medium dataset (30–60 imgs) rank = 16–32, alpha = rank
Style LoRA rank = 32–64, alpha = rank
You want maximum safety Always fine with alpha = rank/2
You want maximum strength (can overfit) alpha = rank
