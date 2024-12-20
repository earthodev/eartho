"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm, ProfileFormValues } from "./profile-form";
import UserService from '@/service/user.service';
import { toast } from '@/components/ui/use-toast';
import ProfileFormSkeleton from './profile-loader';
import { useSession } from 'next-auth/react';

const ProfileSection = () => {
    const userSerivce = UserService();
  const [profile, setProfile] = useState<ProfileFormValues | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const { data: session, update } = useSession();

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true)
      const data = await userSerivce.getUserProfile(session?.accessToken!);
      setProfile(data);
      setLoading(false)
    };

    fetchProfileData();
  }, []);

  const handleUpdateProfile = async (updatedData: ProfileFormValues) => {
    try {
      const updatedProfile = await userSerivce.updateUserProfile(session?.accessToken!, updatedData);
      setProfile(updatedProfile);
      update()
      toast({
      title: "Your profile has been updated successfully",
      description:"It may take a few minutes for the changes to appear in other services",
    });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Error",
        description:"",
      });
      console.log(e);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden">
      {!loading ? (
            <ProfileForm data={profile} onUpdate={handleUpdateProfile} />
          ) : (
            <ProfileFormSkeleton  />
          )}
    </div>
  );
};

export default ProfileSection;
