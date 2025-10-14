import { useState, useEffect } from 'react';
import type { Style } from '../../types';

type AssessmentRating = 'excellent' | 'good' | 'acceptable' | 'poor' | 'failed' | null;

interface AssessmentData {
  styleId: string;
  bestRating: AssessmentRating;
  hasAssessments: boolean;
}

/**
 * Hook to fetch best assessment ratings for multiple styles
 */
export function useStyleAssessments(styles: Style[]) {
  const [assessments, setAssessments] = useState<Record<string, AssessmentRating>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAssessments() {
      if (styles.length === 0) {
        setLoading(false);
        return;
      }

      try {
        // Fetch assessments for all styles
        const results = await Promise.all(
          styles.map(async (style) => {
            try {
              const response = await fetch(`/api/assessments/best?styleId=${style.id}`);
              if (!response.ok) {
                console.warn(`Failed to fetch assessment for style ${style.id}`);
                return { styleId: style.id, bestRating: null };
              }
              const data: AssessmentData = await response.json();
              return { styleId: data.styleId, bestRating: data.bestRating };
            } catch (error) {
              console.warn(`Error fetching assessment for style ${style.id}:`, error);
              return { styleId: style.id, bestRating: null };
            }
          })
        );

        // Convert to record for easy lookup
        const assessmentMap = results.reduce((acc, result) => {
          acc[result.styleId] = result.bestRating;
          return acc;
        }, {} as Record<string, AssessmentRating>);

        setAssessments(assessmentMap);
      } catch (error) {
        console.error('Error fetching style assessments:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAssessments();
  }, [styles.length]); // Only re-fetch when number of styles changes

  return { assessments, loading };
}
