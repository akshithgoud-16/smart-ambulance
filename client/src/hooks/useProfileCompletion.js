import { useState, useEffect } from "react";
import { getProfile } from "../services/profileService";

/**
 * Custom hook to fetch and manage user profile completion status
 */
export const useProfileCompletion = (isLoggedIn) => {
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      setIsProfileComplete(false);
      return;
    }

    const fetchProfileStatus = async () => {
      setIsLoading(true);
      try {
        const user = await getProfile();
        setIsProfileComplete(user.isProfileComplete || false);
      } catch (err) {
        console.error("Error fetching profile:", err);
        setIsProfileComplete(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileStatus();
  }, [isLoggedIn]);

  return { isProfileComplete, isLoading };
};
