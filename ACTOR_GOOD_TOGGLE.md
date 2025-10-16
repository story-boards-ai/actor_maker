# Actor "Good" Toggle Feature

## Overview
Added ability to mark actors as "good" with a single click, displaying a green checkmark indicator in the actor library.

## Features

### ✅ **Visual Indicator**
- **Green checkmark (✓)**: Actor marked as good
- **Empty circle (○)**: Actor not marked as good
- **Circular button**: Top-right corner of actor card overlay
- **Color-coded**: Green background when marked as good

### 🎯 **Toggle Functionality**
- **One-click toggle**: Click the button to mark/unmark
- **Persistent**: Saved to `actorsData.json`
- **Real-time update**: UI updates immediately
- **No page reload**: Smooth UX with optimistic updates

## Implementation

### Backend

#### API Endpoint
**POST `/api/actors/:actorId/toggle-good`**

**Response**:
```json
{
  "success": true,
  "actor_id": 123,
  "good": true
}
```

**Functionality**:
- Reads `actorsData.json`
- Toggles the `good` boolean flag
- Saves back to file
- Returns new status

#### Data Storage
**File**: `data/actorsData.json`

**Schema Addition**:
```json
{
  "id": 0,
  "name": "0000_european_16_male",
  "good": true,
  ...
}
```

### Frontend

#### ActorCard Component
**File**: `/ui/src/components/ActorCard.tsx`

**State Management**:
```typescript
const [isGood, setIsGood] = useState(actor.good || false);
const [toggling, setToggling] = useState(false);
```

**Toggle Function**:
```typescript
const toggleGood = async (e: React.MouseEvent) => {
  e.stopPropagation();
  if (toggling) return;

  setToggling(true);
  try {
    const response = await fetch(`/api/actors/${actor.id}/toggle-good`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) throw new Error('Failed to toggle good status');

    const data = await response.json();
    setIsGood(data.good);
  } catch (error) {
    console.error('Error toggling good status:', error);
  } finally {
    setToggling(false);
  }
};
```

**UI Element**:
```tsx
<button
  onClick={toggleGood}
  disabled={toggling}
  style={{
    background: isGood ? '#10b981' : 'rgba(255,255,255,0.2)',
    border: 'none',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    cursor: toggling ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    transition: 'all 0.2s ease',
    opacity: toggling ? 0.5 : 1
  }}
  title={isGood ? 'Mark as not good' : 'Mark as good'}
>
  {isGood ? '✓' : '○'}
</button>
```

#### Type Definition
**File**: `/ui/src/types.ts`

```typescript
export interface Actor {
  id: number;
  name: string;
  good?: boolean;  // NEW
  // ... other fields
}
```

## User Experience

### Visual States

**Not Marked (Default)**:
- Empty circle (○)
- Semi-transparent white background
- Hover shows "Mark as good"

**Marked as Good**:
- Green checkmark (✓)
- Solid green background (#10b981)
- Hover shows "Mark as not good"

**During Toggle**:
- Reduced opacity (50%)
- Cursor shows "not-allowed"
- Prevents double-clicks

### Location
- **Position**: Top-right corner of actor card image overlay
- **Always visible**: Shows on hover over actor card
- **Non-intrusive**: Doesn't block actor image or info

## Use Cases

### Quality Control
- ✅ Mark actors with good training data
- ✅ Identify actors ready for production
- ✅ Filter out problematic actors

### Workflow Management
- ✅ Track which actors have been reviewed
- ✅ Prioritize actors for further work
- ✅ Quick visual scan of actor quality

### Team Collaboration
- ✅ Share quality assessments
- ✅ Consistent actor selection
- ✅ Quality assurance tracking

## Technical Details

### File Structure
```
/data/actorsData.json           # Actor data with good flags
/ui/src/components/ActorCard.tsx  # UI component
/ui/config/routes/actors-api.ts   # API endpoint
/ui/src/types.ts                  # Type definitions
```

### API Flow
1. User clicks toggle button
2. Frontend sends POST to `/api/actors/:id/toggle-good`
3. Backend reads `actorsData.json`
4. Backend toggles `good` flag
5. Backend saves file
6. Backend returns new status
7. Frontend updates UI

### Error Handling
- Network errors: Logged to console, UI reverts
- File errors: 500 response with error message
- Not found: 404 response if actor doesn't exist
- Optimistic UI: Shows change immediately, reverts on error

## Future Enhancements
- [ ] Filter actors by "good" status
- [ ] Bulk mark/unmark operations
- [ ] Export list of good actors
- [ ] Sort by good status
- [ ] Show count of good actors
- [ ] Add "excellent" or rating system
- [ ] Add notes/comments per actor
