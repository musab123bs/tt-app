"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const defaultAvatar = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "Player")}&background=0B82FF&color=fff&size=200`;

type ProfileData = {
  id?: string;
  fullName: string | null;
  bio: string | null;
  country: string | null;
  city: string | null;
  clubName: string | null;
  playingHand: "RIGHT_HANDED" | "LEFT_HANDED" | null;
  playingStyle: "OFFENSIVE" | "DEFENSIVE" | "ALL_ROUND" | null;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "PROFESSIONAL" | null;
  dateOfBirth: string | null;
  profileImage: string | null;
  publicId: string | null;
  isPublic?: boolean | null;
};

type ProfileFormProps = {
  profile: ProfileData | null;
  userName: string;
  userImage?: string | null;
};

export function ProfileForm({ profile, userName, userImage }: ProfileFormProps) {
  const [formData, setFormData] = useState({
    fullName: profile?.fullName ?? userName,
    bio: profile?.bio ?? "",
    country: profile?.country ?? "",
    city: profile?.city ?? "",
    clubName: profile?.clubName ?? "",
    playingHand: profile?.playingHand ?? "RIGHT_HANDED",
    playingStyle: profile?.playingStyle ?? "ALL_ROUND",
    level: profile?.level ?? "BEGINNER",
    dateOfBirth: profile?.dateOfBirth ?? "",
    profileImage: profile?.profileImage ?? userImage ?? null,
    publicId: profile?.publicId ?? null,
    isPublic: profile?.isPublic ?? true,
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const activeAvatar = formData.profileImage || userImage || defaultAvatar(userName);

  const handleField = (field: keyof typeof formData, value: string | null) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Profile image must be 5MB or smaller.");
      return;
    }

    setError("");
    setMessage("");
    setIsUploading(true);

    const formPayload = new FormData();
    formPayload.append("file", file);

    try {
      const response = await fetch("/api/profile/upload", {
        method: "POST",
        body: formPayload,
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error ?? `Image upload failed (${response.status}).`);
      }

      setFormData((current) => ({
        ...current,
        profileImage: data.profileImage ?? current.profileImage,
        publicId: data.publicId ?? current.publicId,
      }));
      setMessage("Profile image uploaded successfully.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Image upload failed.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName,
          bio: formData.bio,
          country: formData.country,
          city: formData.city,
          clubName: formData.clubName,
          playingHand: formData.playingHand,
          playingStyle: formData.playingStyle,
          level: formData.level,
          dateOfBirth: formData.dateOfBirth || null,
          profileImage: formData.profileImage,
          publicId: formData.publicId,
          isPublic: formData.isPublic,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to save profile.");
      }

      setMessage("Profile saved successfully.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <img
            src={activeAvatar}
            alt={formData.fullName || userName}
            className="h-24 w-24 rounded-full border border-slate-200 object-cover"
          />
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Profile image</p>
              <p className="text-sm text-slate-500">Use a clear headshot or club photo.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                {isUploading ? "Uploading..." : "Upload image"}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleUpload} />
              </label>
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  setError("");
                  setMessage("");
                  try {
                    const response = await fetch("/api/profile/upload", { method: "DELETE" });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.error ?? "Image removal failed.");
                    setFormData((current) => ({ ...current, profileImage: null, publicId: null }));
                    setMessage("Profile image removed.");
                  } catch (removeError) {
                    setError(removeError instanceof Error ? removeError.message : "Image removal failed.");
                  }
                }}
              >
                Remove image
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="grid gap-6 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Full name</span>
            <input
              value={formData.fullName}
              onChange={(event) => handleField("fullName", event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none ring-0 transition focus:border-[#0B82FF]"
              placeholder="Alex Morgan"
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Bio</span>
            <textarea
              rows={4}
              value={formData.bio}
              onChange={(event) => handleField("bio", event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#0B82FF]"
              placeholder="Tell coaches and teammates a little about your playing style."
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Country</span>
            <input
              value={formData.country}
              onChange={(event) => handleField("country", event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#0B82FF]"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">City</span>
            <input
              value={formData.city}
              onChange={(event) => handleField("city", event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#0B82FF]"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Club name</span>
            <input
              value={formData.clubName}
              onChange={(event) => handleField("clubName", event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#0B82FF]"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Date of birth</span>
            <input
              type="date"
              value={formData.dateOfBirth ?? ""}
              onChange={(event) => handleField("dateOfBirth", event.target.value || null)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#0B82FF]"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Playing hand</span>
            <select
              value={formData.playingHand ?? "RIGHT_HANDED"}
              onChange={(event) => handleField("playingHand", event.target.value as "RIGHT_HANDED" | "LEFT_HANDED")}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#0B82FF]"
            >
              <option value="RIGHT_HANDED">Right-handed</option>
              <option value="LEFT_HANDED">Left-handed</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Playing style</span>
            <select
              value={formData.playingStyle ?? "ALL_ROUND"}
              onChange={(event) => handleField("playingStyle", event.target.value as "OFFENSIVE" | "DEFENSIVE" | "ALL_ROUND")}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#0B82FF]"
            >
              <option value="OFFENSIVE">Offensive</option>
              <option value="DEFENSIVE">Defensive</option>
              <option value="ALL_ROUND">All-round</option>
            </select>
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Player level</span>
            <select
              value={formData.level ?? "BEGINNER"}
              onChange={(event) => handleField("level", event.target.value as "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "PROFESSIONAL")}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#0B82FF]"
            >
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
              <option value="PROFESSIONAL">Professional</option>
            </select>
          </label>
        </div>

        <label className="mt-6 flex items-start gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={formData.isPublic}
            onChange={(event) => setFormData((current) => ({ ...current, isPublic: event.target.checked }))}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0B82FF] focus:ring-[#0B82FF]"
          />
          <span>
            <span className="block font-medium">Public player profile</span>
            <span className="mt-1 block text-slate-500">Allow other players to view your profile information.</span>
          </span>
        </label>

        {(error || message) && (
          <div className={`mt-5 rounded-xl border px-3 py-2 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {error || message}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end">
          <Button type="submit" disabled={isSaving || isUploading}>
            {isSaving ? "Saving profile..." : "Save profile"}
          </Button>
        </div>
      </Card>
    </form>
  );
}
