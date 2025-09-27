# Test Plan: Edit Event Feature

## Features Implemented

### Backend (EventService):
✅ **updateEvent method** - Updates event with new data and handles slug regeneration
- Validates input data
- Updates slug if event name changes
- Ensures slug uniqueness  
- Updates timestamp
- Handles errors gracefully

### Frontend Components:
✅ **EditEvent component** (`src/pages/admin/EditEvent.tsx`)
- Pre-populates form with existing event data
- Validates form inputs
- Shows change detection (only enables save when changes are made)
- Displays loading and error states
- Shows URL preview with slug changes
- Handles successful updates with feedback

✅ **EventManagement integration**
- Added "Edit" button to each event card
- Green styling to differentiate from other actions
- Links to `/admin/events/{eventId}/edit`

✅ **App routing**
- Added route for `/admin/events/:eventId/edit`
- Protected with admin role requirement
- Uses same protection as other admin routes

## How to Test

### Prerequisites:
1. Development server running (`npm run dev`)
2. Admin user account
3. At least one existing event in the system

### Test Steps:

1. **Navigate to Event Management**
   - Go to `/admin/events` or click "Event Management" in admin tools
   - Verify you can see existing events
   - Look for green "Edit" buttons on event cards

2. **Access Edit Page**
   - Click the "Edit" button on any event
   - Should navigate to `/admin/events/{eventId}/edit`
   - Form should load with existing event data pre-filled

3. **Test Form Functionality**
   - Verify all fields are populated with current data
   - Try changing the event name -> slug preview should update
   - Make changes to various fields
   - "Save Changes" button should only be enabled when changes are detected

4. **Test Validation**
   - Clear required fields and try to save
   - Should show appropriate error messages
   - Invalid URLs should be caught

5. **Test Successful Update**
   - Make valid changes to event
   - Click "Save Changes"
   - Should show success message
   - Should redirect back to event management page
   - Changes should be reflected in the event list

6. **Test Error Handling**
   - Try editing with invalid data
   - Network errors should be handled gracefully
   - User should see meaningful error messages

## API Endpoints Used

- `EventService.getEventById(eventId)` - Load event data for editing
- `EventService.updateEvent(eventId, data)` - Save event changes  
- `EventService.ensureUniqueSlug(slug)` - Ensure URL slug uniqueness

## URLs to Test

- `/admin/events` - Event management page with Edit buttons
- `/admin/events/{eventId}/edit` - Edit specific event
- Navigation between pages should work smoothly

## Expected Behavior

✅ Form pre-populates with existing event data
✅ Real-time slug preview when name changes  
✅ Save button only enabled when changes detected
✅ Validation prevents invalid submissions
✅ Success feedback and automatic redirect
✅ Error handling with user-friendly messages
✅ Maintains admin security (requires admin role)

## Integration Notes

- Edit functionality integrates seamlessly with existing event management
- Maintains consistency with Add Event form styling and validation
- Uses same EventService methods for data consistency
- Follows existing routing and protection patterns