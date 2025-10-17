# 🐛 Fixed: Training Parameters Override Bug

## Problem Discovered

When starting actor training with **max_train_steps = 2000**, the actual training request sent **2,300 steps** instead, ignoring the user's parameter choice.

### **Root Cause:**

**File**: `/ui/src/components/ActorTraining/hooks/useTrainingOperations.ts`  
**Lines**: 201-205 (before fix)

```typescript
// ❌ BUGGY CODE:
const recommendedSteps = Math.max(1000, Math.min(3000, imageCount * 100));
const finalSteps =
  parameters.max_train_steps === 2000
    ? recommendedSteps  // BUG: Overrides user's choice!
    : parameters.max_train_steps;
```

### **What Was Happening:**

1. User sets `max_train_steps = 2000` in the UI
2. Code calculates `recommendedSteps = 23 images × 100 = 2,300`
3. Code checks: `if (parameters.max_train_steps === 2000)`
4. Since it equals 2000, it **replaces** user's choice with `recommendedSteps`
5. Training request sent with **2,300 steps** instead of **2,000**

### **Why This Logic Existed:**

The code assumed **2000 was the "default" value** and should be replaced with a calculated recommendation based on image count. But this broke when users **intentionally chose 2000 steps**!

---

## ✅ Solution Applied

**Removed the faulty override logic** and now **always respects user's parameter choice**:

```typescript
// ✅ FIXED CODE:
// Use the user's chosen parameters directly - don't override!
const finalSteps = parameters.max_train_steps;
```

---

## 📊 Comparison

### **Before Fix:**

| UI Parameter | Calculated | Actual Request | Issue |
|--------------|------------|----------------|-------|
| 2000 steps | 2300 (23×100) | **2300** | ❌ Overridden |
| 1500 steps | 2300 (23×100) | **1500** | ✅ Respected |
| 2500 steps | 2300 (23×100) | **2500** | ✅ Respected |

**Only 2000 was being overridden!**

### **After Fix:**

| UI Parameter | Calculated | Actual Request | Result |
|--------------|------------|----------------|--------|
| 2000 steps | 2300 (23×100) | **2000** | ✅ Respected |
| 1500 steps | 2300 (23×100) | **1500** | ✅ Respected |
| 2500 steps | 2300 (23×100) | **2500** | ✅ Respected |

**All user choices are now respected!**

---

## 🎯 Impact

### **What's Fixed:**

✅ **max_train_steps**: Now uses user's exact choice  
✅ **learning_rate**: Already working correctly  
✅ **network_dim/alpha**: Already working correctly  
✅ **lr_scheduler**: Already working correctly  
✅ **lr_warmup_steps**: Already working correctly  
✅ **num_repeats**: Already working correctly  
✅ **All other parameters**: Already working correctly

### **Expected Behavior Now:**

When you set training parameters in the UI:
- **2000 steps** → Training uses **2000 steps** ✅
- **16 rank/8 alpha** → Training uses **16/8** ✅
- **2.5e-4 LR** → Training uses **0.00025** ✅
- **Cosine scheduler** → Training uses **cosine** ✅
- **400 warmup steps** → Training uses **400** ✅
- **2 repeats** → Training uses **2** ✅

---

## 🔍 How to Verify

After the fix, check `/home/markus/actor_maker/debug/training_request.json`:

**Node 4 (FluxTrainLoop):**
```json
"inputs": {
  "steps": 2000  // ✅ Should match UI
}
```

**Node 107 (InitFluxLoRATraining):**
```json
"inputs": {
  "max_train_steps": 2000,  // ✅ Should match UI
  "learning_rate": 0.00025,  // ✅ Should match UI
  "network_dim": 16,         // ✅ Should match UI
  "network_alpha": 8         // ✅ Should match UI
}
```

**training_config:**
```json
"training_config": {
  "learning_rate": 0.00025,    // ✅ Should match UI
  "max_train_steps": 2000      // ✅ Should match UI
}
```

---

## 📝 Files Modified

- `/ui/src/components/ActorTraining/hooks/useTrainingOperations.ts` - Removed faulty override logic

---

## 🎉 Result

Your training parameters from the UI are now **fully respected** and sent exactly as configured to the training container. No more mysterious overrides!
