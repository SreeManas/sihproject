import React, { useState } from 'react';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useT } from '../hooks/useT.js';

export default function FeedbackForm() {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [category, setCategory] = useState('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { user } = getAuth();

  // Translation hooks
  const tGeneralFeedback = useT("General Feedback");
  const tUsability = useT("Usability");
  const tAlertSystem = useT("Alert System");
  const tReportSubmission = useT("Report Submission");
  const tEmergencyContacts = useT("Emergency Contacts");
  const tTechnicalIssues = useT("Technical Issues");
  const tPleaseSelectRating = useT("Please select a rating");
  const tPleaseLogin = useT("Please log in to submit feedback");
  const tThankYouFeedback = useT("Thank you for your feedback!");
  const tFeedbackSubmitted = useT("Feedback Submitted!");
  const tThankYouHelpImprove = useT("Thank you for helping us improve INCOIS SAMACHAR.");
  const tShareFeedback = useT("Share Your Feedback");
  const tOverallRating = useT("Overall Rating *");
  const tFeedbackCategory = useT("Feedback Category");
  const tCommentsOptional = useT("Comments (Optional)");
  const tCommentsPlaceholder = useT("Tell us more about your experience, suggestions for improvement, or any issues you encountered...");
  const tCharacters = useT("characters");
  const tSubmitting = useT("Submitting...");
  const tSubmitFeedback = useT("Submit Feedback");
  const tErrorSubmitting = useT("Error submitting feedback. Please try again.");
  const tPrivacyNote = useT("Privacy Note:");
  const tPrivacyText = useT("Your feedback helps us improve INCOIS SAMACHAR. We collect your email address for response purposes only and will never share your personal information with third parties.");
  const tPleaseLoginSubmit = useT("Please log in to submit feedback");
  const tSubmittingAs = useT("Submitting as");

  const categories = [
    { value: 'general', label: tGeneralFeedback },
    { value: 'usability', label: tUsability },
    { value: 'alerts', label: tAlertSystem },
    { value: 'reports', label: tReportSubmission },
    { value: 'emergency', label: tEmergencyContacts },
    { value: 'technical', label: tTechnicalIssues }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      setSubmitStatus(tPleaseSelectRating);
      return;
    }

    if (!user) {
      setSubmitStatus(tPleaseLogin);
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('');

    try {
      const db = getFirestore();
      await addDoc(collection(db, 'feedback'), {
        userId: user.uid,
        userEmail: user.email,
        rating: rating,
        comment: comment.trim(),
        category: category,
        createdAt: serverTimestamp(),
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });

      setIsSubmitted(true);
      setSubmitStatus(tThankYouFeedback);
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setRating(0);
        setHoveredRating(0);
        setComment('');
        setCategory('general');
        setIsSubmitted(false);
        setSubmitStatus('');
      }, 3000);

    } catch (error) {
      console.error('Error submitting feedback:', error);
      setSubmitStatus(tErrorSubmitting);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingEmoji = (rating) => {
    const emojis = ['😞', '😐', '🙂', '😊', '😍'];
    return emojis[rating - 1] || '';
  };

  const getRatingLabel = (rating) => {
    const labels = ['Very Poor', 'Poor', 'Average', 'Good', 'Excellent'];
    return labels[rating - 1] || '';
  };

  if (isSubmitted) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{tFeedbackSubmitted}</h3>
          <p className="text-gray-600">{tThankYouHelpImprove}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        {tShareFeedback}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Rating Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {tOverallRating}
          </label>
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className={`p-2 rounded-full transition-all duration-200 ${
                  star <= (hoveredRating || rating)
                    ? 'text-yellow-400 bg-yellow-50'
                    : 'text-gray-300 hover:text-yellow-300 hover:bg-yellow-50'
                }`}
                disabled={isSubmitting}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
            ))}
          </div>
          
          {rating > 0 && (
            <div className="mt-2 flex items-center space-x-2">
              <span className="text-2xl">{getRatingEmoji(rating)}</span>
              <span className="text-sm font-medium text-gray-700">
                {getRatingLabel(rating)} ({rating}/5)
              </span>
            </div>
          )}
        </div>

        {/* Category Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {tFeedbackCategory}
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="select w-full"
            disabled={isSubmitting}
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Comment Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {tCommentsOptional}
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={tCommentsPlaceholder}
            className="input w-full"
            rows={4}
            maxLength={1000}
            disabled={isSubmitting}
          />
          <div className="mt-1 text-xs text-gray-500 text-right">
            {comment.length}/1000 {tCharacters}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {user ? `${tSubmittingAs} ${user.email}` : tPleaseLoginSubmit}
          </div>
          
          <button
            type="submit"
            disabled={isSubmitting || rating === 0 || !user}
            className="btn btn-primary btn-md flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {tSubmitting}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                {tSubmitFeedback}
              </>
            )}
          </button>
        </div>

        {submitStatus && (
          <div className={`mt-3 p-3 rounded-md text-sm ${
            submitStatus.includes('Error') || submitStatus.includes('Please')
              ? 'bg-red-50 border border-red-200 text-red-800' 
              : 'bg-green-50 border border-green-200 text-green-800'
          }`}>
            {submitStatus}
          </div>
        )}

        {/* Privacy Note */}
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <div className="flex items-start space-x-2">
            <svg className="w-4 h-4 text-gray-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs text-gray-600">
              <p className="font-medium mb-1">{tPrivacyNote}</p>
              <p>{tPrivacyText}</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
