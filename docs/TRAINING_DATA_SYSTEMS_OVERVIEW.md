# Training Data Generation Systems Overview

The actor_maker repository now includes **two complete training data generation systems** ported from the backend:

## 1. Actor Training Data Generation ⭐ **PRIMARY FOR ACTORS**

**Purpose**: Generate training data for character/actor LoRA models with identity preservation

**File**: `src/actor_training_data_generator.py`

### Key Features:
- **12 cinematic training images** from a single portrait
- **Composition**: 2 photorealistic + 6 B/W stylized + 4 color stylized
- **Aspect Ratio**: 16:9 (cinematic)
- **Prompts**: Action scenes, varied lighting, multiple angles
- **Actor Types**: Human, creature, robotic, anthropomorphic, mythical

### Prompt Examples:
```python
# Photorealistic
"The man runs across a rain-slick street at night, mid-stride, 
lit by car headlights from the side..."

# B/W Stylized
"A black-and-white pen and ink line drawing of the woman 
tying their bootlaces on a townhouse stoop..."

# Color Stylized
"A dynamic comic book illustration of the creature leaping 
a narrow rooftop gap at night..."
```

### Usage:
```python
from src.actor_training_data_generator import ActorTrainingDataGenerator

generator = ActorTrainingDataGenerator()
result = generator.generate_training_data(
    portrait_url="https://portrait.jpg",
    user_id="user_123",
    actor_id="actor_456",
    actor_type="human",
    actor_sex="male"
)
# Returns 12 training images
```

### Documentation:
- `docs/ACTOR_TRAINING_DATA_GENERATION.md` - Complete guide
- `examples/generate_actor_training_data_example.py` - Working example

---

## 2. Style Training Data Generation

**Purpose**: Generate training data for artistic style LoRA models

**File**: `src/training_data_generator.py`

### Key Features:
- **20 diverse training images** from a single source image
- **Method**: 3x3 tile grids with GPT Vision analysis
- **Aspect Ratio**: 1:1 (square)
- **Prompts**: Generic subjects (people, landscapes, objects, architecture)
- **Smart Rotation**: 63 descriptions across 7 categories

### Prompt Examples:
```python
# Generic tile descriptions
"a portrait of a person in this artistic style"
"a landscape or outdoor scene in this artistic style"
"an architectural structure in this artistic style"
"an animal or creature in this artistic style"
```

### Usage:
```python
from src.training_data_generator import TrainingDataGenerator

generator = TrainingDataGenerator()
result = generator.generate_training_data(
    source_image_url="https://style-example.jpg",
    user_id="user_123",
    actor_id="style_456"  # Can be used for styles too
)
# Returns 20 training images
```

### Documentation:
- `docs/TRAINING_DATA_GENERATION.md` - Complete guide
- `examples/generate_training_data_example.py` - Working example

---

## Comparison

| Feature | Actor Training | Style Training |
|---------|---------------|----------------|
| **Purpose** | Character identity | Artistic style |
| **Images** | 12 | 20 |
| **Aspect Ratio** | 16:9 (cinematic) | 1:1 (square) |
| **Prompts** | Cinematic scenes | Generic subjects |
| **Method** | Direct generation | Grid + GPT Vision |
| **Diversity** | Action + illustration styles | Subject variety |
| **Time** | ~6-8 minutes | ~5-10 minutes |
| **Cost** | ~$0.60 | ~$0.50-$1.00 |

---

## Which System to Use?

### Use Actor Training Data Generation when:
- ✅ Training a character/actor LoRA
- ✅ Need identity preservation across scenes
- ✅ Want cinematic action scenes
- ✅ Need both photorealistic and stylized versions
- ✅ Working with human, creature, or character portraits

### Use Style Training Data Generation when:
- ✅ Training an artistic style LoRA
- ✅ Need style consistency across subjects
- ✅ Want maximum subject diversity
- ✅ Working with artistic/stylized source images
- ✅ Need more training images (20 vs 12)

---

## Common Components

Both systems share:
- `src/replicate_service.py` - Replicate API integration
- `src/utils/s3.py` - S3 upload utilities
- Same environment variables (REPLICATE_API_TOKEN, AWS credentials)
- Debug image saving capabilities
- Batch processing with error resilience

---

## Quick Start

### For Actor Training:
```bash
# Set environment variables
export REPLICATE_API_TOKEN=your_token
export AWS_ACCESS_KEY=your_key
export AWS_ACCESS_SECRET=your_secret

# Run example
python examples/generate_actor_training_data_example.py
```

### For Style Training:
```bash
# Same environment variables
python examples/generate_training_data_example.py
```

---

## File Structure

```
actor_maker/
├── src/
│   ├── replicate_service.py              # Shared Replicate API
│   ├── actor_training_data_generator.py  # Actor system ⭐
│   ├── actor_training_prompts.py         # Cinematic prompts
│   ├── training_data_generator.py        # Style system
│   └── training_data_utils/              # Style utilities
│       ├── tile_descriptions.py
│       ├── description_selector.py
│       └── prompt_builder.py
├── examples/
│   ├── generate_actor_training_data_example.py
│   └── generate_training_data_example.py
└── docs/
    ├── ACTOR_TRAINING_DATA_GENERATION.md
    ├── TRAINING_DATA_GENERATION.md
    └── TRAINING_DATA_SYSTEMS_OVERVIEW.md (this file)
```

---

## Next Steps

1. **Choose the appropriate system** for your use case
2. **Configure environment variables** in `.env`
3. **Run the example scripts** to test
4. **Integrate into your training pipeline**
5. **Review debug images** to verify quality

Both systems are production-ready and match the backend implementation!
