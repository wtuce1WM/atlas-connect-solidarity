import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Instagram,
  Facebook,
  Youtube,
  Twitter,
  Linkedin,
  Globe,
  MapPin,
  Music2,
} from "lucide-react";
import NotFound from "@/pages/NotFound";
import ShareButton from "@/components/ShareButton";
import { useSEO } from "@/hooks/useSEO";

type PublicProfile = {
  nickname: string;
  first_name: string | null;
  last_name: string | null;
  city: string | null;
  country: string | null;
  description: string | null;
  avatar_url: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  youtube: string | null;
  twitter: string | null;
  linkedin: string | null;
  pinterest: string | null;
  spotify: string | null;
  soundcloud: string | null;
};

const TikTokIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M19.6 6.3a5.2 5.2 0 0 1-3.2-1.1 5.3 5.3 0 0 1-2-3.2h-3.3v13.3a2.8 2.8 0 1 1-2.8-2.8c.3 0 .6 0 .9.1V9.2a6.1 6.1 0 1 0 5.2 6V8.6a8.6 8.6 0 0 0 5.2 1.7V6.3Z" />
  </svg>
);

const SnapchatIcon = ({ className = "" }: { className?: string }) => null; // not stored
const PinterestIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9.2-.8 1.2-5 1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.5 1.9-2.5.9 0 1.3.7 1.3 1.5 0 .9-.6 2.3-.9 3.6-.3 1.1.5 2 1.6 2 1.9 0 3.4-2 3.4-5 0-2.6-1.9-4.4-4.6-4.4-3.1 0-4.9 2.3-4.9 4.7 0 .9.4 1.9.8 2.5l.1.3-.3 1.2c0 .2-.2.2-.4.1-1.3-.6-2.1-2.5-2.1-4 0-3.3 2.4-6.3 6.9-6.3 3.6 0 6.4 2.6 6.4 6 0 3.6-2.3 6.5-5.4 6.5-1.1 0-2.1-.6-2.4-1.2l-.7 2.5c-.2 1-.9 2.2-1.4 3A10 10 0 1 0 12 2Z" />
  </svg>
);

const buildUrl = (kind: string, val: string): string => {
  const v = val.trim();
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v.replace(/^@/, "");
  switch (kind) {
    case "instagram": return `https://instagram.com/${handle}`;
    case "facebook": return `https://facebook.com/${handle}`;
    case "tiktok": return `https://tiktok.com/@${handle}`;
    case "youtube": return v.startsWith("UC") ? `https://youtube.com/channel/${v}` : `https://youtube.com/@${handle}`;
    case "twitter": return `https://twitter.com/${handle}`;
    case "linkedin": return `https://linkedin.com/in/${handle}`;
    case "pinterest": return `https://pinterest.com/${handle}`;
    case "spotify": return `https://open.spotify.com/user/${handle}`;
    case "soundcloud": return `https://soundcloud.com/${handle}`;
    default: return `https://${v}`;
  }
};

const PublicClubProfile = () => {
  const { pseudo = "" } = useParams();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PublicProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any).rpc("get_public_club_profile", {
        _nickname: pseudo,
      });
      if (cancelled) return;
      const row = Array.isArray(data) ? data[0] : null;
      setProfile(row ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [pseudo]);

  const displayName = profile
    ? (profile.first_name || profile.last_name
        ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
        : profile.nickname)
    : "";

  useSEO({
    title: profile ? `${displayName} (@${profile.nickname}) — One World Morocco` : "Profil",
    description: profile?.description || `Profil public de ${displayName}`,
    ogImage: profile?.avatar_url || undefined,
  });

  if (loading) {
    return <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100" />;
  }
  if (!profile) return <NotFound />;

  const socials: { kind: keyof PublicProfile; label: string; icon: JSX.Element }[] = [
    { kind: "instagram", label: "Instagram", icon: <Instagram className="h-6 w-6" /> },
    { kind: "youtube", label: "YouTube", icon: <Youtube className="h-6 w-6" /> },
    { kind: "tiktok", label: "TikTok", icon: <TikTokIcon className="h-6 w-6" /> },
    { kind: "facebook", label: "Facebook", icon: <Facebook className="h-6 w-6" /> },
    { kind: "twitter", label: "X", icon: <Twitter className="h-6 w-6" /> },
    { kind: "linkedin", label: "LinkedIn", icon: <Linkedin className="h-6 w-6" /> },
    { kind: "pinterest", label: "Pinterest", icon: <PinterestIcon className="h-6 w-6" /> },
    { kind: "spotify", label: "Spotify", icon: <Music2 className="h-6 w-6" /> },
    { kind: "soundcloud", label: "SoundCloud", icon: <Music2 className="h-6 w-6" /> },
  ];

  const links: { label: string; url: string }[] = [];
  if (profile.website) {
    links.push({
      label: profile.website.replace(/^https?:\/\//, "").replace(/\/$/, ""),
      url: /^https?:\/\//.test(profile.website) ? profile.website : `https://${profile.website}`,
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-amber-100 to-amber-50 text-neutral-900">
      {/* Top bar */}
      <div className="absolute top-4 right-4 z-10">
        <ShareButton variant="dark" title={`${displayName} — One World Morocco`} />
      </div>

      <div className="mx-auto max-w-xl px-4 pt-12 pb-16 flex flex-col items-center text-center">
        {/* Avatar */}
        <div className="h-28 w-28 rounded-full bg-white shadow-md flex items-center justify-center overflow-hidden mb-4 ring-1 ring-black/5">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={displayName} className="h-full w-full object-cover" />
          ) : (
            <span className="text-3xl font-semibold text-neutral-400">
              {(profile.nickname[0] || "?").toUpperCase()}
            </span>
          )}
        </div>

        {/* Name */}
        <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
        {displayName !== profile.nickname && (
          <p className="text-sm text-neutral-500 mt-0.5">@{profile.nickname}</p>
        )}

        {/* Location */}
        {(profile.city || profile.country) && (
          <p className="mt-2 inline-flex items-center gap-1 text-sm text-neutral-600">
            <MapPin className="h-4 w-4" />
            {[profile.city, profile.country].filter(Boolean).join(", ")}
          </p>
        )}

        {/* Description */}
        {profile.description && (
          <p className="mt-3 text-[15px] leading-relaxed text-neutral-700 whitespace-pre-line max-w-md">
            {profile.description}
          </p>
        )}

        {/* Social icons row */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
          {socials.map((s) => {
            const v = profile[s.kind] as string | null;
            if (!v) return null;
            return (
              <a
                key={s.kind}
                href={buildUrl(s.kind as string, v)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="text-neutral-800 hover:text-neutral-950 hover:scale-110 transition-transform"
              >
                {s.icon}
              </a>
            );
          })}
        </div>

        {/* Link buttons */}
        <div className="w-full mt-8 space-y-3">
          {links.map((l, i) => (
            <a
              key={i}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-2xl bg-white/80 hover:bg-white py-4 px-5 text-center font-medium shadow-sm hover:shadow transition-all backdrop-blur-sm border border-black/5"
            >
              <span className="inline-flex items-center gap-2">
                <Globe className="h-4 w-4 text-neutral-500" />
                {l.label}
              </span>
            </a>
          ))}
        </div>

        <div className="mt-12 text-xs text-neutral-500">
          <a href="/" className="hover:text-neutral-700">oneworldmorocco.com</a>
        </div>
      </div>
    </div>
  );
};

export default PublicClubProfile;
