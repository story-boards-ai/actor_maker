# LoRA Training Fix - Summary

## Problem Identified

Your style LoRAs were weak because of **massive under-training** caused by incorrect `num_repeats` calculation.

### The Math That Was Wrong:
- **43 images × 10 repeats = 430 virtual images**
- **1720 steps ÷ 430 = 4 steps per image**
- **Guide recommends: 30-60 steps per image**
- **You were training at: 4 steps per image** ❌

This meant the model barely saw each image, resulting in:
- Very faint style transfer
- Photorealism bleeding through
- LoRA not learning the distinctive storyboard aesthetic

---

## Changes Made

### 1. **Default `num_repeats` Changed: 10 → 1**
**File:** `ui/src/components/LoRATrainingTab.tsx`

```typescript
num_repeats: 1, // Changed from 10 - repeats are calculated based on dataset size
```

### 2. **Enhanced Auto-Adjust Parameters Function**
**File:** `ui/src/components/LoRATrainingTab.tsx`

Now properly calculates ALL parameters based on dataset size:

#### Steps Calculation:
```typescript
const TARGET_STEPS_PER_IMAGE = 40;
newParams.num_repeats = 1;
const calculatedSteps = imageCount * TARGET_STEPS_PER_IMAGE;
newParams.max_train_steps = Math.max(500, Math.min(3500, calculatedSteps));
```

#### Learning Rate by Dataset Size:
- **8-15 images:** `0.0001` (safe)
- **20-30 images:** `0.0001` (sweet spot)
- **30-60 images:** `0.0001` (conservative)
- **60+ images:** `0.0001` + warning about style dilution

#### Checkpoint Frequency:
- **2000+ steps:** Save every 500 steps
- **1000-2000 steps:** Save every 250 steps
- **<1000 steps:** Save every 100 steps

#### All Parameters Set:
- Network dim/alpha: 16 (user can override to 32)
- Batch size: 2
- LR scheduler: cosine_with_restarts
- Optimizer: adamw8bit
- Gradient dtype: bf16

### 3. **Fixed Validation Prompts**
**File:** `workflows/lora_training_workflow_headless.json`

Changed from generic prompts to include trigger token:
```json
"portrait of a young woman, STYLE_TOKEN|a young woman walking in New York at night, STYLE_TOKEN|..."
```

**File:** `ui/src/utils/workflowBuilder.ts`

Added logic to replace `STYLE_TOKEN` placeholder with actual trigger token:
```typescript
if (workflow['146']?.inputs?.string && parameters.class_tokens) {
  workflow['146'].inputs.string = workflow['146'].inputs.string.replace(/STYLE_TOKEN/g, parameters.class_tokens);
}
```

### 4. **Fixed Template Defaults**
**File:** `workflows/lora_training_workflow_headless.json`

- `learning_rate`: `0.001` → `0.0001`
- `num_repeats`: `10` → `1`

---

## How to Use

### For 43 Images (Your Current Test):

1. **Select dataset** with 43 images
2. **Click "⚡ Auto-Adjust Parameters"**
3. **Verify settings:**
   - Max Training Steps: **1720** (43 × 40)
   - Num Repeats: **1**
   - Learning Rate: **0.0001**
   - Network Dim: **16**
   - Batch Size: **2**

4. **Result:** 40 steps per image ✅

### Auto-Adjust Now Calculates:

| Images | Steps | Steps/Image | Repeats | LR | Checkpoints Every |
|--------|-------|-------------|---------|-----|-------------------|
| 15 | 600 | 40 | 1 | 0.0001 | 100 steps |
| 30 | 1200 | 40 | 1 | 0.0001 | 250 steps |
| 43 | 1720 | 40 | 1 | 0.0001 | 250 steps |
| 60 | 2400 | 40 | 1 | 0.0001 | 500 steps |
| 100 | 3500* | 35* | 1 | 0.0001 | 500 steps |

*Clamped at 3500 max steps

---

## Expected Results

With these fixes, your LoRAs should now:

✅ **Learn the style properly** (40 steps/image vs 4 steps/image)  
✅ **Show strong style transfer** at 0.7-1.0 strength  
✅ **Maintain prompt-following** (not over-trained)  
✅ **Capture distinctive storyboard aesthetic** instead of photorealism  
✅ **Generate useful validation images** during training (with trigger token)

---

## Testing Recommendations

1. **Retrain your 43-image set** with new settings
2. **Test checkpoints at:** 500, 1000, 1500, 1720 steps
3. **Compare to old LoRA** side-by-side
4. **If style is too strong:** Lower LoRA strength to 0.5-0.7
5. **If style is still weak:** Try increasing to 32 network_dim or 0.0004 LR

---

## Dataset Size Guidance

From the training guide:

- **✅ Sweet Spot: 25-60 images** - Best balance of style strength and prompt-following
- **⚠️ Small: 8-15 images** - Can work if very on-style and high quality
- **⚠️ Large: 60-170 images** - Risk of style dilution/averaging

**Your previous 100-170 image sets were too large.** Consider curating to 30-50 best images.

---

## Next Steps

1. ✅ Code changes complete
2. 🔄 Restart your dev server to load new defaults
3. 🎯 Click "⚡ Auto-Adjust Parameters" for your 43-image set
4. 🚀 Start training and compare results!
