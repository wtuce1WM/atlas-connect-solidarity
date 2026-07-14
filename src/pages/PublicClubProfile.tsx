import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Globe, MapPin, Mail, Phone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import NotFound from "@/pages/NotFound";
import ShareButton from "@/components/ShareButton";
import HScroll from "@/components/HScroll";
import { useSEO } from "@/hooks/useSEO";
import hamsaBlueAsset from "@/assets/hamsa-wall-blue.webp.asset.json";
import { useLanguage } from "@/contexts/LanguageContext";
import { withLangPrefix } from "@/lib/localizedPath";

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

const SOCIAL_ICONS: Record<string, JSX.Element> = {
  whatsapp: (
    <svg className="h-6 w-6 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
  ),
  tiktok: (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.73a8.19 8.19 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.16z"/></svg>
  ),
  instagram: (
    <svg className="h-6 w-6 text-[#E4405F]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
  ),
  facebook: (
    <svg className="h-6 w-6 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
  ),
  twitter: (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
  ),
  pinterest: (
    <svg className="h-6 w-6 text-[#E60023]" viewBox="0 0 24 24" fill="currentColor"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z"/></svg>
  ),
  soundcloud: (
    <svg className="h-6 w-6 text-[#FF5500]" viewBox="0 0 24 24" fill="currentColor"><path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.057-.049-.1-.1-.1m-.899.828c-.06 0-.091.037-.104.094L0 14.479l.172 1.282c.013.06.045.094.104.094.057 0 .089-.035.104-.094l.21-1.282-.21-1.332c-.015-.057-.047-.094-.104-.094m1.79-1.065c-.067 0-.12.054-.127.113l-.215 2.378.215 2.283c.007.06.06.111.127.111.064 0 .12-.051.127-.111l.24-2.283-.24-2.378c-.007-.06-.063-.113-.127-.113m.899-.392c-.078 0-.14.063-.148.133l-.2 2.77.2 2.613c.007.07.07.127.148.127.075 0 .14-.057.148-.127l.225-2.613-.225-2.77c-.008-.07-.073-.133-.148-.133m.899-.275c-.09 0-.158.072-.166.152l-.182 3.197.182 2.923c.008.082.076.148.166.148.088 0 .158-.066.164-.148l.207-2.923-.207-3.197c-.006-.08-.076-.152-.164-.152m.901-.14c-.098 0-.18.081-.184.171l-.17 3.477.17 3.143c.004.09.086.164.184.164.096 0 .176-.074.184-.164l.19-3.143-.19-3.477c-.008-.09-.088-.171-.184-.171m.899.016c-.108 0-.195.09-.199.191l-.155 3.601.155 3.338c.004.101.091.185.199.185.109 0 .194-.084.2-.185l.176-3.338-.176-3.601c-.006-.101-.091-.191-.2-.191m.9-.154c-.12 0-.212.1-.217.21l-.142 3.946.142 3.468c.005.112.097.203.217.203.118 0 .212-.09.217-.203l.16-3.468-.16-3.946c-.005-.11-.099-.21-.217-.21m1.263-.61c-.04-.008-.082-.008-.122 0-.132 0-.235.108-.239.228l-.127 4.4.127 3.558c.004.118.107.221.239.221.13 0 .232-.103.238-.221l.143-3.558-.143-4.4c-.006-.12-.108-.228-.238-.228m.893-.028c-.145 0-.263.117-.268.249l-.12 4.579.12 3.611c.005.13.123.242.268.242.143 0 .26-.112.268-.242l.136-3.611-.136-4.579c-.008-.132-.125-.249-.268-.249m.9.183c-.156 0-.283.127-.287.268l-.104 4.546.104 3.611c.004.14.131.261.287.261s.28-.121.287-.261l.117-3.611-.117-4.546c-.007-.141-.131-.268-.287-.268m.899-.181c-.166 0-.3.137-.305.287l-.09 4.776.09 3.611c.005.15.139.275.305.275.164 0 .298-.125.305-.275l.103-3.611-.103-4.776c-.007-.15-.141-.287-.305-.287m2.707-.825c-.16 0-.307.058-.427.152a4.452 4.452 0 00-4.09-2.685c-.355 0-.703.058-1.03.153-.122.042-.155.085-.155.17v8.93c.003.09.074.163.164.171h5.538a2.31 2.31 0 002.325-2.31 2.31 2.31 0 00-2.325-2.581"/></svg>
  ),
  youtube: (
    <svg className="h-6 w-6 text-[#FF0000]" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
  ),
  linkedin: (
    <svg className="h-6 w-6 text-[#0A66C2]" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
  ),
  spotify: (
    <svg className="h-6 w-6 text-[#1DB954]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12C24 5.4 18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/></svg>
  ),
};


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
      if (row?.avatar_url && !/^https?:\/\//i.test(row.avatar_url)) {
        const { data: pub } = supabase.storage
          .from("club-avatars")
          .getPublicUrl(row.avatar_url);
        if (pub?.publicUrl) row.avatar_url = pub.publicUrl;
      }
      if (row?.description) {
        row.description = String(row.description)
          .replace(/<\s*br\s*\/?\s*>/gi, "\n")
          .replace(/<\/p\s*>/gi, "\n\n")
          .replace(/<[^>]+>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
      }
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
    return <div className="min-h-screen" style={{ backgroundColor: "#CDBFA4" }} />;
  }
  if (!profile) return <NotFound />;

  const socials: { kind: keyof PublicProfile; label: string }[] = [
    { kind: "instagram", label: "Instagram" },
    { kind: "youtube", label: "YouTube" },
    { kind: "tiktok", label: "TikTok" },
    { kind: "facebook", label: "Facebook" },
    { kind: "twitter", label: "X" },
    { kind: "linkedin", label: "LinkedIn" },
    { kind: "pinterest", label: "Pinterest" },
    { kind: "spotify", label: "Spotify" },
    { kind: "soundcloud", label: "SoundCloud" },
  ];

  const links: { label: string; url: string }[] = [];
  if (profile.website) {
    links.push({
      label: profile.website.replace(/^https?:\/\//, "").replace(/\/$/, ""),
      url: /^https?:\/\//.test(profile.website) ? profile.website : `https://${profile.website}`,
    });
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center py-6 px-3 sm:py-10" style={{ backgroundColor: "#CDBFA4" }}>
      <div className="relative w-full max-w-[420px] min-h-[85vh] rounded-[2.5rem] bg-gradient-to-b from-neutral-900 via-neutral-900 to-black text-neutral-100 shadow-2xl ring-1 ring-white/10 overflow-hidden">
        {/* Top bar */}
        <div className="absolute top-4 right-4 z-10">
          <ShareButton
            variant="dark"
            title={`${displayName} — One World Morocco`}
            shareUrl={`https://oneworldmorocco.com/u/${profile.nickname}`}
            previewImage={hamsaBlueAsset.url}
          />
        </div>

        {/* Decorative top gradient */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/20 to-transparent pointer-events-none" />

        <div className="relative px-6 pt-12 pb-10 flex flex-col items-center text-center">
          {/* Avatar */}
          <div className="h-28 w-28 rounded-full bg-neutral-800 flex items-center justify-center overflow-hidden mb-4 ring-2 ring-white/20 shadow-xl">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl font-semibold text-neutral-400">
                {(profile.nickname[0] || "?").toUpperCase()}
              </span>
            )}
          </div>

          {/* Identity + QR */}
          <div className="w-full flex items-center justify-center gap-4">
            <div className="flex-1 text-center">
              <h1 className="text-2xl font-bold tracking-tight text-white">{displayName}</h1>
              {displayName !== profile.nickname && (
                <p className="text-sm text-neutral-400 mt-0.5">@{profile.nickname}</p>
              )}
              {(profile.city || profile.country) && (
                <p className="mt-2 inline-flex items-center gap-1 text-sm text-neutral-400">
                  <MapPin className="h-4 w-4" />
                  {[profile.city, profile.country].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
            <div className="shrink-0 rounded-lg bg-white p-2 shadow-md">
              <QRCodeSVG
                value={`https://oneworldmorocco.com/u/${profile.nickname}`}
                size={84}
                level="M"
                includeMargin={false}
              />
            </div>
          </div>

          {/* Description */}
          {profile.description && (
            <p className="mt-3 text-[15px] leading-relaxed text-neutral-300 whitespace-pre-line max-w-md">
              {profile.description}
            </p>
          )}

          {/* Social icons row */}
          <HScroll className="mt-6 w-full flex flex-nowrap items-center justify-start gap-4 overflow-x-auto scrollbar-hide px-6 pb-1">
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
                  className="hover:scale-110 transition-transform shrink-0"
                >
                  {SOCIAL_ICONS[s.kind as string]}
                </a>
              );
            })}
          </HScroll>

          {/* Link buttons */}
          <div className="w-full mt-8 space-y-3">
            <a
              href="#"
              className="block w-full rounded-2xl bg-white/5 hover:bg-white/10 py-4 px-5 text-center font-medium shadow-sm transition-all backdrop-blur-sm border border-white/10 text-neutral-100"
            >
              <span className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4 text-neutral-400" />
                Contactez-moi
              </span>
            </a>
            <a
              href="#"
              className="block w-full rounded-2xl bg-white/5 hover:bg-white/10 py-4 px-5 text-center font-medium shadow-sm transition-all backdrop-blur-sm border border-white/10 text-neutral-100"
            >
              <span className="inline-flex items-center gap-2">
                <Phone className="h-4 w-4 text-neutral-400" />
                Appelez-moi
              </span>
            </a>
            {links.map((l, i) => (
              <a
                key={i}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-2xl bg-white/5 hover:bg-white/10 py-4 px-5 text-center font-medium shadow-sm transition-all backdrop-blur-sm border border-white/10 text-neutral-100"
              >
                <span className="inline-flex items-center gap-2">
                  <Globe className="h-4 w-4 text-neutral-400" />
                  {l.label}
                </span>
              </a>
            ))}
            <a
              href="/club"
              className="block w-full rounded-2xl bg-primary hover:bg-primary/90 py-4 px-5 text-center font-semibold shadow-lg transition-all text-primary-foreground"
            >
              Un compte One World Morocco ?
            </a>
          </div>

          <div className="mt-12 text-xs text-neutral-500">
            <a href="/" className="hover:text-neutral-300"></a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicClubProfile;
