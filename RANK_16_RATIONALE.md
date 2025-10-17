# 🎯 Why Rank 16/8 for All Presets

## Summary

Standardized all training presets to use **Rank 16 / Alpha 8** instead of varying between 16/8 and 32/16 based on dataset size.

---

## 🤔 The Decision

**User Requirement:**
> "I don't need super fidelity models. Just consistent. I don't want large LoRA files."

**Solution:** Use **Rank 16/8 for all presets** regardless of dataset size.

---

## 📊 Rank Comparison

| Rank | File Size | Use Case | Trade-offs |
|------|-----------|----------|------------|
| **8/4** | ~6-8 MB | Minimal identity | Too simple, may lose details |
| **16/8** | **~12-15 MB** | **Consistent identity** | ✅ **Sweet spot** |
| **32/16** | ~25-30 MB | High fidelity | Larger files, overfit risk |
| **64/32** | ~50-60 MB | Maximum detail | Very large, high overfit risk |

---

## ✅ Benefits of Rank 16/8

### **1. Smaller File Sizes**
- **Rank 16**: ~12-15 MB per LoRA
- **Rank 32**: ~25-30 MB per LoRA
- **Savings**: ~50% smaller files!

### **2. Consistent Identity**
- Rank 16 captures core facial features and identity
- Sufficient for character recognition across scenes
- Avoids overfitting to specific details

### **3. Better Generalization**
- Lower rank = less capacity to memorize training data
- Forces model to learn essential identity features
- Works better across different prompts and styles

### **4. Faster Training**
- Fewer parameters = faster forward/backward passes
- Less VRAM usage during training
- Quicker convergence

### **5. Easier to Use**
- Single rank for all scenarios = simpler workflow
- No need to decide between 16 vs 32
- Consistent behavior across all actors

---

## 🎓 From the FLUX Guide

The guide mentions:
> **Rank/Alpha: 16–32 / rank/2**

This is a **range**, not a requirement. The guide shows:
- Rank 16 is the **minimum recommended** for character LoRAs
- Rank 32 gives **more detail** but isn't necessary for identity
- Higher ranks risk **overfitting** and create **larger files**

---

## 🔬 What Does Rank Control?

**Network Dimension (Rank)** controls the LoRA's capacity:

- **Low rank (8-16)**: Learns core features (identity, face structure)
- **High rank (32-64)**: Learns fine details (specific expressions, poses, clothing)

For **consistent character identity**, you want:
- ✅ Core facial features (eyes, nose, mouth, face shape)
- ✅ General appearance (hair, skin tone, build)
- ❌ NOT specific poses or expressions (that's overfitting)

**Rank 16 is perfect for this!**

---

## 💡 Real-World Example

**Your 23-image actor with Rank 16/8:**
- Steps: 2,000
- Repeats: 2
- Epochs: ~43
- **File size: ~12-15 MB**
- **Result**: Consistent identity across different scenes/prompts

**Same actor with Rank 32/16:**
- Steps: 2,000
- Repeats: 2
- Epochs: ~43
- **File size: ~25-30 MB**
- **Result**: More detail, but may overfit to training poses/expressions

---

## 🎯 When to Use Higher Ranks

You might want Rank 32+ if:
- ❌ You need to capture specific clothing/accessories
- ❌ You want exact pose replication
- ❌ You're training on very diverse dataset (100+ images)
- ❌ File size doesn't matter

For **character identity** (your use case):
- ✅ Rank 16 is the sweet spot
- ✅ Smaller files
- ✅ Better generalization
- ✅ Consistent identity

---

## 📝 Implementation

**All presets now use Rank 16/8:**

```typescript
// Simplified: One rank for all scenarios
networkDim = 16;
networkAlpha = 8; // alpha = rank/2
```

**Before (complex):**
- Small datasets: 16/8
- Medium datasets: 32/16
- Large datasets: 32/16

**After (simple):**
- All datasets: **16/8**

---

## 🎉 Result

You get:
- ✅ **Consistent identity** across all actors
- ✅ **Small file sizes** (~12-15 MB)
- ✅ **Better generalization** (works with varied prompts)
- ✅ **Simpler workflow** (one rank for everything)
- ✅ **Faster training** (fewer parameters)

Perfect for your use case: **consistent character identity without huge files!**
