# ✅ Repeats/Epochs Balance Implementation

## Summary

Updated the training parameter calculations to follow the **FLUX LoRA Training Guide's recommendation** on balancing repeats vs epochs:

> **"Keep repeats = 1–3 per image for most cases. Adjust epochs to reach your desired total steps."**

---

## 🔄 What Changed

### **Before (Old Approach)**
- **Small datasets**: repeats = 8-10
- **Medium datasets**: repeats = 10
- **Large datasets**: repeats = 8-10
- **Problem**: High repeats make overfit checkpoints harder to interpret

### **After (Guide-Based Approach)**
- **Small datasets (≤15 imgs)**: repeats = **2** (conservative, smoother progression)
- **Medium datasets (16-30 imgs)**: repeats = **2** (balanced, standard)
- **Large datasets (31-60 imgs)**: repeats = **1** (minimal, avoid overfit)
- **Very large (60+ imgs)**: repeats = **1** (minimal repetition)
- **Benefit**: Cleaner training progression, easier to identify overfit points

---

## 📐 The Formula

```
total_steps = images × repeats × epochs
```

Therefore:
```
epochs = total_steps / (images × repeats)
```

### **Example: 23 Images, Preset B**
- **Target Steps**: 2,000
- **Repeats**: 2
- **Calculated Epochs**: 2,000 / (23 × 2) = **~43 epochs**

This gives you:
- 23 images × 2 repeats = 46 iterations per epoch
- 46 iterations × 43 epochs = 1,978 total iterations
- Each iteration processes 1 image (batch_size=1)
- Total training steps: ~2,000 ✅

---

## 🎯 Why This Matters

### **1. Cleaner Training Progression**
- **Low repeats (1-3)**: Each epoch cycles through dataset fewer times
- **More epochs**: Smoother learning curve, easier to spot when model starts overfitting
- **Better checkpointing**: Can save every N epochs and see clear progression

### **2. Easier Overfit Detection**
From the guide:
> "20 images × 10 repeats × 5 epochs = 1,000 steps works too, but makes overfit checkpoints harder to interpret"

With repeats=10, you only get 5 epochs total. Hard to see when overfitting starts.

With repeats=2, you get ~43 epochs. Much easier to identify the sweet spot!

### **3. Follows Best Practices**
The guide explicitly recommends:
- ✅ Keep repeats = 1-3
- ✅ Adjust epochs to hit target steps
- ✅ Conservative (repeats=2) for smoother progression
- ✅ Minimal (repeats=1) for large datasets to avoid overfit

---

## 🔧 Implementation Details

### **Files Modified**

1. **`calculations.ts`**
   - Changed repeats from 8-10 to 1-3 based on dataset size
   - Added formula comments explaining epochs calculation
   - Small datasets: repeats=2 (smoother)
   - Large datasets: repeats=1 (avoid overfit)

2. **`useTrainingState.ts`**
   - Updated default repeats from 10 to 2
   - Matches Preset B (medium dataset default)

3. **`ParametersForm.tsx`**
   - Added hint: "Keep 1-3 (epochs adjust to hit target steps)"
   - Educates users on the guide's recommendation

4. **`TRAINING_PARAMETERS_UPDATE.md`**
   - Updated all preset documentation
   - Added comparison table showing repeats change
   - Added epochs examples for each preset

---

## 📊 Preset Summary

| Preset | Images | Steps | LR | Rank/Alpha | **Repeats** | **Epochs (example)** |
|--------|--------|-------|-----|-----------|-------------|---------------------|
| **A** | ≤15 | 1,500 | 2e-4 | 16/8 | **2** | ~50 (15 imgs) |
| **B** | 16-30 | 2,000 | 2.5e-4 | 32/16 | **2** | ~43 (23 imgs) |
| **C** | 31-60 | 2,500 | 1.5e-4 | 32/16 | **1** | ~50 (50 imgs) |
| **Custom** | 60+ | 3,000 | 1e-4 | 32/16 | **1** | ~40 (75 imgs) |

---

## ✅ Benefits

1. **Smoother Training**: More epochs = cleaner learning curve
2. **Better Checkpointing**: Easier to identify optimal stopping point
3. **Overfit Detection**: Clear progression makes overfit obvious
4. **Guide Compliance**: Follows FLUX LoRA Training Guide best practices
5. **Automatic**: All calculated automatically based on image count

---

## 🎓 User Experience

When you select an actor with 23 training images:

**Auto-filled parameters:**
- Max Training Steps: **2,000** ✅
- Num Repeats: **2** ✅
- Learning Rate: **0.00025** (2.5e-4)
- Network Dim/Alpha: **32/16**
- Scheduler: **Cosine** with 400 warmup steps

**Backend calculates:**
- Epochs: 2,000 / (23 × 2) = **~43 epochs**
- Total iterations: 23 × 2 × 43 = **1,978 steps**

**Result:** Optimal training parameters following the guide's evidence-based recommendations! 🎯
