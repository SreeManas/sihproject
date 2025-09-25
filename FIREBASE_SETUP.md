# Firebase Setup Guide for INCOIS SAMACHAR

## Prerequisites

1. Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Enable Firebase Authentication and Firestore Database
3. Get your Firebase configuration values

## Configuration Steps

### 1. Update Environment Variables

Copy the values from your Firebase project settings to your `.env.local` file:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 2. Set Up Firestore Security Rules

1. Go to Firebase Console → Firestore Database → Rules
2. Copy the contents of `firestore.rules` file into the rules editor
3. Publish the rules

### 3. Enable Authentication Methods

1. Go to Firebase Console → Authentication → Sign-in method
2. Enable Email/Password and/or Google Sign-in
3. Configure authorized domains (localhost for development, your production domain)

### 4. Test the Setup

After completing the setup, test the feedback submission:

1. Log in to the application
2. Navigate to the Feedback page
3. Fill out the feedback form and submit
4. Check the browser console for debug messages
5. Verify the feedback appears in Firestore Database

## Troubleshooting Feedback Submission Issues

### Common Issues and Solutions:

1. **Permission Denied Error**
   - Ensure Firestore security rules are properly set up
   - Check that the user is authenticated
   - Verify the Firebase project ID in your configuration

2. **Authentication Issues**
   - Check that Firebase Authentication is enabled
   - Verify the API key has the correct permissions
   - Ensure the user is properly logged in

3. **Network/Connection Issues**
   - Check your internet connection
   - Verify Firebase project is in the correct region
   - Ensure CORS is properly configured

### Debug Information

The enhanced FeedbackForm now includes detailed logging. Check the browser console for:

- Authentication state information
- Firebase connection status
- Submission attempt details
- Specific error messages

## Testing Feedback Submission

To test if feedback submission is working:

1. Open browser developer tools (F12)
2. Go to the Console tab
3. Log in to the application
4. Navigate to /feedback
5. Fill out the form and submit
6. Check the console for:
   - "FeedbackForm - Auth state:" - Should show user information
   - "FeedbackForm - Firebase db instance:" - Should show the database instance
   - "Submitting feedback for user:" - Should show user details
   - "Feedback submitted successfully with ID:" - Should show the document ID

If you see any error messages, they will provide specific information about what went wrong.
